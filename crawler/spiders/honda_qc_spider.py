"""
Honda Quebec Spider — scrapes new vehicle inventory from Honda dealers in Quebec.

Honda dealers in Quebec use the D2C Media platform.
Strategy: fetch /fr/sitemap_newinventory.xml, crawl individual vehicle pages.
"""

import logging
import re
from typing import Any, Iterator, Optional

from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider
from spiders.d2c_media_spider import D2CMediaMixin

logger = logging.getLogger(__name__)

HONDA_MODELS = [
    "Accord Sedan", "Accord", "Civic Sedan", "Civic Hatchback", "Civic Si",
    "Civic Type R", "Civic", "CR-V Hybrid", "CR-V", "HR-V", "Passport",
    "Pilot", "Ridgeline", "Odyssey", "Prologue", "e:Ny1", "Fit", "Jazz",
]


class HondaQCSpider(D2CMediaMixin, BaseDealerSpider):
    """
    Spider for Honda Quebec dealer websites (D2C Media platform).

    Usage:
        scrapy crawl honda_qc_spider
        scrapy crawl honda_qc_spider -a dealer_slug=honda-charlesbourg
    """

    name = "honda_qc_spider"
    brand = "Honda"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        """Unused — D2CMediaMixin.start_requests overrides the flow."""
        return iter([])

    def _normalize_model(self, raw: str) -> Optional[str]:
        """Normalize a raw model string from D2C Media URL to a canonical Honda model name."""
        # raw comes from URL segment: "Accord Sedan", "CR V", "HR V" etc.
        # Normalize underscores already converted to spaces by _url_to_make_model_year
        raw_lower = raw.lower()
        # Check longer names first
        for model in sorted(HONDA_MODELS, key=len, reverse=True):
            if model.lower() in raw_lower or raw_lower in model.lower():
                return model
        # Fallback: return raw if it looks valid
        return raw if raw else None

