# QC Auto Compare

Système complet pour comparer les inventaires de voitures neuves chez les **concessionnaires directs** au Québec (Montréal et Québec City).

---

## ✅ État du projet — COMPLET

### Fichiers générés

**Backend (26 fichiers)**
```
backend/
├── Dockerfile
├── alembic.ini
├── pytest.ini
├── requirements.txt
├── .env.example
└── app/
    ├── main.py                       # App FastAPI + lifespan + CORS
    ├── scheduler.py                  # APScheduler (crawl 12h, stale 72h, alertes prix)
    ├── api/
    │   ├── deps.py
    │   └── routes/
    │       ├── vehicles.py           # GET /api/vehicles + compare
    │       ├── dealers.py            # CRUD concessionnaires
    │       ├── ingest.py             # POST /api/ingest/vehicle + /batch
    │       └── crawl.py              # Trigger crawl + statut + /api/stats
    ├── core/
    │   ├── config.py                 # Pydantic BaseSettings
    │   ├── fingerprint.py            # compute_fingerprint() — anti-duplication
    │   └── normalizer.py             # Normalisation drivetrain, prix, marques
    ├── db/
    │   ├── models.py                 # SQLAlchemy 2.x async (Dealer, Vehicle, LeaseOffer, IngestLog)
    │   ├── database.py               # Engine async, session factory
    │   └── migrations/
    │       ├── env.py                # Alembic async
    │       └── script.py.mako
    ├── schemas/
    │   ├── dealer.py
    │   ├── vehicle.py
    │   ├── lease_offer.py
    │   └── ingest.py                 # VehicleIngestPayload — schéma universel
    └── services/
        ├── ingest_service.py         # Upsert + déduplication + audit log
        └── search_service.py         # Filtres, tri, pagination
tests/
├── test_fingerprint.py
├── test_normalizer.py
└── test_ingest_service.py
```

**Crawler (13 fichiers)**
```
crawler/
├── Dockerfile
├── scrapy.cfg
├── requirements.txt
├── dealers_registry.json             # 17 concessionnaires QC
├── settings.py
├── middlewares.py                    # Rotation UA (20 agents), retry + backoff
├── pipelines.py                      # POST → /api/ingest/batch
└── spiders/
    ├── base_dealer_spider.py
    ├── nissan_qc_spider.py           # Anjou, Laval, Rive-Sud, Québec
    ├── toyota_qc_spider.py
    ├── hyundai_qc_spider.py
    ├── kia_qc_spider.py
    └── mitsubishi_qc_spider.py
```

**Frontend (14 fichiers)**
```
frontend/
├── Dockerfile
├── nginx.conf
├── index.html
├── package.json
├── vite.config.ts / tsconfig.json / tailwind.config.js
└── src/
    ├── main.tsx
    ├── types.ts
    ├── api.ts
    ├── styles.css
    ├── hooks/useVehicles.ts          # React Query — cache + refresh 10 min
    ├── components/
    │   ├── FilterBar.tsx
    │   ├── VehicleTable.tsx          # TanStack Table — tri, highlight top 5, export CSV
    │   └── LeaseOfferBadge.tsx
    └── pages/
        ├── ListingPage.tsx
        └── DealerPage.tsx
```

**Infra**
```
docker-compose.yml
.env.example
.gitignore
```

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      Sources d'ingestion                        │
│   Crawler Scrapy  │  Copilot/Cline/Claude  │  CSV / Manual     │
└────────┬──────────┴───────────┬────────────┴────────┬──────────┘
         │                      │                      │
         └──────────────────────▼──────────────────────┘
                     POST /api/ingest/vehicle
                     POST /api/ingest/batch
                              │
               ┌──────────────▼─────────────┐
               │      FastAPI Backend        │
               │   ingest_service.py         │  ← fingerprint + upsert
               │   search_service.py         │  ← filtres + pagination
               │   scheduler.py              │  ← crawls auto 12h
               └──────────────┬──────────────┘
                              │
               ┌──────────────▼─────────────┐
               │         PostgreSQL          │
               │  dealers / vehicles         │
               │  lease_offers / ingest_log  │
               └──────────────┬──────────────┘
                              │
               ┌──────────────▼─────────────┐
               │      React Frontend         │
               │  TanStack Table v8          │
               │  React Query v5             │
               └────────────────────────────┘
