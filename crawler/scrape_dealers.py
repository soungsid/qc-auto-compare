#!/usr/bin/env python3
"""
Direct HTTP scraper for Nissan Quebec City dealerships.

Bypasses Scrapy/Playwright (blocked by CAPTCHA) by scraping server-rendered
HTML + embedded JSON-LD structured data.

Supported platforms:
  - Magnetis  : Ste-Foy Nissan
  - D2C Media : Capitale Nissan, Beauport Nissan, Paquet Nissan Lévis

Usage:
    pip install requests beautifulsoup4 lxml
    python scrape_dealers.py

Environment variables:
    API_URL   Override default ingest endpoint (default: https://auto.canadaquebec.ca/api/ingest/batch)
    DELAY     Seconds between requests (default: 1.5)
"""
import os
import re
import time
import json
import requests
from bs4 import BeautifulSoup

API_URL = os.getenv("API_URL", "https://auto.canadaquebec.ca/api/ingest/batch")
BATCH_SIZE = 100
DELAY = float(os.getenv("DELAY", "1.5"))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
}

NISSAN_BASE_MODELS = [
    "Kicks", "Versa", "Sentra", "Altima", "Maxima",
    "Rogue", "Murano", "Pathfinder", "Armada",
    "Frontier", "Titan", "Leaf", "Ariya", "Z",
    "GT-R", "Qashqai", "Micra",
]

