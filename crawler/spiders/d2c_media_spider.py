"""
D2C Media Spider Base — pour les sites québécois sur la plateforme D2C Media
(ex: Honda Charlesbourg, Desjardins VW, Desjardins Ford, Laurier Mazda, Desjardins Subaru).

Stratégie :
  1. Fetch `/fr/sitemap_newinventory.xml` (ou `/en/`) → liste des URLs de véhicules individuels
  2. Filter URLs matching `-id{N}.html` (pages de véhicules individuels, pas modèles)
  3. Extraire les données depuis les balises statiques de chaque page de véhicule :
     - <title>  : make, model, year, trim, price, stock
     - og:description : couleur ext/int
     - body text : VIN (NIV)
  Avantage : PAS besoin de Playwright (HTML statique), beaucoup plus rapide et fiable.
"""

import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Iterator, Optional

import scrapy
from scrapy.http import Response

logger = logging.getLogger(__name__)

# Pattern: /path/Make-Model_Name-2026-id12345678.html (not -pdf)
_VIN_URL_RE = re.compile(r"-id(\d+)\.html$", re.IGNORECASE)

# NIV (VIN) in French body text: "Le NIV de ce ... est le XXXXXXXXXXXXXXXXX"
_VIN_BODY_RE = re.compile(r"\bNIV\b.{0,100}([A-HJ-NPR-Z0-9]{17})", re.IGNORECASE)

# Price in title: "$46,651" or "$46 651"
_PRICE_RE = re.compile(r"\$\s*([\d][,\s\d]*\d)(?:\*)?")

# Stock number in title: "(760264-neuf)"
_STOCK_RE = re.compile(r"\(([^)]+)\)")

# Color extraction from og:description: "Ext: Gris, int: Noir"
_COLOR_EXT_RE = re.compile(r"[Ee]xt[.:]?\s*([^,;]+)", re.IGNORECASE)
_COLOR_INT_RE = re.compile(r"\bint[.:]?\s*([^,;$]+)", re.IGNORECASE)


def _clean_price(raw: str) -> Optional[float]:
    cleaned = re.sub(r"[^\d.]", "", raw.replace(",", "").replace(" ", "").replace("\u00a0", ""))
    try:
        val = float(cleaned)
        return val if val > 0 else None
    except ValueError:
        return None


def _url_to_make_model_year(url: str) -> tuple[Optional[str], Optional[str], Optional[int]]:
    """
    Extract make, model, year from a D2C Media URL.
    Example: .../Honda-Accord_Sedan-2026-id12345678.html
    → ("Honda", "Accord Sedan", 2026)
    """
    fname = url.split("/")[-1]  # Honda-Accord_Sedan-2026-id12345678.html
    # Remove -idNNNNNNN.html suffix
    fname = re.sub(r"-id\d+\.html$", "", fname, flags=re.IGNORECASE)
    # Remove -pdfNNNNNNN.html suffix (shouldn't occur after filtering but just in case)
    fname = re.sub(r"-pdf\d+\.html$", "", fname, flags=re.IGNORECASE)

    parts = fname.split("-")
    if len(parts) < 2:
        return None, None, None

    make = parts[0]  # Honda, Ford, Volkswagen, etc.

    # Find year (4-digit starting with 19 or 20)
    year = None
    year_idx = -1
    for i, part in enumerate(parts):
        if re.match(r"^(19|20)\d{2}$", part):
            year = int(part)
            year_idx = i
            break

    if year is None:
        return make, None, None

    # Model is between make and year; underscores → spaces, hyphens between parts → spaces
    model_parts = parts[1:year_idx]
    model = " ".join(p.replace("_", " ") for p in model_parts)

    return make, model, year


