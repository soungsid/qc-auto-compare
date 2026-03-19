"""
Universal ingestion endpoint — accepts vehicle data from any source.

All ingestion clients (crawler, AI tools, manual scripts, CSV imports)
POST to this endpoint. The fingerprint is always computed server-side.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.ingest import (
    BatchIngestPayload,
    BatchIngestResult,
    IngestResult,
    VehicleIngestPayload,
)
from app.services.ingest_service import ingest_batch, ingest_vehicle

router = APIRouter(prefix="/ingest", tags=["Ingestion"])


@router.post(
    "/vehicle",
    response_model=IngestResult,
    status_code=status.HTTP_200_OK,
    summary="Ingest a single vehicle",
    description=(
        "Universal endpoint for inserting or updating a vehicle record from any source. "
        "The server computes the fingerprint. Returns action: created | updated | skipped | error."
    ),
)
async def ingest_single_vehicle(
    payload: VehicleIngestPayload,
    db: AsyncSession = Depends(get_db),
) -> IngestResult:
    """Ingest a single vehicle — universal, source-agnostic."""
    result = await ingest_vehicle(payload, db)
    await db.commit()
    return result


@router.post(
    "/batch",
    response_model=BatchIngestResult,
    status_code=status.HTTP_200_OK,
    summary="Ingest a batch of vehicles (max 500)",
    description=(
        "Batch ingestion for the crawler pipeline and bulk imports. "
        "All vehicles in the batch are processed in a single transaction."
    ),
)
async def ingest_vehicle_batch(
    payload: BatchIngestPayload,
    db: AsyncSession = Depends(get_db),
) -> BatchIngestResult:
    """Ingest a batch of up to 500 vehicles atomically."""
    return await ingest_batch(payload, db)
