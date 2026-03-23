"""
Sync dealers from dealers_registry.json into the backend DB via POST /api/dealers/bulk-upsert.

Usage (local):
    python sync_dealers.py --url http://localhost:8000

Usage (Docker — crawler container):
    python sync_dealers.py
    (uses BACKEND_INGEST_URL env var to derive the base URL)
"""

import json
import os
import sys
from pathlib import Path

import requests

REGISTRY_PATH = Path(__file__).parent / "dealers_registry.json"

# Derive base URL from BACKEND_INGEST_URL or default to localhost
_ingest_url = os.environ.get("BACKEND_INGEST_URL", "http://localhost:8000/api/ingest/batch")
DEFAULT_BASE_URL = _ingest_url.replace("/api/ingest/batch", "")


def sync_dealers(base_url: str = DEFAULT_BASE_URL) -> None:
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    active = [d for d in registry if d.get("active", False)]

    # Map registry fields → DealerCreate schema
    payload = []
    for d in active:
        payload.append({
            "slug": d["slug"],
            "name": d["name"],
            "brand": d["brand"],
            "city": d.get("city"),
            "address": d.get("address"),
            "phone": d.get("phone"),
            "website": d.get("website"),
            "inventory_url": d.get("inventory_url"),
            "is_active": True,
        })

    url = f"{base_url}/api/dealers/bulk-upsert"
    print(f"POSTing {len(payload)} dealers to {url} …")
    resp = requests.post(url, json=payload, timeout=30)
    resp.raise_for_status()
    print(f"Done: {resp.json()}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help="Backend base URL")
    args = parser.parse_args()
    sync_dealers(args.url)
