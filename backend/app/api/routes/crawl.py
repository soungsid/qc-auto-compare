"""Crawl management endpoints — trigger and status."""

import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.models import Dealer, Vehicle

router = APIRouter(prefix="/crawl", tags=["Crawl"])

# In-memory crawl status (replace with Redis in production)
_crawl_status: dict[str, object] = {
    "running": False,
    "started_at": None,
    "finished_at": None,
    "spider": None,
    "dealer_slug": None,
    "error": None,
}


class CrawlTriggerRequest(BaseModel):
    spider_name: str  # e.g. "nissan_qc_spider"
    dealer_slug: Optional[str] = None  # None = crawl all dealers for this spider


class CrawlStatusResponse(BaseModel):
    running: bool
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    spider: Optional[str]
    dealer_slug: Optional[str]
    error: Optional[str]


class StatsResponse(BaseModel):
    total_vehicles: int
    active_vehicles: int
    total_dealers: int
    vehicles_by_source: dict[str, int]
    last_updated_at: Optional[datetime]


async def _run_spider(spider_name: str, dealer_slug: Optional[str]) -> None:
    """
    Launch Scrapy spider as a subprocess.

    In production this would be dispatched to a Celery queue or a dedicated
    crawler process. Here we use asyncio.create_subprocess_exec as a simple
    approach compatible with the monorepo dev setup.
    """
    global _crawl_status
    _crawl_status.update({
        "running": True,
        "started_at": datetime.now(timezone.utc),
        "finished_at": None,
        "spider": spider_name,
        "dealer_slug": dealer_slug,
        "error": None,
    })

    cmd = ["scrapy", "crawl", spider_name]
    if dealer_slug:
        cmd += ["-a", f"dealer_slug={dealer_slug}"]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd="/app/crawler",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            _crawl_status["error"] = stderr.decode()[:500]
    except Exception as exc:
        _crawl_status["error"] = str(exc)
    finally:
        _crawl_status["running"] = False
        _crawl_status["finished_at"] = datetime.now(timezone.utc)


@router.post("/trigger", response_model=CrawlStatusResponse)
async def trigger_crawl(
    payload: CrawlTriggerRequest,
    background_tasks: BackgroundTasks,
) -> CrawlStatusResponse:
    """
    Trigger a Scrapy spider in the background.

    Returns immediately — use GET /crawl/status to poll progress.
    """
    if _crawl_status.get("running"):
        raise HTTPException(
            status_code=409,
            detail="A crawl is already running. Wait for it to finish.",
        )

    background_tasks.add_task(_run_spider, payload.spider_name, payload.dealer_slug)

    return CrawlStatusResponse(
        running=True,
        started_at=datetime.now(timezone.utc),
        finished_at=None,
        spider=payload.spider_name,
        dealer_slug=payload.dealer_slug,
        error=None,
    )


@router.get("/status", response_model=CrawlStatusResponse)
async def crawl_status() -> CrawlStatusResponse:
    """Return the status of the most recent crawl."""
    return CrawlStatusResponse(**_crawl_status)  # type: ignore[arg-type]


@router.get("/stats", response_model=StatsResponse, tags=["Stats"])
async def get_stats(db: AsyncSession = Depends(get_db)) -> StatsResponse:
    """Return global platform statistics."""
    total_vehicles = await db.scalar(select(func.count(Vehicle.id))) or 0
    active_vehicles = (
        await db.scalar(
            select(func.count(Vehicle.id)).where(Vehicle.is_active == True)  # noqa: E712
        )
        or 0
    )
    total_dealers = await db.scalar(select(func.count(Dealer.id))) or 0

    # Vehicles grouped by ingest_source
    source_rows = await db.execute(
        select(Vehicle.ingest_source, func.count(Vehicle.id))
        .group_by(Vehicle.ingest_source)
    )
    vehicles_by_source = {row[0]: row[1] for row in source_rows}

    last_updated_row = await db.scalar(
        select(func.max(Vehicle.updated_at))
    )

    return StatsResponse(
        total_vehicles=total_vehicles,
        active_vehicles=active_vehicles,
        total_dealers=total_dealers,
        vehicles_by_source=vehicles_by_source,
        last_updated_at=last_updated_row,
    )


# ---------------------------------------------------------------------------
# BUG #7: Reconciliation endpoint for soft-deleting stale vehicles
# ---------------------------------------------------------------------------

class ReconcileRequest(BaseModel):
    """Request body for reconciliation endpoint."""
    dealer_slug: str
    seen_fingerprints: list[str]


class ReconcileResponse(BaseModel):
    """Response from reconciliation endpoint."""
    dealer_slug: str
    total_for_dealer: int
    deactivated_count: int
    kept_active_count: int


@router.post("/reconcile", response_model=ReconcileResponse)
async def reconcile_dealer_inventory(
    payload: ReconcileRequest,
    db: AsyncSession = Depends(get_db),
) -> ReconcileResponse:
    """
    BUG #7 FIX: Mark vehicles as inactive if they weren't seen in the latest crawl.
    
    This endpoint should be called after a complete crawl of a dealer's inventory.
    Any vehicles belonging to that dealer that are NOT in the seen_fingerprints list
    will be marked as is_active=False (soft delete).
    
    This prevents sold vehicles from appearing in search results indefinitely.
    """
    # Find the dealer
    dealer_result = await db.execute(
        select(Dealer).where(Dealer.slug == payload.dealer_slug)
    )
    dealer = dealer_result.scalar_one_or_none()
    
    if not dealer:
        raise HTTPException(
            status_code=404,
            detail=f"Dealer with slug '{payload.dealer_slug}' not found."
        )
    
    # Count total active vehicles for this dealer before reconciliation
    total_before = await db.scalar(
        select(func.count(Vehicle.id))
        .where(Vehicle.dealer_id == dealer.id)
        .where(Vehicle.is_active == True)
    ) or 0
    
    # Deactivate vehicles not in the seen list
    if payload.seen_fingerprints:
        # Update vehicles that are active but NOT in the seen list
        from sqlalchemy import update
        result = await db.execute(
            update(Vehicle)
            .where(Vehicle.dealer_id == dealer.id)
            .where(Vehicle.is_active == True)
            .where(Vehicle.fingerprint.notin_(payload.seen_fingerprints))
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )
        deactivated_count = result.rowcount
    else:
        # If no fingerprints provided, deactivate ALL vehicles for this dealer
        from sqlalchemy import update
        result = await db.execute(
            update(Vehicle)
            .where(Vehicle.dealer_id == dealer.id)
            .where(Vehicle.is_active == True)
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )
        deactivated_count = result.rowcount
    
    await db.commit()
    
    kept_active = total_before - deactivated_count
    
    return ReconcileResponse(
        dealer_slug=payload.dealer_slug,
        total_for_dealer=total_before,
        deactivated_count=deactivated_count,
        kept_active_count=kept_active,
    )
