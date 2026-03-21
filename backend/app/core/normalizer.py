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

# Plausible price range for consumer vehicles (CAD).
# Rejects data-entry errors and concatenated numbers from scraping bugs.
_PRICE_MIN = 1_000.0
_PRICE_MAX = 500_000.0


def normalize_price(value: Optional[str | float | int]) -> Optional[float]:
    """
    Parse a price value from various formats to a float.

    Accepts:
      - Already numeric: 29_995  →  29995.0
      - String with currency symbols: "$29,995"  →  29995.0
      - String with spaces: "29 995 $"  →  29995.0
    Returns None for empty, unparseable, or implausible values
    (outside [{_PRICE_MIN:,.0f}, {_PRICE_MAX:,.0f}] CAD).
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        result = float(value)
    else:
        cleaned = _PRICE_RE.sub("", str(value)).strip()
        try:
            result = float(cleaned)
        except ValueError:
            return None
    if result <= 0:
        return None
    # Guard-rail: reject implausible prices
    return result if _PRICE_MIN <= result <= _PRICE_MAX else None


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


# ---------------------------------------------------------------------------
# Body type inference
# ---------------------------------------------------------------------------

# (make_lower, model_lower_substring) → body_type
_BODY_TYPE_RULES: list[tuple[Optional[str], str, str]] = [
    # Trucks / Camions
    (None, "tacoma", "Camion"),
    (None, "tundra", "Camion"),
    (None, "titan", "Camion"),
    (None, "frontier", "Camion"),
    (None, "ridgeline", "Camion"),
    (None, "ranger", "Camion"),
    (None, "f-150", "Camion"),
    (None, "f-250", "Camion"),
    (None, "silverado", "Camion"),
    (None, "sierra", "Camion"),
    (None, "colorado", "Camion"),
    (None, "canyon", "Camion"),
    (None, "ram 1500", "Camion"),
    (None, "ram 2500", "Camion"),
    # VUS (SUVs)
    (None, "tucson", "VUS"),
    (None, "santa fe", "VUS"),
    (None, "kona", "VUS"),
    (None, "ioniq 5", "VUS"),
    (None, "palisade", "VUS"),
    (None, "venue", "VUS"),
    (None, "nexo", "VUS"),
    (None, "sportage", "VUS"),
    (None, "sorento", "VUS"),
    (None, "telluride", "VUS"),
    (None, "seltos", "VUS"),
    (None, "niro", "VUS"),
    (None, "ev6", "VUS"),
    (None, "rav4", "VUS"),
    (None, "highlander", "VUS"),
    (None, "4runner", "VUS"),
    (None, "venza", "VUS"),
    (None, "sequoia", "VUS"),
    (None, "land cruiser", "VUS"),
    (None, "bz4x", "VUS"),
    (None, "ariya", "VUS"),
    (None, "rogue", "VUS"),
    (None, "murano", "VUS"),
    (None, "pathfinder", "VUS"),
    (None, "armada", "VUS"),
    (None, "kicks", "VUS"),
    (None, "qashqai", "VUS"),
    (None, "outlander", "VUS"),
    (None, "eclipse cross", "VUS"),
    (None, "rvr", "VUS"),
    (None, "cx-3", "VUS"),
    (None, "cx-30", "VUS"),
    (None, "cx-5", "VUS"),
    (None, "cx-50", "VUS"),
    (None, "cx-9", "VUS"),
    (None, "cx-90", "VUS"),
    (None, "cr-v", "VUS"),
    (None, "hr-v", "VUS"),
    (None, "pilot", "VUS"),
    (None, "passport", "VUS"),
    (None, "cr-v", "VUS"),
    (None, "escape", "VUS"),
    (None, "bronco", "VUS"),
    (None, "bronco sport", "VUS"),
    (None, "edge", "VUS"),
    (None, "explorer", "VUS"),
    (None, "expedition", "VUS"),
    (None, "equinox", "VUS"),
    (None, "traverse", "VUS"),
    (None, "trailblazer", "VUS"),
    (None, "trax", "VUS"),
    (None, "terrain", "VUS"),
    (None, "acadia", "VUS"),
    (None, "yukon", "VUS"),
    (None, "tahoe", "VUS"),
    (None, "suburban", "VUS"),
    (None, "cherokee", "VUS"),
    (None, "grand cherokee", "VUS"),
    (None, "compass", "VUS"),
    (None, "wrangler", "VUS"),
    (None, "forester", "VUS"),
    (None, "outback", "VUS"),
    (None, "crosstrek", "VUS"),
    (None, "ascent", "VUS"),
    (None, "tiguan", "VUS"),
    (None, "atlas", "VUS"),
    (None, "q3", "VUS"),
    (None, "q5", "VUS"),
    (None, "q7", "VUS"),
    (None, "x1", "VUS"),
    (None, "x3", "VUS"),
    (None, "x5", "VUS"),
    (None, "glc", "VUS"),
    (None, "gle", "VUS"),
    (None, "rx", "VUS"),
    (None, "nx", "VUS"),
    (None, "ux", "VUS"),
    (None, "mdx", "VUS"),
    (None, "rdx", "VUS"),
    (None, "qx50", "VUS"),
    (None, "qx60", "VUS"),
    (None, "qx80", "VUS"),
    # Minivans / Fourgonnettes
    (None, "sienna", "Fourgonnette"),
    (None, "odyssey", "Fourgonnette"),
    (None, "pacifica", "Fourgonnette"),
    (None, "carnival", "Fourgonnette"),
    # Berlines (Sedans)
    (None, "elantra", "Berline"),
    (None, "ioniq 6", "Berline"),
    (None, "sonata", "Berline"),
    (None, "azera", "Berline"),
    (None, "forte", "Berline"),
    (None, "k5", "Berline"),
    (None, "stinger", "Berline"),
    (None, "corolla", "Berline"),
    (None, "camry", "Berline"),
    (None, "avalon", "Berline"),
    (None, "altima", "Berline"),
    (None, "sentra", "Berline"),
    (None, "versa", "Berline"),
    (None, "maxima", "Berline"),
    (None, "lancer", "Berline"),
    (None, "galant", "Berline"),
    (None, "accord", "Berline"),
    (None, "civic", "Berline"),
    (None, "insight", "Berline"),
    (None, "fusion", "Berline"),
    (None, "impala", "Berline"),
    (None, "malibu", "Berline"),
    (None, "jetta", "Berline"),
    (None, "passat", "Berline"),
    (None, "3 series", "Berline"),
    (None, "5 series", "Berline"),
    (None, "c-class", "Berline"),
    (None, "e-class", "Berline"),
    (None, "a4", "Berline"),
    (None, "a6", "Berline"),
    (None, "model 3", "Berline"),
    (None, "model s", "Berline"),
    # Hayon (Hatchbacks)
    (None, "leaf", "Hayon"),
    (None, "fit", "Hayon"),
    (None, "yaris", "Hayon"),
    (None, "prius", "Hayon"),
    (None, "golf", "Hayon"),
    (None, "mazda3 sport", "Hayon"),
    (None, "model y", "Hayon"),
    # Coupé
    (None, "mustang", "Coupé"),
    (None, "camaro", "Coupé"),
    (None, "challenger", "Coupé"),
    (None, "charger", "Coupé"),
    (None, "corvette", "Coupé"),
    (None, "86", "Coupé"),
    (None, "gr86", "Coupé"),
    (None, "brz", "Coupé"),
    (None, "supra", "Coupé"),
]


def infer_body_type(make: Optional[str], model: Optional[str]) -> Optional[str]:
    """
    Infer body_type from make and model when not explicitly provided.
    Returns None if no match found.
    """
    if not model:
        return None
    make_lower = (make or "").strip().lower()
    model_lower = model.strip().lower()
    for rule_make, model_sub, body_type in _BODY_TYPE_RULES:
        if rule_make and rule_make != make_lower:
            continue
        if model_sub in model_lower:
            return body_type
    return None


# ---------------------------------------------------------------------------
# Fuel type inference
# ---------------------------------------------------------------------------

# Models that are purely electric
_ELECTRIC_MODELS = {
    "ioniq 5", "ioniq 6", "ev6", "leaf", "ariya", "bz4x",
    "model 3", "model s", "model x", "model y",
    "nexo",  # hydrogen but treated as electric
}

# Models that are hybrid/PHEV
_HYBRID_MODELS = {
    "prius", "rav4 hybrid", "highlander hybrid", "venza", "sienna",
    "camry hybrid", "corolla hybrid", "kona electric", "niro ev",
    "niro hybrid", "niro phev", "outlander phev", "tucson hybrid",
    "tucson phev", "santa fe hybrid", "santa fe phev",
}

# Models that are plug-in hybrid
_PHEV_SUBSTRINGS = {"phev", "plug-in", "hybride rechargeable", "recharge"}

# Substrings indicating electric
_ELECTRIC_SUBSTRINGS = {"electric", "électrique", "ev", "bev", "ioniq 5", "ioniq 6"}


def infer_fuel_type(make: Optional[str], model: Optional[str], trim: Optional[str] = None) -> Optional[str]:
    """
    Infer fuel_type from make, model and trim when not explicitly provided.
    Returns one of: Électrique | Hybride | Essence | None.
    """
    if not model:
        return None
    model_lower = model.strip().lower()
    trim_lower = (trim or "").strip().lower()
    full = f"{model_lower} {trim_lower}".strip()

    # Check PHEV first (more specific than hybrid)
    for sub in _PHEV_SUBSTRINGS:
        if sub in full:
            return "Hybride"

    # Check electric substrings
    for sub in _ELECTRIC_SUBSTRINGS:
        if sub in full:
            return "Électrique"

    # Check known electric models
    if model_lower in _ELECTRIC_MODELS:
        return "Électrique"

    # Check known hybrid models
    if model_lower in _HYBRID_MODELS:
        return "Hybride"
    for hybrid_model in _HYBRID_MODELS:
        if hybrid_model in full:
            return "Hybride"

    return None

