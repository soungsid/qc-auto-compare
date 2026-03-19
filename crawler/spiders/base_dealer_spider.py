"""
Base spider class for all Quebec dealer spiders.

Provides:
  - Dealer registry loading and filtering
  - Playwright-based JS rendering
  - CAPTCHA / block detection and graceful skip
  - Configurable delay + autothrottle
  - Common item normalization helpers
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Iterator, Optional

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

REGISTRY_PATH = Path(__file__).parent.parent / "dealers_registry.json"

# Signals that the page is blocked / behind a CAPTCHA
BLOCK_SIGNALS = ["captcha", "cloudflare", "robot", "access denied", "please verify", "403 forbidden"]


def load_registry(brand_filter: Optional[str] = None, slug_filter: Optional[str] = None) -> list[dict]:
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
      - brand           : str  (used to filter the registry)
      - parse_listing   : method that extracts vehicle items from a listing page
      - parse_vehicle   : (optional) method for detail page extraction
    """

    name = "base_dealer"
    brand = ""  # Override in subclasses (e.g. "Nissan")

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

    def __init__(self, dealer_slug: Optional[str] = None, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.dealer_slug = dealer_slug  # Optional: crawl a single dealer
        self.dealers = load_registry(
            brand_filter=self.brand,
            slug_filter=self.dealer_slug,
        )
        logger.info(
            "[%s] Loaded %d dealer(s) from registry", self.name, len(self.dealers)
        )

    def start_requests(self) -> Iterator[scrapy.Request]:
        """Generate one request per dealer's inventory_url."""
        for dealer in self.dealers:
            url = dealer.get("inventory_url")
            if not url:
                logger.warning("[%s] No inventory_url for dealer %s — skipping", self.name, dealer["slug"])
                continue

            logger.info("[%s] Starting crawl for %s → %s", self.name, dealer["name"], url)
            yield scrapy.Request(
                url=url,
                callback=self.parse_listing,
                meta={
                    "playwright": True,
                    "playwright_include_page": False,
                    "dealer": dealer,
                    "handle_httpstatus_list": [403, 404, 429, 503],
                },
                errback=self.handle_error,
            )

    def parse_listing(self, response: Response) -> Iterator[Any]:
        """
        Override in subclasses to extract vehicle items from the listing page.

        Must yield:
          - Vehicle item dicts (will be sent to BackendIngestPipeline)
          - Optionally: follow-up scrapy.Request for pagination or detail pages
        """
        raise NotImplementedError("Subclasses must implement parse_listing()")

    def handle_error(self, failure: Any) -> None:
        """Log request failures without crashing the spider."""
        logger.error(
            "[%s] Request failed: %s — %s",
            self.name,
            failure.request.url,
            str(failure.value),
        )

    def is_blocked(self, response: Response) -> bool:
        """Return True if the page appears to be a block/CAPTCHA page."""
        if response.status in (403, 429):
            return True
        body_lower = response.text.lower()
        return any(signal in body_lower for signal in BLOCK_SIGNALS)

    # ---- Normalization helpers used by all subclasses ----------------------

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

        Args:
            dealer:  Dealer dict from the registry.
            make:    Vehicle make (will be normalized server-side).
            model:   Vehicle model.
            year:    Model year.
            **kwargs: Any additional VehicleIngestPayload fields.

        Returns:
            Dict ready to be yielded and processed by BackendIngestPipeline.
        """
        return {
            "ingest_source": "crawler",
            "dealer_slug": dealer["slug"],
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
