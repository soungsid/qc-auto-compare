"""Crawl management endpoints — trigger and status."""

import os
import logging
from datetime import datetime, timezone
from typing import Optional

import docker
import docker.errors
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.models import Dealer, Vehicle

log = logging.getLogger(__name__)

router = APIRouter(prefix="/crawl", tags=["Crawl"])

# All known spiders
KNOWN_SPIDERS = [
    "nissan_qc", "honda_qc", "vw_qc", "ford_qc", "mazda_qc",
    "subaru_qc", "toyota_qc", "hyundai_qc", "kia_qc",
    "chevrolet_qc", "mitsubishi_qc",
]

# Docker config from env
_PROJECT = os.environ.get("COMPOSE_PROJECT_NAME", "qc-auto-compare-org")
_CRAWLER_IMAGE = f"{_PROJECT}-crawler"
_CRAWLER_NETWORK = os.environ.get("CRAWLER_NETWORK", f"{_PROJECT}_qc-auto-network")
_BACKEND_INGEST_URL = os.environ.get("BACKEND_INGEST_URL", "http://backend:8000/api/ingest/batch")


def _docker_client() -> docker.DockerClient:
    try:
        return docker.from_env()
    except docker.errors.DockerException as exc:
        raise HTTPException(status_code=503, detail=f"Docker socket unavailable: {exc}")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CrawlRunRequest(BaseModel):
    spiders: list[str] = []  # empty = all spiders


class CrawlRunResponse(BaseModel):
    started: list[str]
    skipped_already_running: list[str]
    unknown: list[str]


class CrawlJob(BaseModel):
    container_id: str
    spider: str
    status: str
    started_at: Optional[str]


class StatsResponse(BaseModel):
    total_vehicles: int
    active_vehicles: int
    total_dealers: int
    vehicles_by_source: dict[str, int]
    last_updated_at: Optional[datetime]


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _crawler_label(spider: str) -> str:
    return f"qc-auto-crawler-{spider}"


def _running_spiders(client: docker.DockerClient) -> set[str]:
    """Return the set of spider names whose crawler containers are currently running."""
    running: set[str] = set()
    for c in client.containers.list():
        lbl = c.labels.get("qc.auto.spider")
        if lbl:
            running.add(lbl)
    return running


# ---------------------------------------------------------------------------
# POST /api/crawl/run
# ---------------------------------------------------------------------------

@router.post("/run", response_model=CrawlRunResponse)
def run_crawl(payload: CrawlRunRequest) -> CrawlRunResponse:
    """
    Start one or more Scrapy crawlers in Docker containers.

    - Pass `spiders: ["nissan_qc", "honda_qc"]` to run specific spiders.
    - Pass an empty list (or omit) to run ALL known spiders.

    Each spider gets its own detached container. Already-running spiders are skipped.
    """
    requested = payload.spiders if payload.spiders else KNOWN_SPIDERS
    unknown = [s for s in requested if s not in KNOWN_SPIDERS]
    to_run = [s for s in requested if s in KNOWN_SPIDERS]

    client = _docker_client()
    already_running = _running_spiders(client)

    started: list[str] = []
    skipped: list[str] = []

    for spider in to_run:
        if spider in already_running:
            skipped.append(spider)
            continue
        try:
            client.containers.run(
                image=_CRAWLER_IMAGE,
                command=["scrapy", "crawl", spider],
                detach=True,
                remove=True,
                name=_crawler_label(spider),
                network=_CRAWLER_NETWORK,
                environment={
                    "BACKEND_INGEST_URL": _BACKEND_INGEST_URL,
                },
                labels={"qc.auto.spider": spider},
            )
            started.append(spider)
            log.info("Started crawler container for spider: %s", spider)
        except docker.errors.ImageNotFound:
            raise HTTPException(
                status_code=500,
                detail=f"Crawler image '{_CRAWLER_IMAGE}' not found. Run: docker compose build crawler"
            )
        except docker.errors.APIError as exc:
            log.error("Failed to start spider %s: %s", spider, exc)
            skipped.append(spider)

    return CrawlRunResponse(started=started, skipped_already_running=skipped, unknown=unknown)