class D2CMediaMixin:
    """
    Mixin pour les spiders sur la plateforme D2C Media.

    À utiliser avec BaseDealerSpider via héritage multiple :
        class HondaQCSpider(D2CMediaMixin, BaseDealerSpider): ...

    La MRO Python assure que D2CMediaMixin.start_requests() prend priorité
    sur BaseDealerSpider.start_requests(). Les méthodes build_item(), clean_text()
    etc. viennent de BaseDealerSpider.

    Subclasses must define:
      - name  : str
      - brand : str
      - _normalize_model(raw: str) -> Optional[str]
    """

    def start_requests(self) -> Iterator[scrapy.Request]:
        """Generate one sitemap request per D2C Media dealer."""
        for dealer in self.dealers:
            website = (dealer.get("website") or "").rstrip("/")
            if not website:
                logger.warning("[%s] Pas de website pour %s — ignoré", self.name, dealer["name"])
                continue

            # Try French sitemap first
            sitemap_url = f"{website}/fr/sitemap_newinventory.xml"
            yield scrapy.Request(
                url=sitemap_url,
                callback=self.parse_sitemap,
                meta={"dealer": dealer, "website": website, "tried_en": False},
                errback=self.handle_error,
                dont_filter=True,
            )

    def parse_sitemap(self, response: Response) -> Iterator[Any]:
        """Parse the D2C Media new-inventory sitemap and queue individual vehicle pages."""
        dealer = response.meta["dealer"]
        website = response.meta.get("website", "")

        if response.status == 404 and not response.meta.get("tried_en"):
            # Fall back to English sitemap
            sitemap_url = f"{website}/en/sitemap_newinventory.xml"
            yield scrapy.Request(
                url=sitemap_url,
                callback=self.parse_sitemap,
                meta={"dealer": dealer, "website": website, "tried_en": True},
                errback=self.handle_error,
                dont_filter=True,
            )
            return

        if response.status not in (200,):
            logger.error(
                "[%s] %s — sitemap HTTP %s",
                self.name, dealer["name"], response.status,
            )
            return

        # Extract <loc> URLs from the sitemap XML
        # Use local-name() XPath to avoid namespace issues with xmlns="..."
        all_locs = response.xpath("//*[local-name()='loc']/text()").getall()
        # Keep only individual vehicle pages: must match -idNNNNN.html
        vehicle_urls = [url for url in all_locs if _VIN_URL_RE.search(url)]

        logger.info(
            "[%s] %s — %d véhicules dans le sitemap (%d URLs total)",
            self.name, dealer["name"], len(vehicle_urls), len(all_locs),
        )

        for url in vehicle_urls:
            yield scrapy.Request(
                url=url,
                callback=self.parse_vehicle_detail,
                meta={"dealer": dealer},
                errback=self.handle_error,
            )

    def parse_vehicle_detail(self, response: Response) -> Optional[dict]:
        """Extract vehicle data from a D2C Media individual vehicle page (static HTML)."""
        dealer = response.meta["dealer"]

        if response.status != 200:
            return None

        url = response.url
        make, model_from_url, year_from_url = _url_to_make_model_year(url)

        # --- Title extraction ---
        # "Honda Accord-Sedan 2026 neuf à vendre (760264-neuf), Hybrid Sport-L $46,651"
        title = response.css("title::text").get() or ""

        year = year_from_url
        if not year:
            m = re.search(r"\b(20\d{2}|19\d{2})\b", title)
            year = int(m.group(1)) if m else None

        if not year:
            return None

        # Price from title
        price_match = _PRICE_RE.search(title)
        price = _clean_price(price_match.group(1)) if price_match else None

        # Stock from title (inside parentheses before the comma)
        stock_match = _STOCK_RE.search(title)
        stock_raw = stock_match.group(1) if stock_match else None

        # Trim: everything after the last comma before the price
        # "... (760264-neuf), Hybrid Sport-L $46,651"
        trim = None
        trim_match = re.search(r",\s*([^,]+?)\s*\$[\d,]+", title)
        if trim_match:
            trim = trim_match.group(1).strip()

        # --- og:description extraction ---
        # "Honda Accord-Sedan 2026 neuf, Ext: Gris, int: Noir, Hybrid Sport-L$46,651. Dealer - (Stock:xxx)"
        og_desc = response.css('meta[property="og:description"]::attr(content)').get() or ""
        color_ext_m = _COLOR_EXT_RE.search(og_desc)
        color_int_m = _COLOR_INT_RE.search(og_desc)
        color_ext = color_ext_m.group(1).strip().rstrip(",") if color_ext_m else None
        color_int = color_int_m.group(1).strip().rstrip(",") if color_int_m else None

        # If trim not found in title, try og:description
        if not trim and og_desc:
            # Pattern after color info: "..., Trim$price"
            td_m = re.search(r"Noir,\s*(.+?)\$[\d,]+", og_desc)
            if td_m:
                trim = td_m.group(1).strip()

        # --- og:image ---
        image_url = response.css('meta[property="og:image"]::attr(content)').get()

        # --- Body text: VIN (NIV) ---
        body_text = " ".join(response.css("body *::text").getall())
        vin_match = _VIN_BODY_RE.search(body_text)
        vin = vin_match.group(1) if vin_match else None

        # --- Model normalization ---
        model = self._normalize_model(model_from_url or "")
        if not model:
            return None

        # Normalize make
        normalized_make = self._normalize_make(make or self.brand)

        item = self.build_item(
            dealer=dealer,
            make=normalized_make,
            model=model,
            year=year,
            trim=trim,
            vin=vin,
            stock_number=stock_raw,
            sale_price=price,
            color_ext=color_ext,
            color_int=color_int,
            image_url=image_url,
            listing_url=url,
        )
        return item

    def _normalize_model(self, raw: str) -> Optional[str]:
        """Subclasses should override to normalize model names for their brand."""
        return raw if raw else None

    def _normalize_make(self, raw: str) -> str:
        """Return the canonical make name."""
        return raw
