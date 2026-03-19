"""Scrapy project settings for the QC Auto Compare crawler."""

import os

BOT_NAME = "qc_auto_crawler"
SPIDER_MODULES = ["spiders"]
NEWSPIDER_MODULE = "spiders"

# ---- Politeness ------------------------------------------------------------
ROBOTSTXT_OBEY = True
DOWNLOAD_DELAY = int(os.getenv("CRAWL_DELAY_MIN", "2"))
RANDOMIZE_DOWNLOAD_DELAY = True
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 2
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0
AUTOTHROTTLE_DEBUG = False
CONCURRENT_REQUESTS = 4
CONCURRENT_REQUESTS_PER_DOMAIN = 2

# ---- Playwright (JS rendering) ---------------------------------------------
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}
PLAYWRIGHT_LAUNCH_OPTIONS = {
    "headless": True,
    "args": ["--no-sandbox", "--disable-dev-shm-usage"],
}
PLAYWRIGHT_DEFAULT_NAVIGATION_TIMEOUT = 30_000  # ms
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"

# ---- Middlewares -----------------------------------------------------------
DOWNLOADER_MIDDLEWARES = {
    "scrapy.downloadermiddlewares.useragent.UserAgentMiddleware": None,
    "middlewares.RotatingUserAgentMiddleware": 400,
    "middlewares.RateLimitRetryMiddleware": 550,
}

# ---- Pipelines -------------------------------------------------------------
ITEM_PIPELINES = {
    "pipelines.BackendIngestPipeline": 300,
}

# ---- Backend URL -----------------------------------------------------------
BACKEND_INGEST_URL = os.getenv(
    "BACKEND_INGEST_URL", "http://localhost:8000/api/ingest/batch"
)
CRAWLER_BATCH_SIZE = int(os.getenv("CRAWLER_BATCH_SIZE", "50"))

# ---- Logging ---------------------------------------------------------------
LOG_LEVEL = "INFO"
LOG_FORMAT = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"

# ---- Cache (dev only) -------------------------------------------------------
# HTTPCACHE_ENABLED = True
# HTTPCACHE_EXPIRATION_SECS = 3600
# HTTPCACHE_DIR = ".scrapy_cache"

# ---- Feed exports (optional debug) -----------------------------------------
# FEEDS = {"output.json": {"format": "json"}}