# ---------------------------------------------------------------------------
# GET /api/crawl/jobs
# ---------------------------------------------------------------------------

@router.get("/jobs", response_model=list[CrawlJob])
def get_crawl_jobs() -> list[CrawlJob]:
    """List all currently running crawler containers."""
    client = _docker_client()
    jobs: list[CrawlJob] = []
    for c in client.containers.list():
        spider = c.labels.get("qc.auto.spider")
        if not spider:
            continue
        jobs.append(CrawlJob(
            container_id=c.short_id,
            spider=spider,
            status=c.status,
            started_at=c.attrs.get("State", {}).get("StartedAt"),
        ))
    return jobs


# ---------------------------------------------------------------------------
# GET /api/crawl/spiders  — list available spiders
# ---------------------------------------------------------------------------

@router.get("/spiders", response_model=list[str])
def list_spiders() -> list[str]:
    """Return the list of all known spider names."""
    return KNOWN_SPIDERS


# ---------------------------------------------------------------------------
# GET /api/crawl/stats
# ---------------------------------------------------------------------------

class ReconcileRequest(BaseModel):
    dealer_slug: str
    seen_fingerprints: list[str]


class ReconcileResponse(BaseModel):
    dealer_slug: str
    total_for_dealer: int
    deactivated_count: int
    kept_active_count: int


@router.get("/stats", response_model=StatsResponse, tags=["Stats"])
async def get_stats(db: AsyncSession = Depends(get_db)) -> StatsResponse:
    """Return global platform statistics."""
    total_vehicles = await db.scalar(select(func.count(Vehicle.id))) or 0
    active_vehicles = (
        await db.scalar(
            select(func.count(Vehicle.id)).where(Vehicle.is_active == True)  # noqa: E712
        ) or 0
    )
    total_dealers = await db.scalar(select(func.count(Dealer.id))) or 0

    source_rows = await db.execute(
        select(Vehicle.ingest_source, func.count(Vehicle.id)).group_by(Vehicle.ingest_source)
    )
    vehicles_by_source = {row[0]: row[1] for row in source_rows}

    last_updated_row = await db.scalar(select(func.max(Vehicle.updated_at)))

    return StatsResponse(
        total_vehicles=total_vehicles,
        active_vehicles=active_vehicles,
        total_dealers=total_dealers,
        vehicles_by_source=vehicles_by_source,
        last_updated_at=last_updated_row,
    )


@router.post("/reconcile", response_model=ReconcileResponse)
async def reconcile_dealer_inventory(
    payload: ReconcileRequest,
    db: AsyncSession = Depends(get_db),
) -> ReconcileResponse:
    """Mark vehicles as inactive if they weren't seen in the latest crawl."""
    from sqlalchemy import update

    dealer_result = await db.execute(select(Dealer).where(Dealer.slug == payload.dealer_slug))
    dealer = dealer_result.scalar_one_or_none()
    if not dealer:
        raise HTTPException(status_code=404, detail=f"Dealer '{payload.dealer_slug}' not found.")

    total_before = await db.scalar(
        select(func.count(Vehicle.id))
        .where(Vehicle.dealer_id == dealer.id)
        .where(Vehicle.is_active == True)
    ) or 0

    if payload.seen_fingerprints:
        result = await db.execute(
            update(Vehicle)
            .where(Vehicle.dealer_id == dealer.id)
            .where(Vehicle.is_active == True)
            .where(Vehicle.fingerprint.notin_(payload.seen_fingerprints))
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )
    else:
        result = await db.execute(
            update(Vehicle)
            .where(Vehicle.dealer_id == dealer.id)
            .where(Vehicle.is_active == True)
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )
    deactivated_count = result.rowcount
    await db.commit()

    return ReconcileResponse(
        dealer_slug=payload.dealer_slug,
        total_for_dealer=total_before,
        deactivated_count=deactivated_count,
        kept_active_count=total_before - deactivated_count,
    )

