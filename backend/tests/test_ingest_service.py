"""
Integration tests for the ingest service using an in-memory SQLite database.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.database import init_db
from app.db.models import Base, Vehicle
from app.schemas.ingest import BatchIngestPayload, VehicleIngestPayload
from app.services.ingest_service import ingest_batch, ingest_vehicle

# Use in-memory SQLite for tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db():
    """Provide a fresh async DB session for each test."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


def make_payload(**kwargs) -> VehicleIngestPayload:
    defaults = dict(
        ingest_source="manual",
        dealer_slug="nissan-anjou",
        make="Nissan",
        model="Kicks",
        trim="S",
        year=2024,
        condition="new",
        vin="3N1CP5CU4RL123456",
        sale_price=25900.0,
        msrp=26498.0,
    )
    defaults.update(kwargs)
    return VehicleIngestPayload(**defaults)


class TestIngestVehicle:
    @pytest.mark.asyncio
    async def test_creates_new_vehicle(self, db: AsyncSession):
        payload = make_payload()
        result = await ingest_vehicle(payload, db)
        await db.commit()

        assert result.action == "created"
        assert result.fingerprint is not None
        assert result.vehicle_id is not None

    @pytest.mark.asyncio
    async def test_second_ingest_same_vin_is_skipped(self, db: AsyncSession):
        payload = make_payload()
        r1 = await ingest_vehicle(payload, db)
        await db.commit()
        r2 = await ingest_vehicle(payload, db)
        await db.commit()

        assert r1.action == "created"
        assert r2.action == "skipped"
        assert r1.fingerprint == r2.fingerprint

    @pytest.mark.asyncio
    async def test_price_change_triggers_update(self, db: AsyncSession):
        payload = make_payload(sale_price=25900.0)
        r1 = await ingest_vehicle(payload, db)
        await db.commit()

        updated_payload = make_payload(sale_price=24500.0)
        r2 = await ingest_vehicle(updated_payload, db)
        await db.commit()

        assert r1.action == "created"
        assert r2.action == "updated"

    @pytest.mark.asyncio
    async def test_different_vins_create_separate_records(self, db: AsyncSession):
        r1 = await ingest_vehicle(make_payload(vin="3N1CP5CU4RL111111"), db)
        await db.commit()
        r2 = await ingest_vehicle(make_payload(vin="3N1CP5CU4RL222222"), db)
        await db.commit()

        assert r1.action == "created"
        assert r2.action == "created"
        assert r1.vehicle_id != r2.vehicle_id

    @pytest.mark.asyncio
    async def test_ingest_source_is_recorded(self, db: AsyncSession):
        from sqlalchemy import select
        payload = make_payload(ingest_source="crawler")
        result = await ingest_vehicle(payload, db)
        await db.commit()

        vehicle = await db.scalar(select(Vehicle).where(Vehicle.id == result.vehicle_id))
        assert vehicle is not None
        assert vehicle.ingest_source == "crawler"

    @pytest.mark.asyncio
    async def test_drivetrain_normalized_on_insert(self, db: AsyncSession):
        from sqlalchemy import select
        payload = make_payload(drivetrain="traction avant")
        result = await ingest_vehicle(payload, db)
        await db.commit()

        vehicle = await db.scalar(select(Vehicle).where(Vehicle.id == result.vehicle_id))
        assert vehicle.drivetrain == "FWD"


class TestBatchIngest:
    @pytest.mark.asyncio
    async def test_batch_creates_multiple_vehicles(self, db: AsyncSession):
        batch = BatchIngestPayload(vehicles=[
            make_payload(vin="3N1CP5CU4RL111111", model="Kicks"),
            make_payload(vin="3N1CP5CU4RL222222", model="Versa"),
        ])
        result = await ingest_batch(batch, db)

        assert result.total == 2
        assert result.created == 2
        assert result.errors == 0

    @pytest.mark.asyncio
    async def test_batch_deduplicates_within_batch(self, db: AsyncSession):
        """Same VIN appearing twice in one batch should create once, skip once."""
        payload = make_payload(vin="3N1CP5CU4RL123456")
        batch = BatchIngestPayload(vehicles=[payload, payload])
        result = await ingest_batch(batch, db)

        assert result.created == 1
        assert result.skipped == 1
