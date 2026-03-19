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
│   │   ├── services/     # business logic
│   │   └── scheduler.py  # APScheduler jobs
│   └── server.py      # Emergent bridge
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # useVehicles, useTheme
│   │   ├── pages/        # ListingPage
│   │   └── types.ts      # TypeScript types
│   └── tailwind.config.js
├── crawler/           # Scrapy spiders
│   ├── spiders/         # Base + brand-specific spiders
│   ├── pipelines.py     # Backend ingest pipeline
│   └── dealers_registry.json
└── docker-compose.yml
```

## User Personas
1. **Acheteur de voiture**: Cherche à comparer les prix entre concessionnaires
2. **Administrateur**: Gère les crawlers et les sources de données

## Core Requirements (Static)

### Fonctionnalités Essentielles
- [x] Comparaison de prix de véhicules
- [x] Filtrage par marque, modèle, condition, traction, ville, prix
- [x] Export CSV des résultats
- [x] Support dark/light mode
- [x] API d'ingestion universelle (crawler, manuel, CSV)

### APIs Implémentées
- `GET /health` - Health check
- `GET /api/vehicles` - Liste paginée avec filtres
- `GET /api/vehicles/{id}` - Détail véhicule
- `GET /api/vehicles/compare` - Comparaison multi-véhicules
- `GET /api/dealers` - Liste concessionnaires
- `GET /api/crawl/stats` - Statistiques
- `POST /api/ingest/vehicle` - Ingestion unitaire
- `POST /api/ingest/batch` - Ingestion batch (max 500)

## What's Been Implemented

### 2024-03-19 - Initial Setup & Fixes
- [x] Réparation Tailwind (ajout postcss.config.js)
- [x] Ajout dark mode complet avec toggle (Système/Clair/Sombre)
- [x] Mise à jour tous les composants avec variants dark:
- [x] Configuration vite.config.ts pour Emergent
- [x] Bridge server.py pour compatibilité supervisor
- [x] Mise à jour dépendances (pydantic 2.12.5, fastapi 0.135.1)
- [x] Tests passés: 100% backend, 98% frontend

## Prioritized Backlog

### P0 - Critical
- Aucun item actuellement

### P1 - High Priority
- [ ] Crawler automation (scheduling)
- [ ] Alertes de prix (email/webhook)
- [ ] Authentification utilisateur

### P2 - Medium Priority
- [ ] Historique des prix
- [ ] Comparaison side-by-side améliorée
- [ ] Favoris/watchlist

### P3 - Nice to Have
- [ ] Mobile app (React Native)
- [ ] Notifications push
- [ ] Analyse de tendances de prix

## Next Tasks
1. Tester le crawler avec Docker Compose
2. Ajouter plus de spiders pour d'autres marques
3. Implémenter le scheduling automatique des crawls
4. Ajouter la fonctionnalité d'alertes de prix
