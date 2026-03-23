"""
Ford Quebec Spider — scrapes new vehicle inventory from Ford dealers in Quebec.

Ford dealers in Quebec use the D2C Media platform.
Strategy: fetch /fr/sitemap_newinventory.xml, crawl individual vehicle pages.
"""

import logging
import re
from typing import Any, Iterator, Optional

from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider
from spiders.d2c_media_spider import D2CMediaMixin

logger = logging.getLogger(__name__)

FORD_MODELS = [
    "Escape PHEV", "Escape Hybrid", "Escape", "Edge", "Explorer", "Expedition",
    "Bronco Sport", "Bronco", "Maverick", "Ranger",
    "F-150 Lightning", "F-150", "F-250", "F-350", "F-450", "F-550",
    "Super Duty F-250 SRW", "Super Duty F-250", "Super Duty F-350",
    "Mustang Mach-E", "Mustang Décapotable", "Mustang",
    "Transit Connect", "Transit-150", "Transit-250", "Transit-350", "Transit",
    "E-Transit",
]

LINCOLN_MODELS = [
    "Corsair", "Nautilus", "Aviator", "Navigator",
]

ALL_MODELS = FORD_MODELS + LINCOLN_MODELS


class FordQCSpider(D2CMediaMixin, BaseDealerSpider):
    """
    Spider for Ford Quebec dealer websites (D2C Media platform).

    Usage:
        scrapy crawl ford_qc_spider
        scrapy crawl ford_qc_spider -a dealer_slug=desjardins-ford-ste-foy
    """

    name = "ford_qc_spider"
    brand = "Ford"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        """Unused — D2CMediaMixin.start_requests overrides the flow."""
        return iter([])

    def _normalize_model(self, raw: str) -> Optional[str]:
        raw_lower = raw.lower()
        for model in sorted(ALL_MODELS, key=len, reverse=True):
            if model.lower() in raw_lower or raw_lower in model.lower():
                return model
        return raw if raw else None

    def _normalize_make(self, raw: str) -> str:
        # Detect Lincoln models
        if raw and any(m.lower() in raw.lower() for m in LINCOLN_MODELS):
            return "Lincoln"
        return "Ford"

