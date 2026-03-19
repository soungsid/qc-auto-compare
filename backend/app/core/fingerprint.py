"""
Fingerprint computation for vehicle deduplication.

The fingerprint is the single source of truth for idempotency across all
ingestion sources (crawler, Copilot, Cline, manual scripts, CSV imports).
"""

import hashlib
from typing import Optional


def normalize(s: Optional[str]) -> str:
    """Normalize a string for stable fingerprint computation."""
    if not s:
        return ""
    return s.strip().lower().replace(" ", "_")


def compute_fingerprint(
    vin: Optional[str],
    stock_number: Optional[str],
    dealer_slug: Optional[str],
    make: str,
    model: str,
    trim: Optional[str],
    year: int,
    condition: str,
) -> str:
    """
    Compute a deterministic SHA-256 fingerprint for a vehicle record.

    Priority strategy (descending):
    1. VIN alone       — globally unique 17-char identifier, absolute priority.
    2. dealer_slug + stock_number — unique within a dealer's stock.
    3. dealer_slug + make + model + trim + year + condition — composite fallback
       when VIN and stock_number are both absent.

    All components are normalized (strip, lower, spaces → underscore) before
    hashing to absorb formatting variations between ingestion sources.

    Args:
        vin:          Vehicle Identification Number (17 chars). Priority #1.
        stock_number: Dealer stock reference. Priority #2 (with dealer_slug).
        dealer_slug:  Stable dealer identifier (e.g. "nissan-anjou").
        make:         Vehicle make (e.g. "Nissan").
        model:        Vehicle model (e.g. "Kicks").
        trim:         Trim level (e.g. "SV"). May be None.
        year:         Model year (e.g. 2024).
        condition:    "new" | "used" | "certified".

    Returns:
        64-character hex SHA-256 digest.
    """
    if vin and len(vin.strip()) == 17:
        key = f"vin:{normalize(vin)}"
    elif stock_number and dealer_slug:
        key = f"stock:{normalize(dealer_slug)}:{normalize(stock_number)}"
    else:
        key = (
            f"composite:{normalize(dealer_slug)}:"
            f"{normalize(make)}:{normalize(model)}:"
            f"{normalize(trim)}:{year}:{normalize(condition)}"
        )

    return hashlib.sha256(key.encode("utf-8")).hexdigest()
