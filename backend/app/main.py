"""
QC Auto Compare — FastAPI application entry point.

Mounts all routers, configures CORS, and manages the application lifespan
(database initialization + APScheduler start/stop).
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.database import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler.

    Startup:
      - Initialize database tables (dev/test — use Alembic in production)
      - Start APScheduler background jobs

    Shutdown:
      - Gracefully stop the scheduler
    """
    # ---- Startup -----------------------------------------------------------
    await init_db()

    # Import here to avoid circular imports at module level
    from app.scheduler import start_scheduler, stop_scheduler
    await start_scheduler()

    yield

    # ---- Shutdown ----------------------------------------------------------
    await stop_scheduler()


def create_app() -> FastAPI:
    """Factory function that creates and configures the FastAPI application."""
    app = FastAPI(
        title="QC Auto Compare API",
        description=(
            "API REST pour comparer les inventaires de voitures neuves "
            "chez les concessionnaires directs au Québec."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ---- CORS --------------------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ---- Routers -----------------------------------------------------------
    from app.api.routes import crawl, dealers, ingest, vehicles

    app.include_router(vehicles.router, prefix="/api")
    app.include_router(dealers.router, prefix="/api")
    app.include_router(ingest.router, prefix="/api")
    app.include_router(crawl.router, prefix="/api")

    # ---- Health check ------------------------------------------------------
    @app.get("/health", tags=["Health"])
    async def health() -> dict:
        return {"status": "ok", "version": "1.0.0"}

    return app


app = create_app()
