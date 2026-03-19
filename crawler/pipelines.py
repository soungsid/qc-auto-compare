"""
Scrapy item pipeline — batches items and POSTs them to the FastAPI backend.

The crawler NEVER writes directly to the database.
All data flows through POST /api/ingest/batch.
"""

import json
import logging
from typing import Any

import httpx
from scrapy import Spider
from scrapy.exceptions import DropItem

logger = logging.getLogger(__name__)


class BackendIngestPipeline:
    """
    Accumulates scraped vehicle items into a buffer and flushes them to the
    backend API in configurable batch sizes.

    Each item must be a dict matching the VehicleIngestPayload schema.
    The `ingest_source` field is injected if not already present.
    """

    def __init__(self, backend_url: str, batch_size: int) -> None:
        self.backend_url = backend_url
        self.batch_size = batch_size
        self._buffer: list[dict] = []
        self._stats = {"sent": 0, "created": 0, "updated": 0, "skipped": 0, "errors": 0}

    @classmethod
    def from_crawler(cls, crawler: Any) -> "BackendIngestPipeline":
        return cls(
            backend_url=crawler.settings.get(
                "BACKEND_INGEST_URL", "http://localhost:8000/api/ingest/batch"
            ),
            batch_size=crawler.settings.getint("CRAWLER_BATCH_SIZE", 50),
        )

    def open_spider(self, spider: Spider) -> None:
        logger.info(
            "[Pipeline] Opened — backend: %s | batch_size: %d",
            self.backend_url,
            self.batch_size,
        )
        self._buffer.clear()

    def close_spider(self, spider: Spider) -> None:
        """Flush remaining items when the spider closes."""
        if self._buffer:
            self._flush(spider)
        logger.info(
            "[Pipeline] Closed — total sent: %d | created: %d | updated: %d | "
            "skipped: %d | errors: %d",
            self._stats["sent"],
            self._stats["created"],
            self._stats["updated"],
            self._stats["skipped"],
            self._stats["errors"],
        )

    def process_item(self, item: dict, spider: Spider) -> dict:
        """Add item to buffer; flush when batch_size is reached."""
        if not isinstance(item, dict):
            raise DropItem(f"Expected dict, got {type(item)}")

        # Ensure source traceability
        item.setdefault("ingest_source", "crawler")

        self._buffer.append(item)

        if len(self._buffer) >= self.batch_size:
            self._flush(spider)

        return item

    def _flush(self, spider: Spider) -> None:
        """POST the current buffer to the backend and reset it."""
        if not self._buffer:
            return

        batch = list(self._buffer)
        self._buffer.clear()
        count = len(batch)

        payload = {"vehicles": batch}

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    self.backend_url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                data = response.json()

            self._stats["sent"] += count
            self._stats["created"] += data.get("created", 0)
            self._stats["updated"] += data.get("updated", 0)
            self._stats["skipped"] += data.get("skipped", 0)
            self._stats["errors"] += data.get("errors", 0)

            logger.info(
                "[Pipeline] Flushed %d items → created:%d updated:%d skipped:%d errors:%d",
                count,
                data.get("created", 0),
                data.get("updated", 0),
                data.get("skipped", 0),
                data.get("errors", 0),
            )

        except httpx.HTTPStatusError as exc:
            self._stats["errors"] += count
            logger.error(
                "[Pipeline] HTTP error %d flushing %d items to %s: %s",
                exc.response.status_code,
                count,
                self.backend_url,
                exc.response.text[:200],
            )
        except httpx.RequestError as exc:
            self._stats["errors"] += count
            logger.error(
                "[Pipeline] Connection error flushing %d items to %s: %s",
                count,
                self.backend_url,
                str(exc),
            )
