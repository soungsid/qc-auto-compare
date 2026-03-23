"""
Base spider class for all Quebec dealer spiders.

Provides:
  - Dealer registry loading and filtering
  - Playwright-based JS rendering with infinite-scroll support
  - CAPTCHA / block detection and graceful skip
  - Configurable delay + autothrottle
  - JSON-LD fallback extraction (centralised — no more duplication per spider)
  - Per-dealer crawl report printed on spider close
  - Common item normalization helpers
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterator, Optional

import scrapy
from scrapy.http import Response
try:
    from scrapy_playwright.page import PageCoroutine
except ImportError:
    PageCoroutine = None  # newer scrapy-playwright removed PageCoroutine

logger = logging.getLogger(__name__)

REGISTRY_PATH = Path(__file__).parent.parent / "dealers_registry.json"

# Signals that the page is blocked / behind a CAPTCHA
BLOCK_SIGNALS = ["captcha", "cloudflare", "i am not a robot", "are you a robot", "prove you are human", "access denied", "please verify", "403 forbidden"]

# JS snippet that scrolls to the bottom and waits for new content to load.
# Executed twice to handle lazy-loading that requires multiple scroll events.
_SCROLL_JS = "window.scrollTo(0, document.body.scrollHeight)"


def load_registry(
    brand_filter: Optional[str] = None,
    slug_filter: Optional[str] = None,
) -> list[dict]:
    """
    Load the dealers registry JSON and optionally filter by brand or slug.

    Args:
        brand_filter: Only include dealers whose brand matches (case-insensitive).
        slug_filter:  Only include the dealer with this exact slug.

    Returns:
        List of active dealer dicts.
    """
    with open(REGISTRY_PATH, encoding="utf-8") as f:
        dealers = json.load(f)

    active = [d for d in dealers if d.get("active", True)]

    if brand_filter:
        active = [d for d in active if d["brand"].lower() == brand_filter.lower()]
    if slug_filter:
        active = [d for d in active if d["slug"] == slug_filter]

    return active


class BaseDealerSpider(scrapy.Spider):
    """
    Abstract base spider for all QC Auto Compare dealer spiders.

    Subclasses must define:
      - name            : str
      - brand           : str   (used to filter the registry)
      - parse_listing   : method that extracts vehicle items from a listing page

    Subclasses may optionally define:
      - infinite_scroll : bool  (default False) — enable Playwright scroll coroutines
      - scroll_pauses   : int   (default 2)     — number of scroll-and-wait cycles
      - scroll_wait_ms  : int   (default 2000)  — ms to wait after each scroll
    """

    name = "base_dealer"
    brand = ""

    # ── Infinite scroll config — override in subclasses if needed ───────────
    infinite_scroll: bool = False
    scroll_pauses: int = 2
    scroll_wait_ms: int = 2000

    custom_settings: dict = {
        "DOWNLOAD_HANDLERS": {
            "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
            "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
        },
        "PLAYWRIGHT_LAUNCH_OPTIONS": {
            "headless": True,
            "args": ["--no-sandbox", "--disable-dev-shm-usage"],
        },
        "PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT": 30_000,
        "TWISTED_REACTOR": "twisted.internet.asyncioreactor.AsyncioSelectorReactor",
        "DOWNLOAD_DELAY": 2,
        "RANDOMIZE_DOWNLOAD_DELAY": True,
        "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_TARGET_CONCURRENCY": 2.0,
    }

    # ── Internal crawl-report state ──────────────────────────────────────────
    def __init__(self, dealer_slug: Optional[str] = None, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.dealer_slug = dealer_slug
        self.dealers = load_registry(
            brand_filter=self.brand,
            slug_filter=self.dealer_slug,
        )
        # Per-dealer counters — populated by build_item() and is_blocked()
        self._items_per_dealer: dict[str, int] = {d["slug"]: 0 for d in self.dealers}
        self._blocked_dealers: set[str] = set()
        self._errors_per_dealer: dict[str, list[str]] = {d["slug"]: [] for d in self.dealers}
        self._started_at = datetime.now(timezone.utc)

        logger.info("[%s] %d concessionnaire(s) chargés depuis le registre", self.name, len(self.dealers))

    # ── Request generation ───────────────────────────────────────────────────

    def _build_playwright_coroutines(self) -> list[PageCoroutine]:
        """
        Return a list of Playwright coroutines for infinite-scroll pages.

        Scrolls to the bottom `scroll_pauses` times, waiting `scroll_wait_ms`
        between each scroll to allow lazy-loaded content to appear.
        """
        coroutines: list[PageCoroutine] = []
        for _ in range(self.scroll_pauses):
            coroutines.append(PageCoroutine("evaluate", _SCROLL_JS))
            coroutines.append(PageCoroutine("wait_for_timeout", self.scroll_wait_ms))
        return coroutines

    def start_requests(self) -> Iterator[scrapy.Request]:
        """Generate one Playwright request per dealer inventory URL."""
        for dealer in self.dealers:
            url = dealer.get("inventory_url")
            if not url:
                logger.warning(
                    "[%s] Pas d'inventory_url pour %s — ignoré",
                    self.name, dealer["slug"],
                )
                continue

            logger.info("[%s] Démarrage crawl %s → %s", self.name, dealer["name"], url)

            meta: dict[str, Any] = {
                "playwright": True,
                "playwright_include_page": False,
                "dealer": dealer,
                "handle_httpstatus_list": [403, 404, 429, 503],
            }

            # Attach scroll coroutines only when the subclass opts in
            if self.infinite_scroll:
                meta["playwright_include_page"] = False  # coroutines don't need the page object
                meta["playwright_page_coroutines"] = self._build_playwright_coroutines()
                logger.debug(
                    "[%s] Scroll infini activé pour %s (%d pauses × %dms)",
                    self.name, dealer["slug"], self.scroll_pauses, self.scroll_wait_ms,
                )

            yield scrapy.Request(
                url=url,
                callback=self.parse_listing,
                meta=meta,
                errback=self.handle_error,
            )

    # ── Abstract method ──────────────────────────────────────────────────────

    def parse_listing(self, response: Response) -> Iterator[Any]:
        """
        Override in subclasses to extract vehicle items from a listing page.

        Must yield vehicle item dicts and/or follow-up scrapy.Requests.
        """
        raise NotImplementedError("Les sous-classes doivent implémenter parse_listing()")

    # ── Error handling ───────────────────────────────────────────────────────

    def handle_error(self, failure: Any) -> None:
        """Log request failures and record them in the crawl report."""
        url = failure.request.url
        dealer: dict = failure.request.meta.get("dealer", {})
        slug = dealer.get("slug", "inconnu")
        msg = str(failure.value)

        logger.error("[%s] Échec requête %s — %s", self.name, url, msg)
        if slug in self._errors_per_dealer:
            self._errors_per_dealer[slug].append(f"{url}: {msg}")

    def is_blocked(self, response: Response) -> bool:
        """Return True if the page looks like a block/CAPTCHA page."""
        if response.status in (403, 429):
            dealer: dict = response.meta.get("dealer", {})
            self._blocked_dealers.add(dealer.get("slug", ""))
            return True
        body_lower = response.text.lower()
        if any(signal in body_lower for signal in BLOCK_SIGNALS):
            dealer = response.meta.get("dealer", {})
            self._blocked_dealers.add(dealer.get("slug", ""))
            return True
        return False

    # ── Crawl report ─────────────────────────────────────────────────────────

    def closed(self, reason: str) -> None:
        """Print a per-dealer summary when the spider finishes."""
        duration = (datetime.now(timezone.utc) - self._started_at).total_seconds()
        total_items = sum(self._items_per_dealer.values())

        lines = [
            "",
            "=" * 60,
            f"  RAPPORT DE CRAWL — {self.name}",
            f"  Terminé : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
            f"  Durée   : {duration:.0f}s   |   Total véhicules : {total_items}",
            "=" * 60,
        ]

        for dealer in self.dealers:
            slug = dealer["slug"]
            count = self._items_per_dealer.get(slug, 0)
            blocked = slug in self._blocked_dealers
            errors = self._errors_per_dealer.get(slug, [])

            if blocked:
                status = "🔴 BLOQUÉ"
            elif count == 0:
                status = "🟡 VIDE (0 véhicule — sélecteurs à vérifier)"
            else:
                status = f"✅ {count} véhicule(s)"

            lines.append(f"  {dealer['name']:<40} {status}")
            for err in errors[:2]:  # max 2 erreurs affichées par dealer
                lines.append(f"    ⚠ {err[:80]}")

        lines.append("=" * 60)
        logger.info("\n".join(lines))

    # ── JSON-LD fallback (centralisé) ────────────────────────────────────────

    def json_ld_fallback(
        self,
        response: Response,
        dealer: dict,
        make: str,
        parse_model_fn: Callable[[str], Optional[str]],
    ) -> Iterator[dict]:
        """
        Tente d'extraire les véhicules depuis les blocs JSON-LD de la page.

        Cette méthode est centralisée ici pour éviter la duplication dans chaque
        spider. Chaque spider l'appelle en passant sa propre fonction parse_model.

        Args:
            response:       La réponse Scrapy.
            dealer:         Le dict concessionnaire du registre.
            make:           La marque (ex: "Toyota").
            parse_model_fn: Fonction du spider qui extrait le modèle depuis un titre.

        Yields:
            Items véhicule prêts pour le pipeline.
        """
        found = 0
        for raw_script in response.css('script[type="application/ld+json"]::text').getall():
            try:
                data = json.loads(raw_script)
            except (json.JSONDecodeError, TypeError):
                continue

            # Normalise : liste, dict simple, ou ItemList avec itemListElement
            candidates: list[Any] = []
            if isinstance(data, list):
                candidates = data
            elif isinstance(data, dict):
                candidates = data.get("itemListElement", [data])

            for entry in candidates:
                # Certains ItemList wrappent chaque élément dans {"item": {...}}
                item_data = entry.get("item", entry) if isinstance(entry, dict) else {}
                if not isinstance(item_data, dict):
                    continue
                if item_data.get("@type") not in ("Car", "Vehicle"):
                    continue

                name = item_data.get("name", "")
                year_raw = self.extract_year(name) or item_data.get("modelDate")
                model = parse_model_fn(name)

                if not year_raw or not model:
                    continue

                offers = item_data.get("offers", {})
                if isinstance(offers, list):
                    offers = offers[0] if offers else {}

                item = self.build_item(
                    dealer=dealer,
                    make=make,
                    model=model,
                    year=int(year_raw),
                    trim=item_data.get("vehicleConfiguration"),
                    vin=item_data.get("vehicleIdentificationNumber"),
                    msrp=self.clean_price(str(offers.get("price", ""))),
                    drivetrain=item_data.get("driveWheelConfiguration"),
                    color_ext=item_data.get("color"),
                    listing_url=item_data.get("url", response.url),
                )
                found += 1
                yield item

        if found:
            logger.info(
                "[%s] %s — %d véhicule(s) extraits via JSON-LD fallback",
                self.name, dealer["name"], found,
            )
        else:
            logger.warning(
                "[%s] %s — JSON-LD fallback : aucun véhicule trouvé non plus",
                self.name, dealer["name"],
            )

    # ── Normalization helpers ────────────────────────────────────────────────

    @staticmethod
    def clean_price(raw: Optional[str]) -> Optional[float]:
        """Extract a numeric price from a raw string like '$29,995*'."""
        if not raw:
            return None
        cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
        try:
            val = float(cleaned)
            return val if val > 0 else None
        except ValueError:
            return None

    @staticmethod
    def clean_text(raw: Optional[str]) -> Optional[str]:
        """Strip and collapse whitespace in a raw string."""
        if not raw:
            return None
        return " ".join(raw.split()).strip() or None

    @staticmethod
    def extract_year(text: Optional[str]) -> Optional[int]:
        """Extract a 4-digit year from a string."""
        if not text:
            return None
        match = re.search(r"\b(20\d{2}|19\d{2})\b", text)
        return int(match.group(1)) if match else None

    def build_item(
        self,
        dealer: dict,
        make: str,
        model: str,
        year: int,
        **kwargs: Any,
    ) -> dict:
        """
        Build a vehicle item dict compatible with VehicleIngestPayload.

        Increments the per-dealer counter used by the crawl report.
        """
        slug = dealer["slug"]
        self._items_per_dealer[slug] = self._items_per_dealer.get(slug, 0) + 1

        return {
            "ingest_source": "crawler",
            "dealer_slug": slug,
            "dealer_name": dealer["name"],
            "dealer_city": dealer.get("city"),
            "dealer_phone": dealer.get("phone"),
            "dealer_website": dealer.get("website"),
            "make": make,
            "model": model,
            "year": year,
            "condition": "new",
            **kwargs,
        }
