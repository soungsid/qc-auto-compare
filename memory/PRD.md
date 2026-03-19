# QC Auto Compare - Product Requirements Document

## Project Overview
Comparateur de véhicules neufs et usagés au Québec, permettant aux utilisateurs de comparer les prix des concessionnaires directement.

## Architecture

### Stack Technique
- **Backend**: FastAPI (Python 3.11) + SQLAlchemy async + SQLite (dev) / PostgreSQL (prod)
- **Frontend**: React 18 + TypeScript + Vite + TanStack Query/Table + Tailwind CSS
- **Crawler**: Scrapy + Playwright (headless browser) pour les sites JS-heavy
- **Database**: SQLite pour dev local, PostgreSQL pour Docker Compose / production

### Structure du Projet
```
/app/
├── backend/           # FastAPI API
│   ├── app/
│   │   ├── api/routes/   # vehicles, dealers, ingest, crawl, filters
│   │   ├── core/         # config, fingerprint, normalizer
│   │   ├── db/           # models (with indexes), database
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # business logic (search, ingest with upsert)
│   │   └── scheduler.py  # APScheduler jobs
│   └── server.py      # Emergent bridge
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # useVehicles, useTheme, useFiltersFromUrl
│   │   ├── pages/        # ListingPage
│   │   └── types.ts
│   └── tailwind.config.js
├── crawler/           # Scrapy spiders
└── docker-compose.yml
```

## APIs Implémentées

### Vehicles
- `GET /api/vehicles` - Liste paginée avec filtres (year_min, year_max, mileage_max, etc.)
- `GET /api/vehicles/{id}` - Détail véhicule
- `GET /api/vehicles/compare` - Comparaison multi-véhicules

### Dealers
- `GET /api/dealers` - Liste concessionnaires

### Ingestion
- `POST /api/ingest/vehicle` - Ingestion unitaire
- `POST /api/ingest/batch` - Ingestion batch (max 500)

### Filters & Stats
- `GET /api/filters/options` - **BUG #3**: Options dynamiques depuis la DB
- `GET /api/crawl/stats` - Statistiques globales
- `POST /api/crawl/reconcile` - **BUG #7**: Soft delete véhicules disparus

## What's Been Implemented

### Session 1: Initial Setup & Fixes
- [x] Réparation Tailwind (ajout postcss.config.js)
- [x] Dark mode complet (Système/Clair/Sombre)
- [x] Configuration Emergent (vite.config.ts, server.py bridge)

### Session 2: Phase 1 (Bugs Critiques)
- [x] **BUG #1**: Tri serveur-side (manualSorting: true)
- [x] **BUG #2**: CHANGEABLE_FIELDS étendu + validation condition vs URL
- [x] **BUG #4**: Filtres year_min, year_max, mileage_max
- [x] **FEATURE #1**: FingerprintBadge + colonnes avancées toggle
- [x] **FEATURE #2**: Vue Cartes (VehicleCard + VehicleGrid)
- [x] **AMÉLIORATION #3**: ConditionBadge en français (Neuf/Occasion/Certifié)

### Session 2: Phase 2 (Performance & UX)
- [x] **BUG #3**: Filtres dynamiques via `/api/filters/options`
- [x] **BUG #5**: Index DB (condition, make, year, sale_price, is_active, dealer_id)
- [x] **BUG #6**: Upsert lease_offers (unique constraint + update logic)
- [x] **BUG #7**: Réconciliation endpoint `/api/crawl/reconcile` (soft delete)
- [x] **AMÉLIORATION #4**: Persistance filtres dans URL (useFiltersFromUrl hook)

### Tests: Backend 100%, Frontend 100%

## Prioritized Backlog

### P0 - Critical
- Aucun item actuellement

### P1 - High Priority
- [ ] Crawler automation (APScheduler jobs)
- [ ] Alertes de prix (email/webhook quand baisse > X%)
- [ ] Authentification utilisateur

### P2 - Medium Priority
- [ ] Historique des prix (timeline chart)
- [ ] Mode comparaison side-by-side
- [ ] Favoris/watchlist

### P3 - Nice to Have
- [ ] Mobile app (React Native)
- [ ] Notifications push
- [ ] Analyse de tendances de prix

## Next Tasks
1. Configurer APScheduler pour crawl automatique
2. Ajouter plus de spiders pour d'autres marques
3. Implémenter les alertes de prix
4. Mode comparaison avec l'endpoint existant `/api/vehicles/compare`

## Technical Decisions
- **Server-side sorting**: React Table avec `manualSorting: true`
- **URL sync**: Hook natif sans react-router (window.history.pushState)
- **Upsert strategy**: Unique constraint sur (vehicle_id, term_months, payment_frequency, offer_type)
- **Soft delete**: Champ `is_active` avec endpoint de réconciliation post-crawl
- **Dynamic filters**: Endpoint dédié pour éviter le hardcoding côté frontend
