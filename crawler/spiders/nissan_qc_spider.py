"""
Nissan Quebec Spider — scrapes new vehicle inventory from Nissan dealers in Quebec.

Targets official dealer sites (Anjou, Laval, Rive-Sud, Québec).
Priority models: Kicks, Versa (most affordable Nissan lineup).

Site structure (typical CDK/DealerOn platform used by most Nissan QC dealers):
  - Listing page: /inventaire/neuf/ with vehicle cards
  - Pagination: ?page=2 query param or "Suivant" link
  - Vehicle card: div.vehicle-card or article.inventory-item
"""

import logging
from typing import Any, Iterator, Optional

import scrapy
from scrapy.http import Response

from spiders.base_dealer_spider import BaseDealerSpider

logger = logging.getLogger(__name__)

# CSS selectors — adjust per site when deploying against live URLs
SELECTORS = {
    # Main vehicle cards container
    "cards": "div.vehicle-card, article.inventory-item, div.listing-new-tile",
    # Within each card:
    "title": "h2.title, h3.vehicle-title, .vehicle-name",
    "trim": ".trim, .vehicle-trim, span.trim-level",
    "msrp": ".price-msrp, .msrp, [data-msrp]",
    "sale_price": ".price-sale, .sale-price, .price-current, [data-sale-price]",
    "drivetrain": ".drivetrain, [data-drivetrain], .traction",
    "vin": "[data-vin], .vin, input[name='vin']",
    "stock": "[data-stock], .stock-number, input[name='stock']",
    "image": "img.vehicle-image, img.primary-photo",
    "link": "a.vehicle-link, a.details-button, h2 a, h3 a",
    "color": ".ext-color, .exterior-color, [data-ext-color]",
    # Pagination
    "next_page": "a.pagination-next, a[rel='next'], .pager-next a, a:contains('Suivant')",
}


class NissanQCSpider(BaseDealerSpider):
    """
    Spider for Nissan Quebec dealer websites.

    Crawls all Nissan dealers registered with spider='nissan_qc_spider' in
    dealers_registry.json. Handles JS-rendered pages via Playwright.

    Usage:
        scrapy crawl nissan_qc_spider
        scrapy crawl nissan_qc_spider -a dealer_slug=nissan-anjou
    """

    name = "nissan_qc_spider"
    brand = "Nissan"

    def parse_listing(self, response: Response) -> Iterator[Any]:
        """Extract vehicle cards from a Nissan dealer inventory listing page."""
        dealer = response.meta["dealer"]

        if self.is_blocked(response):
            logger.error(
                "[%s] Blocked/CAPTCHA on %s (%s) — skipping dealer",
                self.name,
                dealer["name"],
                response.url,
            )
            return

        cards = response.css(SELECTORS["cards"])
        logger.info(
            "[%s] %s — found %d vehicle cards on %s",
            self.name,
            dealer["name"],
            len(cards),
            response.url,
        )

        if not cards:
            # Try JSON-LD or embedded script data as fallback
            yield from self._parse_script_data(response, dealer)
            return

        for card in cards:
            item = self._extract_card(card, dealer, response)
            if item:
                yield item

        # ---- Pagination ----------------------------------------------------
        next_url = response.css(SELECTORS["next_page"] + "::attr(href)").get()
        if next_url:
            yield scrapy.Request(
                url=response.urljoin(next_url),
                callback=self.parse_listing,
                meta={
                    "playwright": True,
                    "dealer": dealer,
                    "handle_httpstatus_list": [403, 404, 429, 503],
                },
                errback=self.handle_error,
            )

    def _extract_card(self, card: Any, dealer: dict, response: Response) -> Optional[dict]:
        """Extract a vehicle item dict from a single listing card."""
        # Title usually contains "2024 Nissan Kicks S FWD" or "Nissan Kicks 2024"
        title_raw = self.clean_text(card.css(SELECTORS["title"] + "::text").get())
        if not title_raw:
            return None

        # Parse year
        year = self.extract_year(title_raw)
        if not year:
            return None

        # Parse model from title (after brand name)
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
        listing_url = response.urljoin(link) if link else response.url

        return self.build_item(
            dealer=dealer,
            make="Nissan",
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
            listing_url=listing_url,
        )

    def _parse_model(self, title: str) -> Optional[str]:
        """
        Extract model name from a title string.

        Examples:
          "2024 Nissan Kicks S FWD"  → "Kicks"
          "Nissan Versa 2024 S"      → "Versa"
          "KICKS S 2024"             → "Kicks"
        """
        nissan_models = [
            "Kicks", "Versa", "Sentra", "Altima", "Maxima",
            "Rogue", "Murano", "Pathfinder", "Armada", "Frontier",
            "Titan", "Leaf", "Ariya", "Z", "GT-R",
        ]
        title_lower = title.lower()
        for model in nissan_models:
            if model.lower() in title_lower:
                return model
        return None

    def _parse_script_data(self, response: Response, dealer: dict) -> Iterator[dict]:
        """Délègue au fallback JSON-LD centralisé dans BaseDealerSpider."""
        yield from self.json_ld_fallback(response, dealer, "Nissan", self._parse_model)
