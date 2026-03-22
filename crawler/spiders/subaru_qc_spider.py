"""
Subaru Quebec Spider — scrapes new vehicle inventory from Subaru dealers in Quebec.
"""

import logging
from typing import Any, Iterator, Optional

import scrapy
from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider

logger = logging.getLogger(__name__)

SELECTORS = {
    "cards": "div.vehicle-card, article.inventory-item, div.listing-new-tile, div.vehicle-item",
    "title": "h2.title, h3.vehicle-title, .vehicle-name, h2 a, h3 a",
    "trim": ".trim, .vehicle-trim, span.trim-level, .grade",
    "msrp": ".price-msrp, .msrp, [data-msrp], .price-regular",
    "sale_price": ".price-sale, .sale-price, .price-current, [data-sale-price]",
    "drivetrain": ".drivetrain, [data-drivetrain], .traction, .symmetrical-awd",
    "vin": "[data-vin], .vin, input[name='vin']",
    "stock": "[data-stock], .stock-number, input[name='stock']",
    "image": "img.vehicle-image, img.primary-photo, img.lazyload",
    "link": "a.vehicle-link, a.details-button, h2 a, h3 a",
    "color": ".ext-color, .exterior-color, [data-ext-color]",
    "next_page": "a.pagination-next, a[rel='next'], .pager-next a, a:contains('Suivant')",
}

SUBARU_MODELS = [
    "Impreza", "Crosstrek", "Outback", "Forester", "Ascent", "Legacy",
    "WRX", "BRZ", "Solterra", "Wilderness",
]


class SubaruQCSpider(BaseDealerSpider):
    """
    Spider for Subaru Quebec dealer websites.

    Usage:
        scrapy crawl subaru_qc_spider
        scrapy crawl subaru_qc_spider -a dealer_slug=option-subaru
    """

    name = "subaru_qc_spider"
    brand = "Subaru"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        dealer = response.meta["dealer"]

        if self.is_blocked(response):
            logger.error("[%s] Bloqué sur %s — ignoré", self.name, dealer["name"])
            return

        cards = response.css(SELECTORS["cards"])
        logger.info("[%s] %s — %d cartes sur %s", self.name, dealer["name"], len(cards), response.url)

        if not cards:
            yield from self._parse_script_data(response, dealer)
            return

        for card in cards:
            item = self._extract_card(card, dealer, response)
            if item:
                yield item

        next_url = response.css(SELECTORS["next_page"] + "::attr(href)").get()
        if next_url:
            yield scrapy.Request(
                url=response.urljoin(next_url),
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
        if not year:
            return None

        model = self._parse_model(title_raw)
        if not model:
            return None

        trim = self.clean_text(card.css(SELECTORS["trim"] + "::text").get())
        msrp = self.clean_price(card.css(SELECTORS["msrp"] + "::text").get())
        sale_price = self.clean_price(card.css(SELECTORS["sale_price"] + "::text").get())
        drivetrain = self.clean_text(card.css(SELECTORS["drivetrain"] + "::text").get())
        vin = self.clean_text(
            card.css(SELECTORS["vin"] + "::attr(data-vin)").get()
            or card.css(SELECTORS["vin"] + "::text").get()
        )
        stock = self.clean_text(
            card.css(SELECTORS["stock"] + "::attr(data-stock)").get()
            or card.css(SELECTORS["stock"] + "::text").get()
        )
        color_ext = self.clean_text(card.css(SELECTORS["color"] + "::text").get())
        image_url = card.css(SELECTORS["image"] + "::attr(src)").get()
        link = card.css(SELECTORS["link"] + "::attr(href)").get()

        return self.build_item(
            dealer=dealer,
            make="Subaru",
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
        for model in SUBARU_MODELS:
            if model.lower() in title_lower:
                return model
        return None

    def _parse_script_data(self, response: Response, dealer: dict) -> Iterator[dict]:
        yield from self.json_ld_fallback(response, dealer, "Subaru", self._parse_model)
