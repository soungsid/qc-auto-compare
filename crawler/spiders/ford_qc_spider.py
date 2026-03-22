"""
Ford Quebec Spider — scrapes new vehicle inventory from Ford dealers in Quebec.

Ford dealers in Quebec use various platforms (CDK, DealerSocket, Dealer.com).
CSS selectors cover common patterns; JSON-LD fallback handles the rest.
"""

import logging
from typing import Any, Iterator, Optional

import scrapy
from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider

logger = logging.getLogger(__name__)

SELECTORS = {
    "cards": (
        "div.vehicle-card, article.inventory-item, div.listing-new-tile, "
        "div.vehicle-item, li.inventory-listing-item, div.new-vehicle-card"
    ),
    "title": "h2.title, h3.vehicle-title, .vehicle-name, h2 a, h3 a, .inventory-title",
    "trim": ".trim, .vehicle-trim, span.trim-level, .series",
    "msrp": ".price-msrp, .msrp, [data-msrp], .price-regular, .starting-price",
    "sale_price": ".price-sale, .sale-price, .price-current, [data-sale-price], .final-price",
    "drivetrain": ".drivetrain, [data-drivetrain], .traction, .drive-type",
    "vin": "[data-vin], .vin, input[name='vin'], [data-vehiclevin]",
    "stock": "[data-stock], .stock-number, input[name='stock'], [data-stocknumber]",
    "image": "img.vehicle-image, img.primary-photo, img.lazyload, img[data-src]",
    "link": "a.vehicle-link, a.details-button, h2 a, h3 a, a.inventory-link",
    "color": ".ext-color, .exterior-color, [data-ext-color], .color-swatch-label",
    "next_page": "a.pagination-next, a[rel='next'], .pager-next a, a:contains('Suivant'), a:contains('Next')",
}

FORD_MODELS = [
    "Escape", "Edge", "Explorer", "Expedition", "Bronco", "Bronco Sport",
    "Maverick", "Ranger", "F-150", "F-250", "F-350", "F-450", "F-550",
    "Mustang", "Mustang Mach-E", "EcoSport", "Transit", "Transit Connect",
    "Transit-150", "Transit-250", "Transit-350", "Super Duty",
    "E-Transit", "Lightning",
]

LINCOLN_MODELS = [
    "Corsair", "Nautilus", "Aviator", "Navigator",
]

ALL_MODELS = FORD_MODELS + LINCOLN_MODELS


class FordQCSpider(BaseDealerSpider):
    """
    Spider for Ford Quebec dealer websites.

    Usage:
        scrapy crawl ford_qc_spider
        scrapy crawl ford_qc_spider -a dealer_slug=desjardins-ford-ste-foy
    """

    name = "ford_qc_spider"
    brand = "Ford"

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

        make = "Lincoln" if model in LINCOLN_MODELS else "Ford"
        trim = self.clean_text(card.css(SELECTORS["trim"] + "::text").get())
        msrp = self.clean_price(card.css(SELECTORS["msrp"] + "::text").get())
        sale_price = self.clean_price(card.css(SELECTORS["sale_price"] + "::text").get())
        drivetrain = self.clean_text(card.css(SELECTORS["drivetrain"] + "::text").get())
        vin = self.clean_text(
            card.css(SELECTORS["vin"] + "::attr(data-vin)").get()
            or card.css("[data-vehiclevin]::attr(data-vehiclevin)").get()
            or card.css(SELECTORS["vin"] + "::text").get()
        )
        stock = self.clean_text(
            card.css(SELECTORS["stock"] + "::attr(data-stock)").get()
            or card.css(SELECTORS["stock"] + "::text").get()
        )
        color_ext = self.clean_text(card.css(SELECTORS["color"] + "::text").get())
        image_url = (
            card.css(SELECTORS["image"] + "::attr(src)").get()
            or card.css("img[data-src]::attr(data-src)").get()
        )
        link = card.css(SELECTORS["link"] + "::attr(href)").get()

        return self.build_item(
            dealer=dealer,
            make=make,
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
        # Check multi-word models first
        for model in sorted(ALL_MODELS, key=len, reverse=True):
            if model.lower() in title_lower:
                return model
        return None

    def _parse_script_data(self, response: Response, dealer: dict) -> Iterator[dict]:
        yield from self.json_ld_fallback(response, dealer, "Ford", self._parse_model)