```

**Règle fondamentale :** le crawler et tous les outils externes ne touchent **jamais** la base directement. Tout passe par `POST /api/ingest`.

---

## Démarrage rapide

### Option A — Dev local (SQLite, sans Docker)

```bash
# Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000/docs

# Frontend (autre terminal)
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Option B — Docker Compose

```bash
cp .env.example .env          # Éditer les secrets
docker compose up -d          # Postgres + Backend + Frontend

# Crawl manuel
docker compose --profile crawl run crawler scrapy crawl nissan_qc_spider
```

---

## API d'ingestion — exemples

```bash
# Ingestion simple (manual / Copilot / Cline / Claude)
curl -X POST http://localhost:8000/api/ingest/vehicle \
  -H "Content-Type: application/json" \
  -d '{
    "ingest_source": "manual",
    "dealer_slug": "nissan-anjou",
    "make": "Nissan", "model": "Kicks", "trim": "S FWD",
    "year": 2024, "condition": "new",
    "vin": "3N1CP5CU4RL123456",
    "msrp": 26498, "sale_price": 25900
  }'
# → {"action":"created","fingerprint":"abc123...","vehicle_id":"uuid..."}
# 2e appel identique → {"action":"skipped",...}
# Avec sale_price différent → {"action":"updated",...}

# Batch
curl -X POST http://localhost:8000/api/ingest/batch \
  -H "Content-Type: application/json" \
  -d '{"vehicles":[{"ingest_source":"csv_import","make":"Toyota","model":"Corolla","year":2024,...}]}'

# Déclencher un crawl
curl -X POST http://localhost:8000/api/crawl/trigger \
  -d '{"spider_name":"nissan_qc_spider"}'

# Recherche filtrée
curl "http://localhost:8000/api/vehicles?make=Nissan&drivetrain=FWD&max_price=30000&sort=sale_price"
```

---

## Logique de fingerprint

```
Priorité 1 — VIN seul (17 car.)       → "vin:3n1cp5cu4rl123456"
Priorité 2 — dealer_slug + stock       → "stock:nissan-anjou:a12345"
Priorité 3 — composite fallback        → "composite:nissan-anjou:nissan:kicks:s:2024:new"
```

Le fingerprint est toujours calculé **côté serveur**. Les clients ne l'envoient jamais.

---

## Tests

```bash
cd backend
pytest tests/ -v
```

---

## Migrations Alembic

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite+aiosqlite:///./qc_auto.db` | URL de connexion DB |
| `SECRET_KEY` | `change-me` | Clé secrète app |
| `CORS_ORIGINS` | `http://localhost:3000` | Origines CORS autorisées |
| `BACKEND_INGEST_URL` | `http://localhost:8000/api/ingest/batch` | URL utilisée par le crawler |
| `FULL_CRAWL_INTERVAL_HOURS` | `12` | Fréquence crawls automatiques |
| `STALE_VEHICLE_HOURS` | `72` | Délai avant désactivation listing |
| `PRICE_ALERT_THRESHOLD_PCT` | `5` | Seuil alerte baisse de prix (%) |
| `CRAWLER_BATCH_SIZE` | `50` | Items par POST vers le backend |

---

## Stack

| Composant | Technologie |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.x async, Alembic |
| Base de données | PostgreSQL 16 (SQLite dev) |
| Crawler | Scrapy 2.x + scrapy-playwright, Tenacity |
| Scheduler | APScheduler 3.x (intégré au backend) |
| Frontend | React 18, Vite, TailwindCSS, TanStack Table v8, React Query v5 |
| Infra | Docker Compose |

---

## Concessionnaires (registre initial)

| Marque | Villes |
|---|---|
| Nissan | Anjou (Montréal), Laval, Brossard, Québec |
| Toyota | Centre-Ville Montréal, Laval, Québec |
| Hyundai | Montréal, Brossard, Québec |
| Kia | Montréal, Laval, Lévis |
| Mitsubishi | Montréal, Québec |
| Chevrolet | Montréal, Laval |

Pour ajouter un concessionnaire : éditer `crawler/dealers_registry.json`.
