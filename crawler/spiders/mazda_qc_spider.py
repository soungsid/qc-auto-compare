"""
Mazda Quebec Spider — scrapes new vehicle inventory from Mazda dealers in Quebec.
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
    "drivetrain": ".drivetrain, [data-drivetrain], .traction, .awd",
    "vin": "[data-vin], .vin, input[name='vin']",
    "stock": "[data-stock], .stock-number, input[name='stock']",
    "image": "img.vehicle-image, img.primary-photo, img.lazyload",
    "link": "a.vehicle-link, a.details-button, h2 a, h3 a",
    "color": ".ext-color, .exterior-color, [data-ext-color]",
    "next_page": "a.pagination-next, a[rel='next'], .pager-next a, a:contains('Suivant')",
}

MAZDA_MODELS = [
    "Mazda2", "Mazda3", "Mazda6", "CX-3", "CX-5", "CX-50", "CX-60",
    "CX-70", "CX-90", "MX-5", "MX-30", "Mazda CX-5", "Mazda CX-50",
    "Mazda CX-90", "Mazda3", "Mazda CX-3",
]


class MazdaQCSpider(BaseDealerSpider):
    """
    Spider for Mazda Quebec dealer websites.

    Usage:
        scrapy crawl mazda_qc_spider
        scrapy crawl mazda_qc_spider -a dealer_slug=laurier-mazda
    """

    name = "mazda_qc_spider"
    brand = "Mazda"

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
            make="Mazda",
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
        # Check longer model names first to avoid partial matches
        for model in sorted(MAZDA_MODELS, key=len, reverse=True):
            if model.lower() in title_lower:
                # Normalize: return canonical name (remove "Mazda " prefix)
                return model.replace("Mazda ", "")
        return None

    def _parse_script_data(self, response: Response, dealer: dict) -> Iterator[dict]:
        yield from self.json_ld_fallback(response, dealer, "Mazda", self._parse_model)
