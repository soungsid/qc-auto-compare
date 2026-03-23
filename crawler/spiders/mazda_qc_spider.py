"""
Mazda Quebec Spider — scrapes new vehicle inventory from Mazda dealers in Quebec.

Mazda dealers in Quebec use the D2C Media platform.
Strategy: fetch /fr/sitemap_newinventory.xml, crawl individual vehicle pages.
"""

import logging
from typing import Any, Iterator, Optional

from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider
from spiders.d2c_media_spider import D2CMediaMixin

logger = logging.getLogger(__name__)

MAZDA_MODELS = [
    "CX-90", "CX-70", "CX-60", "CX-50", "CX-5", "CX-30", "CX-3",
    "MX-30", "MX-5", "Mazda3", "Mazda6", "Mazda2",
]


class MazdaQCSpider(D2CMediaMixin, BaseDealerSpider):
    """
    Spider for Mazda Quebec dealer websites (D2C Media platform).

    Usage:
        scrapy crawl mazda_qc_spider
        scrapy crawl mazda_qc_spider -a dealer_slug=laurier-mazda
    """

    name = "mazda_qc_spider"
    brand = "Mazda"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        """Unused — D2CMediaMixin.start_requests overrides the flow."""
        return iter([])

    def _normalize_model(self, raw: str) -> Optional[str]:
        raw_lower = raw.lower()
        for model in sorted(MAZDA_MODELS, key=len, reverse=True):
            if model.lower() in raw_lower or raw_lower in model.lower():
                return model
        return raw if raw else None

    def _normalize_make(self, raw: str) -> str:
        return "Mazda"

