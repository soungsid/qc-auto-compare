"""
Scrapy downloader middlewares.

- RotatingUserAgentMiddleware : cycles through 20 realistic browser UAs
- RateLimitRetryMiddleware    : retries on 429 / 503 with exponential backoff
"""

import logging
import random
import time
from typing import Any

from scrapy import signals
from scrapy.downloadermiddlewares.retry import RetryMiddleware
from scrapy.http import Request, Response
from scrapy.spiders import Spider
from scrapy.utils.response import response_status_message

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Realistic User-Agent pool (desktop Chrome / Firefox / Edge on Windows/Mac)
# ---------------------------------------------------------------------------

USER_AGENTS: list[str] = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 OPR/110.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/123.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Vivaldi/6.7.3329.27",
]


class RotatingUserAgentMiddleware:
    """Randomly select a User-Agent for each request from the pool."""

    def process_request(self, request: Request, spider: Spider) -> None:
        request.headers["User-Agent"] = random.choice(USER_AGENTS)


# ---------------------------------------------------------------------------
# Rate-limit / retry middleware
# ---------------------------------------------------------------------------

# Backoff delays in seconds for successive retry attempts
BACKOFF_DELAYS = [5, 15, 30]

# HTTP status codes that warrant a retry
RETRY_HTTP_CODES = {429, 503, 502, 504, 520, 521, 522, 523, 524}


class RateLimitRetryMiddleware(RetryMiddleware):
    """
    Extends the built-in RetryMiddleware with:
      - Exponential backoff based on retry count (5s → 15s → 30s)
      - Specific handling of 429 Too Many Requests
      - Detection of soft-block / CAPTCHA pages
    """

    def process_response(
        self, request: Request, response: Response, spider: Spider
    ) -> Any:
        if response.status in RETRY_HTTP_CODES:
            retry_count = request.meta.get("retry_times", 0)
            delay = BACKOFF_DELAYS[min(retry_count, len(BACKOFF_DELAYS) - 1)]
            logger.warning(
                "[%s] HTTP %d on %s — waiting %ds before retry %d",
                spider.name,
                response.status,
                request.url,
                delay,
                retry_count + 1,
            )
            time.sleep(delay)
            return self._retry(request, response_status_message(response.status), spider) or response

        # Soft-block / CAPTCHA detection
        body_lower = response.text.lower()
        captcha_signals = ["captcha", "cloudflare", "robot", "access denied", "please verify"]
        if any(signal in body_lower for signal in captcha_signals):
            logger.error(
                "[%s] CAPTCHA/block detected on %s — skipping",
                spider.name,
                request.url,
            )
            # Mark request as failed so the spider can skip this dealer
            request.meta["captcha_detected"] = True
            return response

        return super().process_response(request, response, spider)
