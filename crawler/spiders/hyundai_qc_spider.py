"""
Hyundai Quebec Spider — scrapes new vehicle inventory from Hyundai dealers in Quebec.

Priority models: Elantra, Venue, Accent (entry-level lineup).
"""

import json
import logging
from typing import Any, Iterator, Optional

import scrapy
from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider

logger = logging.getLogger(__name__)

HYUNDAI_MODELS = [
    "Accent", "Elantra", "Sonata", "Ioniq", "Ioniq 5", "Ioniq 6",
    "Venue", "Kona", "Tucson", "Santa Fe", "Santa Cruz",
    "Palisade", "Nexo", "GV70", "GV80",
]

SELECTORS = {
    "cards": "div.vehicle-card, article.vehicle-item, li.vehicle, div.inventory-tile",
    "title": "h2, h3, .vehicle-title, [data-title]",
    "trim": ".trim, .grade, [data-grade]",
    "msrp": ".msrp, [data-msrp], .starting-from",
    "sale_price": ".price, .sale-price, [data-price]",
    "drivetrain": "[data-drivetrain], .traction, .awd-badge",
    "vin": "[data-vin]",
    "stock": "[data-stock]",
    "image": "img[data-src], img[src*='vehicle']",
    "link": "a[href*='inventaire'], a[href*='vehicle'], a.details",
    "color": "[data-color], .color-name",
    "next_page": "a.next, a[rel='next'], .pagination-next a",
}


class HyundaiQCSpider(BaseDealerSpider):
    """
    Spider for Hyundai Quebec dealer websites.

    Usage:
        scrapy crawl hyundai_qc_spider
        scrapy crawl hyundai_qc_spider -a dealer_slug=hyundai-brossard
    """

    name = "hyundai_qc_spider"
    brand = "Hyundai"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        dealer = response.meta["dealer"]

        if self.is_blocked(response):
            logger.error("[%s] Blocked on %s — skipping", self.name, dealer["name"])
            return

        cards = response.css(SELECTORS["cards"])
        logger.info("[%s] %s — %d cards on %s", self.name, dealer["name"], len(cards), response.url)

        if not cards:
            yield from self._try_json_fallback(response, dealer)
            return

        for card in cards:
            item = self._extract_card(card, dealer, response)
            if item:
                yield item

        next_href = response.css(SELECTORS["next_page"] + "::attr(href)").get()
        if next_href:
            yield scrapy.Request(
                url=response.urljoin(next_href),
                callback=self.parse_listing,
                meta={"playwright": True, "dealer": dealer,
                      "handle_httpstatus_list": [403, 404, 429, 503]},
                errback=self.handle_error,
            )

    def _extract_card(self, card: Any, dealer: dict, response: Response) -> Optional[dict]:
        title_raw = self.clean_text(card.css(SELECTORS["title"] + "::text").get())
        if not title_raw:
            return None

        year = self.extract_year(title_raw)
        model = self._parse_model(title_raw)
        if not year or not model:
            return None

        # Hyundai sites often lazy-load images with data-src
        image_url = (
            card.css(SELECTORS["image"] + "::attr(data-src)").get()
            or card.css(SELECTORS["image"] + "::attr(src)").get()
        )
        link = card.css(SELECTORS["link"] + "::attr(href)").get()

        return self.build_item(
            dealer=dealer,
            make="Hyundai",
            model=model,
            year=year,
            trim=self.clean_text(card.css(SELECTORS["trim"] + "::text").get()),
            vin=self.clean_text(card.css(SELECTORS["vin"] + "::attr(data-vin)").get()),
            stock_number=self.clean_text(card.css(SELECTORS["stock"] + "::attr(data-stock)").get()),
            msrp=self.clean_price(card.css(SELECTORS["msrp"] + "::text").get()),
            sale_price=self.clean_price(card.css(SELECTORS["sale_price"] + "::text").get()),
            drivetrain=self.clean_text(card.css(SELECTORS["drivetrain"] + "::text").get()),
            color_ext=self.clean_text(card.css(SELECTORS["color"] + "::text").get()),
            image_url=image_url,
            listing_url=response.urljoin(link) if link else response.url,
        )

    def _parse_model(self, title: str) -> Optional[str]:
        title_lower = title.lower()
        # Check multi-word models first (e.g. "Ioniq 6" before "Ioniq")
        for model in sorted(HYUNDAI_MODELS, key=len, reverse=True):
            if model.lower() in title_lower:
                return model
        return None

    def _try_json_fallback(self, response: Response, dealer: dict) -> Iterator[dict]:
        for script in response.css('script[type="application/ld+json"]::text').getall():
            try:
                data = json.loads(script)
                items = data if isinstance(data, list) else [data]
                for item_data in items:
                    if item_data.get("@type") not in ("Car", "Vehicle"):
                        continue
                    name = item_data.get("name", "")
                    year = self.extract_year(name) or item_data.get("modelDate")
                    model = self._parse_model(name)
                    if not year or not model:
                        continue
                    offers = item_data.get("offers", {})
                    yield self.build_item(
                        dealer=dealer,
                        make="Hyundai",
                        model=model,
                        year=int(year),
                        trim=item_data.get("vehicleConfiguration"),
                        vin=item_data.get("vehicleIdentificationNumber"),
                        msrp=self.clean_price(str(offers.get("price", ""))),
                        listing_url=item_data.get("url", response.url),
                    )
            except (json.JSONDecodeError, TypeError):
                continue
