"""
Toyota Quebec Spider — scrapes new vehicle inventory from Toyota dealers in Quebec.

Priority models: Corolla, Yaris, GR86 (entry-level lineup).
Toyota QC dealers typically run on the Dealer.com or CDK platform.
"""

import json
import logging
import re
from typing import Any, Iterator, Optional

import scrapy
from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider

logger = logging.getLogger(__name__)

TOYOTA_MODELS = [
    "Corolla", "Yaris", "Camry", "Avalon", "Prius", "86", "GR86",
    "RAV4", "Venza", "Highlander", "4Runner", "Sequoia", "Land Cruiser",
    "Tacoma", "Tundra", "Sienna", "C-HR", "bZ4X",
]

SELECTORS = {
    "cards": "div.vehicle-card, article.vehicle, li.inventory-item, div.srp-vehicle-tile",
    "title": "h2, h3, .vehicle-title, .vehicle-name, [data-vehicle-title]",
    "trim": ".trim, .vehicle-trim, [data-trim]",
    "msrp": ".msrp, [data-msrp], .starting-price",
    "sale_price": ".sale-price, .price, [data-price], .dealer-price",
    "drivetrain": "[data-drivetrain], .drivetrain, .traction, [data-awd]",
    "vin": "[data-vin], .vin-number",
    "stock": "[data-stock-number], .stock",
    "image": "img[src*='vehicle'], img[src*='inventory'], img.primary",
    "link": "a[href*='inventaire'], a[href*='inventory'], a[href*='detail'], a.cta-btn",
    "color": "[data-ext-color], .exterior-color, .color-swatch-label",
    "next_page": "a[aria-label='Next'], a.next-page, .pagination a:last-child, a:contains('Suivant')",
}


class ToyotaQCSpider(BaseDealerSpider):
    """
    Spider for Toyota Quebec dealer websites.

    Usage:
        scrapy crawl toyota_qc_spider
        scrapy crawl toyota_qc_spider -a dealer_slug=toyota-laval
    """

    name = "toyota_qc_spider"
    brand = "Toyota"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        dealer = response.meta["dealer"]

        if self.is_blocked(response):
            logger.error(
                "[%s] Blocked on %s (%s) — skipping", self.name, dealer["name"], response.url
            )
            return

        cards = response.css(SELECTORS["cards"])
        logger.info(
            "[%s] %s — %d cards on %s", self.name, dealer["name"], len(cards), response.url
        )

        if not cards:
            yield from self._try_json_fallback(response, dealer)
            return

        for card in cards:
            item = self._extract_card(card, dealer, response)
            if item:
                yield item

        # Pagination
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

        trim = self.clean_text(card.css(SELECTORS["trim"] + "::text").get())
        msrp = self.clean_price(card.css(SELECTORS["msrp"] + "::text").get())
        sale_price = self.clean_price(card.css(SELECTORS["sale_price"] + "::text").get())
        drivetrain = self.clean_text(card.css(SELECTORS["drivetrain"] + "::text").get())
        vin = self.clean_text(card.css(SELECTORS["vin"] + "::attr(data-vin)").get())
        stock = self.clean_text(card.css(SELECTORS["stock"] + "::attr(data-stock-number)").get())
        color_ext = self.clean_text(card.css(SELECTORS["color"] + "::text").get())
        image_url = card.css(SELECTORS["image"] + "::attr(src)").get()
        link = card.css(SELECTORS["link"] + "::attr(href)").get()

        return self.build_item(
            dealer=dealer,
            make="Toyota",
            model=model,
            year=year,
            trim=trim,
            vin=vin,
            stock_number=stock,
            msrp=msrp,
            sale_price=sale_price,
            drivetrain=drivetrain,
            color_ext=color_ext,
            image_url=image_url,
            listing_url=response.urljoin(link) if link else response.url,
        )

    def _parse_model(self, title: str) -> Optional[str]:
        title_lower = title.lower()
        for model in TOYOTA_MODELS:
            if model.lower() in title_lower:
                return model
        return None

    def _try_json_fallback(self, response: Response, dealer: dict) -> Iterator[dict]:
        """Extract from JSON-LD if CSS selectors returned nothing."""
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
                        make="Toyota",
                        model=model,
                        year=int(year),
                        trim=item_data.get("vehicleConfiguration"),
                        vin=item_data.get("vehicleIdentificationNumber"),
                        msrp=self.clean_price(str(offers.get("price", ""))),
                        drivetrain=item_data.get("driveWheelConfiguration"),
                        listing_url=item_data.get("url", response.url),
                    )
            except (json.JSONDecodeError, TypeError):
                continue
