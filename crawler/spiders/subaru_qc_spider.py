"""
Subaru Quebec Spider — scrapes new vehicle inventory from Subaru dealers in Quebec.

Subaru dealers in Quebec use the D2C Media platform.
Strategy: fetch /fr/sitemap_newinventory.xml, crawl individual vehicle pages.
"""

import logging
from typing import Any, Iterator, Optional

from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider
from spiders.d2c_media_spider import D2CMediaMixin

logger = logging.getLogger(__name__)

SUBARU_MODELS = [
    "Crosstrek Wilderness", "Outback Wilderness", "Crosstrek", "Outback",
    "Forester", "Ascent", "Legacy", "Impreza", "WRX", "BRZ", "Solterra",
]


class SubaruQCSpider(D2CMediaMixin, BaseDealerSpider):
    """
    Spider for Subaru Quebec dealer websites (D2C Media platform).

    Usage:
        scrapy crawl subaru_qc_spider
        scrapy crawl subaru_qc_spider -a dealer_slug=option-subaru
    """

    name = "subaru_qc_spider"
    brand = "Subaru"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        """Unused — D2CMediaMixin.start_requests overrides the flow."""
        return iter([])

    def _normalize_model(self, raw: str) -> Optional[str]:
        raw_lower = raw.lower()
        for model in sorted(SUBARU_MODELS, key=len, reverse=True):
            if model.lower() in raw_lower or raw_lower in model.lower():
                return model
        return raw if raw else None

    def _normalize_make(self, raw: str) -> str:
        return "Subaru"

