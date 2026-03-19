"""
Data normalization utilities for incoming vehicle payloads.

Ensures consistent canonical values regardless of ingestion source.
"""

import re
from typing import Optional


# ---------------------------------------------------------------------------
# Drivetrain normalization
# ---------------------------------------------------------------------------

_DRIVETRAIN_MAP: dict[str, str] = {
    # FWD variants
    "fwd": "FWD",
    "traction avant": "FWD",
    "2wd": "FWD",
    "2rm": "FWD",
    "front wheel drive": "FWD",
    "front-wheel drive": "FWD",
    # AWD variants
    "awd": "AWD",
    "4x4": "AWD",
    "intégral": "AWD",
    "integral": "AWD",
    "all wheel drive": "AWD",
    "all-wheel drive": "AWD",
    "quattro": "AWD",
    "xdrive": "AWD",
    "4matic": "AWD",
    # RWD variants
    "rwd": "RWD",
    "propulsion": "RWD",
    "rear wheel drive": "RWD",
    "rear-wheel drive": "RWD",
    # 4WD variants
    "4wd": "4WD",
    "4x4 temps réel": "4WD",
    "4rm": "4WD",
    "part-time 4wd": "4WD",
}


def normalize_drivetrain(value: Optional[str]) -> Optional[str]:
    """
    Normalize a drivetrain string to one of: FWD | AWD | RWD | 4WD.

    Returns None if the value is absent or unrecognized.
    """
    if not value:
        return None
    key = value.strip().lower()
    return _DRIVETRAIN_MAP.get(key)


# ---------------------------------------------------------------------------
# Transmission normalization
# ---------------------------------------------------------------------------

_TRANSMISSION_MAP: dict[str, str] = {
    "automatic": "automatic",
    "automatique": "automatic",
    "auto": "automatic",
    "cvt": "automatic",
    "at": "automatic",
    "manual": "manual",
    "manuelle": "manual",
    "mt": "manual",
    "6-speed manual": "manual",
    "5-speed manual": "manual",
}


def normalize_transmission(value: Optional[str]) -> Optional[str]:
    """Normalize a transmission string to 'automatic' or 'manual'."""
    if not value:
        return None
    key = value.strip().lower()
    for pattern, result in _TRANSMISSION_MAP.items():
        if pattern in key:
            return result
    return None


# ---------------------------------------------------------------------------
# Price normalization
# ---------------------------------------------------------------------------

_PRICE_RE = re.compile(r"[\$,\s]")


def normalize_price(value: Optional[str | float | int]) -> Optional[float]:
    """
    Parse a price value from various formats to a float.

    Accepts:
      - Already numeric: 29_995  →  29995.0
      - String with currency symbols: "$29,995"  →  29995.0
      - String with spaces: "29 995 $"  →  29995.0
    Returns None for empty or unparseable values.
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value) if value > 0 else None
    cleaned = _PRICE_RE.sub("", str(value)).strip()
    try:
        result = float(cleaned)
        return result if result > 0 else None
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Payment frequency normalization
# ---------------------------------------------------------------------------

_FREQUENCY_MAP: dict[str, str] = {
    "monthly": "monthly",
    "mensuel": "monthly",
    "mensuelle": "monthly",
    "/mois": "monthly",
    "par mois": "monthly",
    "biweekly": "biweekly",
    "bi-weekly": "biweekly",
    "toutes les deux semaines": "biweekly",
    "aux 2 semaines": "biweekly",
    "weekly": "weekly",
    "hebdomadaire": "weekly",
    "par semaine": "weekly",
}


def normalize_payment_frequency(value: Optional[str]) -> Optional[str]:
    """Normalize payment frequency to 'monthly' | 'biweekly' | 'weekly'."""
    if not value:
        return None
    key = value.strip().lower()
    for pattern, result in _FREQUENCY_MAP.items():
        if pattern in key:
            return result
    return None


# ---------------------------------------------------------------------------
# Make normalization
# ---------------------------------------------------------------------------

_MAKE_MAP: dict[str, str] = {
    "nissan": "Nissan",
    "toyota": "Toyota",
    "hyundai": "Hyundai",
    "kia": "Kia",
    "mitsubishi": "Mitsubishi",
    "chevrolet": "Chevrolet",
    "chevy": "Chevrolet",
    "gm": "Chevrolet",
    "honda": "Honda",
    "ford": "Ford",
    "subaru": "Subaru",
    "mazda": "Mazda",
    "volkswagen": "Volkswagen",
    "vw": "Volkswagen",
    "bmw": "BMW",
    "mercedes": "Mercedes-Benz",
    "mercedes-benz": "Mercedes-Benz",
    "audi": "Audi",
    "jeep": "Jeep",
    "dodge": "Dodge",
    "ram": "Ram",
    "chrysler": "Chrysler",
    "gmc": "GMC",
    "buick": "Buick",
    "cadillac": "Cadillac",
    "lexus": "Lexus",
    "acura": "Acura",
    "infiniti": "Infiniti",
    "volvo": "Volvo",
    "porsche": "Porsche",
    "land rover": "Land Rover",
    "jaguar": "Jaguar",
    "tesla": "Tesla",
    "genesis": "Genesis",
}


def normalize_make(value: Optional[str]) -> Optional[str]:
    """Normalize a vehicle make to its canonical capitalized form."""
    if not value:
        return None
    key = value.strip().lower()
    return _MAKE_MAP.get(key, value.strip().title())


# ---------------------------------------------------------------------------
# Condition normalization
# ---------------------------------------------------------------------------

_CONDITION_MAP: dict[str, str] = {
    "new": "new",
    "neuf": "new",
    "neuve": "new",
    "nouveau": "new",
    "used": "used",
    "usagé": "used",
    "usage": "used",
    "occasion": "used",
    "certified": "certified",
    "certifié": "certified",
    "certifie": "certified",
    "cpo": "certified",
}


def normalize_condition(value: Optional[str]) -> str:
    """Normalize vehicle condition to 'new' | 'used' | 'certified'. Defaults to 'new'."""
    if not value:
        return "new"
    key = value.strip().lower()
    return _CONDITION_MAP.get(key, "new")


# ---------------------------------------------------------------------------
# VIN normalization
# ---------------------------------------------------------------------------

def normalize_vin(value: Optional[str]) -> Optional[str]:
    """
    Normalize a VIN: strip whitespace, uppercase, validate length.
    Returns None if not a valid 17-character VIN.
    """
    if not value:
        return None
    vin = value.strip().upper().replace("-", "").replace(" ", "")
    return vin if len(vin) == 17 else None
