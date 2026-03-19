"""Application configuration via Pydantic BaseSettings."""

from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra fields in .env
    )

    # Application
    app_env: str = "development"
    secret_key: str = "change-me-in-production"
    debug: bool = True

    # Database (SQLite for local dev, PostgreSQL for production)
    database_url: str = "sqlite+aiosqlite:///./qc_auto.db"
    
    # Optional MongoDB support for Emergent platform
    mongo_url: Optional[str] = None
    db_name: Optional[str] = None

    # CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    # Crawler
    backend_ingest_url: str = "http://localhost:8000/api/ingest/batch"
    crawl_delay_min: int = 2
    crawl_delay_max: int = 5
    crawler_batch_size: int = 50

    # Scheduler
    full_crawl_interval_hours: int = 12
    stale_vehicle_hours: int = 72
    price_alert_threshold_pct: float = 5.0


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
