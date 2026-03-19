"""
Kia Quebec Spider — scrapes new vehicle inventory from Kia dealers in Quebec.

Priority models: Forte, Soul, Rio (entry-level lineup).
"""

import json
import logging
from typing import Any, Iterator, Optional

import scrapy
from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider

logger = logging.getLogger(__name__)

KIA_MODELS = [
    "Rio", "Forte", "Stinger", "Soul", "Niro", "Sportage",
    "Sorento", "Telluride", "Carnival", "EV6", "EV9",
    "K5", "Seltos",
]

SELECTORS = {
    "cards": "div.vehicle-card, li.vehicle-item, article.srp-tile, div.inventory-vehicle",
    "title": "h2, h3, .vehicle-name, .srp-title",
    "trim": ".trim, .package, [data-trim]",
    "msrp": ".msrp, .starting-price, [data-msrp]",
    "sale_price": ".sale-price, .price-value, [data-price]",
    "drivetrain": "[data-drivetrain], .drivetrain, .traction-type",
    "vin": "[data-vin], input[name='vin']",
    "stock": "[data-stock], .stock-num",
    "image": "img.vehicle-photo, img[src*='kia'], img[data-src]",
    "link": "a[href*='inventaire'], a[href*='detail'], a.vehicle-link",
    "color": ".ext-color, [data-ext-color], .color-label",
    "next_page": "a.page-next, a[aria-label='Page suivante'], .pagination li:last-child a",
}


class KiaQCSpider(BaseDealerSpider):
    """
    Spider for Kia Quebec dealer websites.

    Usage:
        scrapy crawl kia_qc_spider
        scrapy crawl kia_qc_spider -a dealer_slug=kia-levis
    """

    name = "kia_qc_spider"
    brand = "Kia"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        dealer = response.meta["dealer"]

        if self.is_blocked(response):
            logger.error("[%s] Blocked on %s — skipping", self.name, dealer["name"])
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

        image_url = (
            card.css(SELECTORS["image"] + "::attr(data-src)").get()
            or card.css(SELECTORS["image"] + "::attr(src)").get()
        )
        link = card.css(SELECTORS["link"] + "::attr(href)").get()

        return self.build_item(
            dealer=dealer,
            make="Kia",
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
        for model in KIA_MODELS:
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
                        make="Kia",
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
