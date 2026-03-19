"""
APScheduler background jobs.

Jobs:
  - full_crawl        : trigger all active spiders every 12 hours
  - stale_check       : mark vehicles inactive if not seen in 72 hours
  - price_alerts      : log WARNING when a price drops more than 5%
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, update

from app.core.config import get_settings
from app.db.database import AsyncSessionLocal
from app.db.models import Vehicle

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = AsyncIOScheduler(timezone="America/Montreal")

# Spiders available in the crawler project
ALL_SPIDERS = [
    "nissan_qc_spider",
    "toyota_qc_spider",
    "hyundai_qc_spider",
    "kia_qc_spider",
    "mitsubishi_qc_spider",
]


# ---------------------------------------------------------------------------
# Job: Full crawl
# ---------------------------------------------------------------------------

async def trigger_all_spiders() -> None:
    """
    Launch every registered Scrapy spider sequentially.

    Each spider POSTs its results to /api/ingest/batch, so this function
    only needs to start the subprocess and wait for completion.
    """
    logger.info("[Scheduler] Starting full crawl — %d spiders", len(ALL_SPIDERS))

    for spider_name in ALL_SPIDERS:
        try:
            logger.info("[Scheduler] Launching spider: %s", spider_name)
            proc = await asyncio.create_subprocess_exec(
                "scrapy", "crawl", spider_name,
                cwd="/app/crawler",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                logger.error(
                    "[Scheduler] Spider %s exited with code %d: %s",
                    spider_name,
                    proc.returncode,
                    stderr.decode()[:300],
                )
            else:
                logger.info("[Scheduler] Spider %s completed successfully", spider_name)
        except Exception as exc:
            logger.exception("[Scheduler] Failed to launch spider %s: %s", spider_name, exc)

    logger.info("[Scheduler] Full crawl finished")


# ---------------------------------------------------------------------------
# Job: Stale vehicle deactivation
# ---------------------------------------------------------------------------

async def deactivate_stale_vehicles() -> None:
    """
    Mark vehicles as inactive when they haven't been seen by any ingestion
    source for more than STALE_VEHICLE_HOURS hours.

    This handles the case where a dealer removes a vehicle from their site.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.stale_vehicle_hours)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            update(Vehicle)
            .where(Vehicle.is_active == True)  # noqa: E712
            .where(Vehicle.last_seen_at < cutoff)
            .values(is_active=False)
            .returning(Vehicle.id)
        )
        deactivated_ids = result.scalars().all()
        await db.commit()

    if deactivated_ids:
        logger.warning(
            "[Scheduler] Deactivated %d stale vehicles (not seen since %s)",
            len(deactivated_ids),
            cutoff.isoformat(),
        )
    else:
        logger.info("[Scheduler] No stale vehicles found")


# ---------------------------------------------------------------------------
# Job: Price drop alerts
# ---------------------------------------------------------------------------

async def check_price_alerts() -> None:
    """
    Log a WARNING for every active vehicle whose sale_price has dropped
    by more than PRICE_ALERT_THRESHOLD_PCT percent since it was created.

    In a full implementation this would send notifications (email, Slack…).
    """
    threshold = settings.price_alert_threshold_pct / 100.0

    async with AsyncSessionLocal() as db:
        stmt = select(Vehicle).where(
            Vehicle.is_active == True,  # noqa: E712
            Vehicle.msrp.is_not(None),
            Vehicle.sale_price.is_not(None),
        )
        result = await db.execute(stmt)
        vehicles = result.scalars().all()

    for vehicle in vehicles:
        if vehicle.msrp and vehicle.sale_price:
            drop = (vehicle.msrp - vehicle.sale_price) / vehicle.msrp
            if drop >= threshold:
                logger.warning(
                    "[PriceAlert] %s %s %s (%s) — MSRP %.0f$ → Sale %.0f$ (%.1f%% off) @ %s",
                    vehicle.year,
                    vehicle.make,
                    vehicle.model,
                    vehicle.trim or "—",
                    vehicle.msrp,
                    vehicle.sale_price,
                    drop * 100,
                    vehicle.dealer_id,
                )


# ---------------------------------------------------------------------------
# Scheduler lifecycle
# ---------------------------------------------------------------------------

async def start_scheduler() -> None:
    """Register all jobs and start the scheduler (called on app startup)."""
    scheduler.add_job(
        trigger_all_spiders,
        trigger="interval",
        hours=settings.full_crawl_interval_hours,
        id="full_crawl",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        deactivate_stale_vehicles,
        trigger="interval",
        hours=6,
        id="stale_check",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        check_price_alerts,
        trigger="interval",
        hours=1,
        id="price_alerts",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    logger.info(
        "[Scheduler] Started — full_crawl every %dh, stale_check every 6h, price_alerts every 1h",
        settings.full_crawl_interval_hours,
    )


async def stop_scheduler() -> None:
    """Gracefully shut down the scheduler (called on app shutdown)."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Stopped")
