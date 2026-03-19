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
│   │   ├── api/routes/   # vehicles, dealers, ingest, crawl
│   │   ├── core/         # config, fingerprint, normalizer
│   │   ├── db/           # models, database
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # business logic (search, ingest)
│   │   └── scheduler.py  # APScheduler jobs
│   └── server.py      # Emergent bridge
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/   # UI components
│   │   │   ├── VehicleTable.tsx
│   │   │   ├── VehicleCard.tsx
│   │   │   ├── VehicleGrid.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── ConditionBadge.tsx
│   │   │   ├── FingerprintBadge.tsx
│   │   │   ├── LeaseOfferBadge.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── hooks/        # useVehicles, useTheme
│   │   ├── pages/        # ListingPage
│   │   └── types.ts      # TypeScript types
│   └── tailwind.config.js
├── crawler/           # Scrapy spiders
│   ├── spiders/         # Base + brand-specific spiders
│   ├── pipelines.py     # Backend ingest pipeline
│   └── dealers_registry.json
├── docs/              # Documentation
│   └── llm_fix_prompt.md # Bug/feature specs
└── docker-compose.yml
```

## User Personas
1. **Acheteur de voiture**: Cherche à comparer les prix entre concessionnaires
2. **Administrateur**: Gère les crawlers et les sources de données

## Core Requirements (Static)

### Fonctionnalités Essentielles
- [x] Comparaison de prix de véhicules
- [x] Filtrage par marque, modèle, condition, traction, ville, prix, année, kilométrage
- [x] Export CSV des résultats
- [x] Support dark/light mode (toggle + détection système)
- [x] API d'ingestion universelle (crawler, manuel, CSV)
- [x] Vue Tableau et vue Cartes (toggle persistant)
- [x] Tri serveur-side sur toutes les colonnes triables

### APIs Implémentées
- `GET /health` - Health check
- `GET /api/vehicles` - Liste paginée avec filtres (year_min, year_max, mileage_max, etc.)
- `GET /api/vehicles/{id}` - Détail véhicule
- `GET /api/vehicles/compare` - Comparaison multi-véhicules
- `GET /api/dealers` - Liste concessionnaires
- `GET /api/crawl/stats` - Statistiques
- `POST /api/ingest/vehicle` - Ingestion unitaire
- `POST /api/ingest/batch` - Ingestion batch (max 500)

## What's Been Implemented

### 2024-03-19 - Session 1: Initial Setup & Fixes
- [x] Réparation Tailwind (ajout postcss.config.js)
- [x] Ajout dark mode complet avec toggle (Système/Clair/Sombre)
- [x] Configuration vite.config.ts pour Emergent
- [x] Bridge server.py pour compatibilité supervisor
- [x] Mise à jour dépendances (pydantic 2.12.5, fastapi 0.135.1)

### 2024-03-19 - Session 2: Phase 1 (Bugs Critiques)
- [x] **BUG #1**: Tri serveur-side (manualSorting: true, onSortingChange → onFiltersChange)
- [x] **BUG #2**: CHANGEABLE_FIELDS étendu (condition, drivetrain, transmission, mileage_km)
- [x] **BUG #2**: Validation condition vs URL (_validate_condition_from_url)
- [x] **BUG #4**: Filtres year_min, year_max, mileage_max dans backend + frontend

### 2024-03-19 - Session 2: Phase 2 (Features)
- [x] **FEATURE #1**: FingerprintBadge (8 chars, copie, tooltip)
- [x] **FEATURE #1**: Colonnes avancées (toggle + localStorage)
- [x] **FEATURE #2**: Vue Cartes (VehicleCard + VehicleGrid)
- [x] **FEATURE #2**: Toggle Tableau/Cartes (persisté localStorage)
- [x] **FEATURE #2**: Contrôles tri pour vue cartes (dropdown + asc/desc)
- [x] **AMÉLIORATION #3**: ConditionBadge en français (Neuf/Occasion/Certifié)

### Tests: Backend 88.9%, Frontend 98%

## Prioritized Backlog

### P0 - Critical
- Aucun item actuellement

### P1 - High Priority
- [ ] **BUG #3**: Filtres dynamiques via API (pas hardcodés)
- [ ] **BUG #5**: Index DB (condition, make, year, sale_price)
- [ ] **BUG #6**: Upsert lease_offers (éviter doublons)
- [ ] **BUG #7**: Soft delete véhicules disparus (is_active)
- [ ] **AMÉLIORATION #4**: Persistance filtres dans URL (query string)

### P2 - Medium Priority
- [ ] Crawler automation (scheduling)
- [ ] Alertes de prix (email/webhook)
- [ ] Authentification utilisateur
- [ ] Historique des prix

### P3 - Nice to Have
- [ ] Mobile app (React Native)
- [ ] Notifications push
- [ ] Analyse de tendances de prix

## Next Tasks
1. Implémenter BUG #3 - Filtres dynamiques (endpoint /api/filters/options)
2. Ajouter les index DB pour performance (BUG #5)
3. Implémenter la persistance des filtres dans l'URL (AMÉLIORATION #4)
4. Tester les crawlers avec Docker Compose

## Technical Decisions
- **Server-side sorting**: Utilise manualSorting dans React Table pour déléguer le tri au backend
- **CHANGEABLE_FIELDS**: Permet la correction automatique des données lors du re-ingest
- **View mode persistence**: localStorage pour mémoriser la préférence utilisateur
- **Condition validation**: Double validation (crawler + backend) via URL pattern matching