DEALERS = [
    {
        "slug": "ste-foy-nissan",
        "name": "Ste-Foy Nissan",
        "city": "Quebec",
        "platform": "magnetis",
        "base_url": "https://www.stefoynissan.com",
        "new_pages": [
            "https://www.stefoynissan.com/inventaire/neuf/",
            "https://www.stefoynissan.com/inventaire/neuf/?page=2",
            "https://www.stefoynissan.com/inventaire/neuf/?page=3",
        ],
        "used_pages": [
            "https://www.stefoynissan.com/inventaire/occasion/",
            "https://www.stefoynissan.com/inventaire/occasion/?page=2",
        ],
    },
    {
        "slug": "capitale-nissan",
        "name": "Capitale Nissan",
        "city": "Quebec",
        "platform": "d2cmedia",
        "base_url": "https://www.capitalenissan.ca",
        "new_search": "https://www.capitalenissan.ca/neufs/inventaire/recherche.html",
        "used_search": "https://www.capitalenissan.ca/occasion/recherche.html",
        "new_prefix": "/neufs/",
        "used_prefix": "/occasion/",
    },
    {
        "slug": "beauport-nissan",
        "name": "Beauport Nissan",
        "city": "Quebec",
        "platform": "d2cmedia",
        "base_url": "https://www.beauportnissan.com",
        "new_search": "https://www.beauportnissan.com/neufs/inventaire/recherche.html",
        "used_search": "https://www.beauportnissan.com/occasion/recherche.html",
        "new_prefix": "/neufs/",
        "used_prefix": "/occasion/",
    },
    {
        "slug": "paquet-nissan-levis",
        "name": "Paquet Nissan",
        "city": "Levis",
        "platform": "d2cmedia",
        "base_url": "https://www.paquetnissan.com",
        "new_search": "https://www.paquetnissan.com/neufs/inventaire/recherche.html",
        "used_search": "https://www.paquetnissan.com/occasion/recherche.html",
        "new_prefix": "/neufs/",
        "used_prefix": "/occasion/",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_page(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        time.sleep(DELAY)
        return r
    except Exception as e:
        print(f"    ERR {url}: {e}")
        return None


def extract_year(text):
    m = re.search(r"\b(20[12][0-9])\b", str(text))
    return int(m.group()) if m else None


def extract_base_model(model_full):
    """'Kicks Play' -> ('Kicks', 'Play'),  'Rogue' -> ('Rogue', None)"""
    for bm in NISSAN_BASE_MODELS:
        if model_full.lower().startswith(bm.lower()):
            trim = model_full[len(bm):].strip() or None
            return bm, trim
    parts = model_full.strip().split(None, 1)
    return parts[0], (parts[1] if len(parts) > 1 else None)


def extract_trim_from_ld_name(ld_name):
    """'Nissan Kicks 2026 S Avant' -> ('Kicks', 'S Avant')"""
    name = re.sub(r"\bNissan\b", "", ld_name, flags=re.I).strip()
    name = re.sub(r"\b20[12][0-9]\b", "", name).strip()
    name = re.sub(r"\s+", " ", name).strip()
    if not name:
        return None, None
    return extract_base_model(name)


_PRICE_MIN = 1_000
_PRICE_MAX = 500_000


def clean_price(text):
    """
    Extract the first plausible car price from a text string.

    Handles French formatting ("37 399 $", "37\xa0399") and JSON-LD plain integers.
    Returns None for composite strings (e.g. "37 849 · PDSF: 41 349") — takes only
    the first number — and rejects implausible values outside [1000, 500000].
    """
    if not text:
        return None
    # Normalize: remove currency symbols, replace non-breaking spaces with regular ones
    normalized = str(text).replace("\xa0", " ").replace("\u202f", " ")
    normalized = re.sub(r"[\$€,]", "", normalized).strip()
    # Extract the first contiguous numeric token.
    # First alternative: French thousands-separated format like "37 399" (space + 3-digit groups).
    # Second alternative: plain integer like "37849".
    m = re.search(r"\d{1,3}(?:\s\d{3})+(?:[.]\d{1,2})?|\d+(?:[.]\d{1,2})?", normalized)
    if not m:
        return None
    num_str = re.sub(r"\s", "", m.group())
    try:
        val = float(num_str)
        return val if _PRICE_MIN <= val <= _PRICE_MAX else None
    except ValueError:
        return None


def parse_d2c_card_extras(desc_text):
    """
    Parse color, transmission and drivetrain from D2C Media card description.

    Example desc: "3,500 KM . Auto., Ext: Bronze canyon métallisé (Taupe),
                   Int: Noir # de stock: 6651EA Moteur: 2.0 L ..."
    """
    extras = {}

    ext_m = re.search(r"Ext[:\s]+([^,#\n]+)", desc_text)
    if ext_m:
        extras["color_ext"] = ext_m.group(1).strip()

    int_m = re.search(r"Int[:\s]+([^,#\n]+)", desc_text)
    if int_m:
        extras["color_int"] = int_m.group(1).strip()

    tl = desc_text.lower()
    if re.search(r"\bcvt\b", tl):
        extras["transmission"] = "CVT"
    elif re.search(r"\bauto", tl):
        extras["transmission"] = "Automatique"
    elif re.search(r"\bman\b|\bmanuel", tl):
        extras["transmission"] = "Manuelle"

    drive_m = re.search(
        r"\b(traction avant|traction int[eé]grale|propulsion|awd|4x4|4rm|int[eé]grale)\b",
        tl
    )
    if drive_m:
        d = drive_m.group(1)
        if "avant" in d:
            extras["drivetrain"] = "FWD"
        elif any(x in d for x in ["intégrale", "integral", "awd", "4x4", "4rm"]):
            extras["drivetrain"] = "AWD"
        elif "prop" in d:
            extras["drivetrain"] = "RWD"

    return extras


def parse_magnetis_extras(desc_text):
    """Fallback description parser for Magnetis platform."""
    extras = {}
    tl = desc_text.lower()
    color_m = re.search(
        r"(?:en|couleur[:\s]+|de couleur\s+)"
        r"(rouge|blanc|bleu|gris|noir|argent|brun|orange|vert|beige|jaune|violet|or|silver|white|black|red|blue|grey|gray|green)",
        tl
    )
    if color_m:
        extras["color_ext"] = color_m.group(1).capitalize()

    trans_m = re.search(r"\b(cvt|automatique|manuelle)\b", tl)
    if trans_m:
        t = trans_m.group(1)
        extras["transmission"] = "CVT" if t == "cvt" else ("Automatique" if "auto" in t else "Manuelle")

    drive_m = re.search(r"\b(traction avant|traction int[eé]grale|propulsion|awd|4x4|4rm|int[eé]grale)\b", tl)
    if drive_m:
        d = drive_m.group(1)
        if "avant" in d:
            extras["drivetrain"] = "FWD"
        elif any(x in d for x in ["intégrale", "integral", "awd", "4x4", "4rm"]):
            extras["drivetrain"] = "AWD"
        elif "prop" in d:
            extras["drivetrain"] = "RWD"
    return extras


# ---------------------------------------------------------------------------
# Magnetis platform (Ste-Foy Nissan)
# ---------------------------------------------------------------------------

def scrape_magnetis_page(url, dealer, condition):
    r = get_page(url)
    if not r or r.status_code != 200:
        return []

    soup = BeautifulSoup(r.text, "lxml")
    vehicles = []

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            for obj in (data if isinstance(data, list) else [data]):
                graph = obj.get("@graph", [obj]) if isinstance(obj, dict) else [obj]
                for item in graph:
                    if item.get("@type") not in ("Car", "Vehicle"):
                        continue
                    name = item.get("name", "")
                    year = extract_year(name)
                    model, trim = extract_trim_from_ld_name(name)
                    if not year or not model:
                        continue
                    offers = item.get("offers", {})
                    price = clean_price(offers.get("price")) if isinstance(offers, dict) else None
                    listing_url = (offers.get("url") if isinstance(offers, dict) else None)
                    image = item.get("image")
                    image_url = (image[0] if isinstance(image, list) else image) if image else None
                    stock = item.get("sku") or item.get("mpn", "").split()[-1] or None

                    mileage = 0
                    if condition == "used":
                        mil = item.get("mileageFromOdometer", {})
                        if isinstance(mil, dict):
                            try:
                                raw = float(mil.get("value", 0) or 0)
                                mileage = int(raw) if 0 <= raw <= 999_999 else 0
                            except (ValueError, TypeError):
                                pass

                    vehicles.append({
                        "ingest_source": "copilot",
                        "dealer_slug": dealer["slug"],
                        "dealer_name": dealer["name"],
                        "dealer_city": dealer["city"],
                        "make": "Nissan",
                        "model": model,
                        "trim": trim,
                        "year": year,
                        "condition": condition,
                        "vin": item.get("vehicleIdentificationNumber"),
                        "stock_number": str(stock) if stock else None,
                        "msrp": price,
                        "sale_price": price,
                        "color_ext": item.get("color"),
                        "listing_url": listing_url,
                        "image_url": image_url,
                        "mileage_km": mileage,
                    })
        except Exception:
            pass

    return vehicles


def scrape_magnetis_dealer(dealer):
    all_vehicles = {}
    for condition, pages in [("new", dealer.get("new_pages", [])), ("used", dealer.get("used_pages", []))]:
        for url in pages:
            vehicles = scrape_magnetis_page(url, dealer, condition)
            before = len(all_vehicles)
            for v in vehicles:
                key = v.get("vin") or v.get("stock_number") or f"{v['year']}-{v['model']}-{v.get('trim')}"
                all_vehicles[key] = v
            added = len(all_vehicles) - before
            print(f"    {condition} {url.rsplit('/', 2)[-2]}: {len(vehicles)} found, {added} new")
            if not vehicles:
                break
    return list(all_vehicles.values())


# ---------------------------------------------------------------------------
# D2C Media platform (Capitale, Beauport, Paquet)
# ---------------------------------------------------------------------------

def discover_model_pages(search_url, base_url, url_prefix):
    r = get_page(search_url)
    if not r or r.status_code != 200:
        return []

    soup = BeautifulSoup(r.text, "lxml")
    model_pages = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        if (href.startswith(url_prefix)
                and href.endswith(".html")
                and "-id" not in href
                and "inventaire" not in href
                and re.search(r"\d{4}", href)
                and href not in seen):
            seen.add(href)
            model_pages.append(base_url + href)

    return model_pages


def build_listing_url(base_url, sku, make, model_raw, year_str, condition):
    """Construct individual vehicle detail URL from SKU."""
    def slug(s):
        return re.sub(r"\s+", "_", s.strip())
    if condition == "new":
        return f"{base_url}/neufs/inventaire/{slug(make)}-{slug(model_raw)}-{year_str}-id{sku}.html"
    else:
        return f"{base_url}/occasion/{slug(make)}-{slug(model_raw)}-{year_str}-id{sku}.html"


def scrape_d2c_page(url, dealer, condition):
    r = get_page(url)
    if not r or r.status_code != 200:
        return []

    soup = BeautifulSoup(r.text, "lxml")
    base_url = dealer["base_url"]

    # Map sku -> JSON-LD Vehicle object
    ld_by_sku = {}
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            for obj in (data if isinstance(data, list) else [data]):
                graph = obj.get("@graph", [obj]) if isinstance(obj, dict) else [obj]
                for item in graph:
                    if item.get("@type") == "Vehicle":
                        sku = str(item.get("sku") or item.get("productID") or "")
                        if sku:
                            ld_by_sku[sku] = item
        except Exception:
            pass

    vehicles_by_key = {}

    for card in soup.select(".carBoxWrapper, .carBoxOuter"):
        img_div = card.select_one("[data-make][data-model][data-year]")
        inp = card.select_one("input[name=vehicledata][data-carid]")
        if not (img_div or inp):
            continue

        el = img_div or inp
        make = el.get("data-make", "Nissan").strip()
        model_raw = el.get("data-model", "").strip()
        year_str = el.get("data-year", "").strip()
        stock = el.get("data-nostock", "").strip()
        sku = (inp.get("data-carid") or "") if inp else ""

        year = extract_year(year_str)
        if not (model_raw and year):
            continue

        # Prefer .divTrim element for accurate trim
        trim_el = card.select_one(".divTrim")
        trim = trim_el.get_text(strip=True) if trim_el else None

        # Fallback: extract trim from model name (e.g. "Kicks Play" -> "Play")
        if not trim:
            _, trim = extract_base_model(model_raw)

        # Determine base model (strip trim suffix from model_raw)
        model, _ = extract_base_model(model_raw)

        listing_url = build_listing_url(base_url, sku, make, model_raw, year_str, condition)

        price_el = card.select_one(".carPrice")
        if price_el:
            # Prefer the specific price span to avoid composite text like "37 849 · PDSF: 41 349"
            span = price_el.select_one(".dollarsigned, .p-base, .price-value")
            price = clean_price((span or price_el).get_text(strip=True))
        else:
            price = None

        vin = None
        image_url = None
        if sku in ld_by_sku:
            ld = ld_by_sku[sku]
            vin = ld.get("vehicleIdentificationNumber")
            if not price:
                offers = ld.get("offers", {})
                if isinstance(offers, dict):
                    price = clean_price(offers.get("price"))
            imgs = ld.get("image", [])
            image_url = imgs[0] if isinstance(imgs, list) and imgs else (imgs or None)

        mileage = 0
        if condition == "used":
            if sku in ld_by_sku:
                mil = ld_by_sku[sku].get("mileageFromOdometer", {})
                if isinstance(mil, dict):
                    try:
                        raw = float(mil.get("value", 0) or 0)
                        mileage = int(raw) if 0 <= raw <= 999_999 else 0
                    except (ValueError, TypeError):
                        pass
            # Also try to parse from card description
            if not mileage:
                desc_el = card.select_one(".carDescriptionContent")
                if desc_el:
                    # Match first well-formatted km number: "28 999 KM" or "28,999 KM"
                    km_m = re.search(r"(\d{1,3}(?:[ ,]\d{3})*)\s*KM", desc_el.get_text())
                    if km_m:
                        try:
                            val = int(re.sub(r"[^\d]", "", km_m.group(1)))
                            mileage = val if 0 <= val <= 999_999 else 0
                        except ValueError:
                            pass

        # Parse color/transmission/drivetrain from card description
        desc_el = card.select_one(".carDescriptionContent")
        extras = parse_d2c_card_extras(desc_el.get_text(" ", strip=True)) if desc_el else {}

        key = vin or sku or f"{year}-{model_raw}-{stock}"
        if key not in vehicles_by_key:
            vehicles_by_key[key] = {
                "ingest_source": "copilot",
                "dealer_slug": dealer["slug"],
                "dealer_name": dealer["name"],
                "dealer_city": dealer["city"],
                "make": make,
                "model": model,
                "trim": trim or None,
                "year": year,
                "condition": condition,
                "vin": vin,
                "stock_number": stock or None,
                "msrp": price,
                "sale_price": price,
                "listing_url": listing_url,
                "image_url": image_url,
                "mileage_km": mileage,
                **extras,
            }

    return list(vehicles_by_key.values())


def scrape_d2c_dealer(dealer):
    all_vehicles = {}
    base_url = dealer["base_url"]

    for condition, search_url, url_prefix in [
        ("new",  dealer.get("new_search", ""),  dealer.get("new_prefix", "/neufs/")),
        ("used", dealer.get("used_search", ""), dealer.get("used_prefix", "/occasion/")),
    ]:
        if not search_url:
            continue

        print(f"  [{condition.upper()}] Discovering model pages...")
        model_pages = discover_model_pages(search_url, base_url, url_prefix)
        print(f"  Found {len(model_pages)} model pages + 1 search page")

        for page_url in [search_url] + model_pages:
            vehicles = scrape_d2c_page(page_url, dealer, condition)
            before = len(all_vehicles)
            for v in vehicles:
                key = v.get("vin") or v.get("stock_number") or f"{v['year']}-{v['model']}-{v.get('trim')}"
                all_vehicles[key] = v
            added = len(all_vehicles) - before
            print(f"    {page_url.split('/')[-1][:50]}: {len(vehicles)} scraped, {added} new => total {len(all_vehicles)}")
            time.sleep(0.3)

    return list(all_vehicles.values())


# ---------------------------------------------------------------------------
# Ingest
# ---------------------------------------------------------------------------

def ingest_batch(vehicles):
    try:
        r = requests.post(API_URL, json={"vehicles": vehicles}, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"  Ingest error: {e}")
        return {}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    grand_total = []

    for dealer in DEALERS:
        print("=" * 60)
        print(f"=== {dealer['name']} ({dealer['platform']}) ===")
        if dealer["platform"] == "magnetis":
            vehicles = scrape_magnetis_dealer(dealer)
        else:
            vehicles = scrape_d2c_dealer(dealer)

        print(f"  -> {len(vehicles)} unique vehicles")
        grand_total.extend(vehicles)

    print("=" * 60)
    print(f"GRAND TOTAL: {len(grand_total)} vehicles")

    total_created = total_updated = total_skipped = total_errors = 0
    batches = [grand_total[i:i + BATCH_SIZE] for i in range(0, len(grand_total), BATCH_SIZE)]
    for idx, batch in enumerate(batches, 1):
        result = ingest_batch(batch)
        c = result.get("created", 0)
        u = result.get("updated", 0)
        s = result.get("skipped", 0)
        e = result.get("errors", 0)
        total_created += c
        total_updated += u
        total_skipped += s
        total_errors += e
        print(f"  Batch {idx}/{len(batches)}: created={c} updated={u} skipped={s} errors={e}")

    print("=" * 60)
    print(f"SUMMARY: processed={len(grand_total)} created={total_created} updated={total_updated} skipped={total_skipped} errors={total_errors}")


if __name__ == "__main__":
    main()
