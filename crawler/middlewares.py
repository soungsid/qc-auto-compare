"""
Scrapy downloader middlewares.

- RotatingUserAgentMiddleware : cycles through 20 realistic browser UAs
- RateLimitRetryMiddleware    : retries on 429 / 503 with non-blocking async backoff

CORRECTIF : time.sleep() bloquait l'intégralité du reactor Twisted, gelant tous
les spiders concurrents pendant le délai. Remplacé par twisted.internet.task.deferLater
qui rend le contrôle au reactor le temps du délai — les autres requêtes continuent
de s'exécuter normalement.
"""

import logging
import random
from typing import Any

from scrapy.downloadermiddlewares.retry import RetryMiddleware
from scrapy.http import Request, Response
from scrapy.spiders import Spider
from scrapy.utils.response import response_status_message
from twisted.internet import defer, reactor
from twisted.internet.task import deferLater

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

# Signals indicating a soft-block or CAPTCHA page (must be specific enough
# to avoid false positives — "robot" alone matches <meta name="robots"> on every page)
CAPTCHA_SIGNALS = [
    "captcha",
    "cloudflare",
    "i am not a robot",
    "prove you are human",
    "access denied",
    "please verify",
    "are you a robot",
]


class RateLimitRetryMiddleware(RetryMiddleware):
    """
    Extends the built-in RetryMiddleware with:
      - Non-blocking async backoff via deferLater (5s → 15s → 30s)
      - Specific handling of 429 / 5xx rate-limit responses
      - Detection of soft-block / CAPTCHA pages

    Pourquoi deferLater et non time.sleep() ?
    -----------------------------------------
    Scrapy tourne sur le reactor Twisted (event loop mono-thread).
    time.sleep() bloque ce thread unique : TOUS les spiders et téléchargements
    actifs sont gelés pendant le délai, même ceux qui n'ont rien à voir avec
    le dealer limité. deferLater rend le contrôle au reactor immédiatement —
    le délai s'écoule en arrière-plan pendant que les autres requêtes continuent.
    """

    @defer.inlineCallbacks
    def process_response(
        self, request: Request, response: Response, spider: Spider
    ) -> Any:
        # ── Réponse de rate-limit ou d'erreur serveur transitoire ──────────
        if response.status in RETRY_HTTP_CODES:
            retry_count = request.meta.get("retry_times", 0)
            delay = BACKOFF_DELAYS[min(retry_count, len(BACKOFF_DELAYS) - 1)]

            logger.warning(
                "[%s] HTTP %d sur %s — pause async de %ds avant retry %d",
                spider.name,
                response.status,
                request.url,
                delay,
                retry_count + 1,
            )

            # deferLater rend le contrôle au reactor pendant `delay` secondes.
            # Les autres requêtes Scrapy continuent à s'exécuter normalement.
            yield deferLater(reactor, delay, lambda: None)

            retried = self._retry(
                request, response_status_message(response.status), spider
            )
            defer.returnValue(retried if retried is not None else response)

        # ── Détection soft-block / CAPTCHA ──────────────────────────────────
        body_lower = response.text.lower()
        if any(signal in body_lower for signal in CAPTCHA_SIGNALS):
            logger.error(
                "[%s] CAPTCHA/blocage détecté sur %s — concessionnaire ignoré",
                spider.name,
                request.url,
            )
            request.meta["captcha_detected"] = True
            defer.returnValue(response)

        # ── Réponse normale — déléguer au middleware parent ──────────────────
        result = super().process_response(request, response, spider)
        defer.returnValue(result)
