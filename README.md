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



---

## 📊 Analytics & Tracking

### Google Tag Manager (GTM) Integration

**Pourquoi GTM plutôt que Google Analytics directement ?**

Google Tag Manager est recommandé car il offre :
- ✅ **Flexibilité** - Gérer plusieurs outils analytics sans toucher au code
- ✅ **Performance** - Chargement asynchrone optimisé
- ✅ **Évolutivité** - Ajouter Facebook Pixel, hotjar, etc. sans redéploiement
- ✅ **Tests A/B** - Facile d'implémenter des tests et conversions
- ✅ **Débogage** - Mode preview pour tester avant publication

### Configuration GTM (Étape par étape)

#### 1. Créer un compte Google Tag Manager

1. Allez sur [tagmanager.google.com](https://tagmanager.google.com)
2. Cliquez sur "Créer un compte"
3. Nom du compte: `QC Auto Compare`
4. Pays: Canada
5. Nom du conteneur: `qcautocompare.ca`
6. Plateforme cible: **Web**
7. Cliquez sur "Créer"

Vous obtiendrez un **ID de conteneur** comme `GTM-XXXXXXX`

#### 2. Installation du code GTM

Le code GTM est **déjà intégré** dans `/app/frontend/public/index.html` :

**Section `<head>` :**
```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
```

**Section `<body>` (juste après ouverture) :**
```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

**⚠️ Important :** Remplacez `GTM-XXXXXXX` par votre vrai ID de conteneur

#### 3. Configurer Google Analytics 4 (GA4) dans GTM

Dans votre conteneur GTM :

**A. Créer une variable GA4**
1. Variables → Nouvelle variable
2. Type : Paramètres Google Analytics : GA4
3. ID de mesure : `G-XXXXXXXXXX` (obtenu depuis [analytics.google.com](https://analytics.google.com))
4. Nom : `GA4 - Config`

**B. Créer une balise GA4**
1. Balises → Nouvelle balise
2. Configuration de balise : Google Analytics : Événement GA4
3. Paramètres de configuration : Sélectionnez votre variable `GA4 - Config`
4. Nom de l'événement : `page_view`
5. Déclencheur : All Pages (Toutes les pages)
6. Nom : `GA4 - Page View`
7. Enregistrer et **Publier**

#### 4. Événements personnalisés recommandés

**Événements à configurer dans GTM :**

| Événement | Description | Déclencheur |
|-----------|-------------|-------------|
| `vehicle_view` | Utilisateur clique sur une carte véhicule | Click sur `.vehicle-card` |
| `filter_apply` | Utilisateur applique des filtres | Click sur `[data-testid="apply-filters-btn"]` |
| `dealer_contact` | Click sur téléphone/site concessionnaire | Click sur liens dealer |
| `compare_vehicles` | Utilisateur compare des véhicules | Click sur bouton compare |
| `search` | Recherche effectuée | Form submit |

**Exemple de configuration d'événement "vehicle_view" :**
1. Balises → Nouvelle
2. Type : Événement GA4
3. Nom de l'événement : `vehicle_view`
4. Paramètres d'événement :
   - `vehicle_make` = `{{Click Text}}`
   - `vehicle_model` = `{{Click Text}}`
   - `price` = Custom JS variable
5. Déclencheur : Click - Classes CSS contient `vehicle-card`

#### 5. Tester l'installation

1. Dans GTM, cliquez sur **"Aperçu"** (Preview)
2. Entrez l'URL de votre site : `http://localhost:3000` ou votre domaine
3. Naviguez sur le site et vérifiez que les événements se déclenchent
4. **Publier** quand tout fonctionne

#### 6. Vérifier dans Google Analytics

1. Allez sur [analytics.google.com](https://analytics.google.com)
2. Temps réel → Vue d'ensemble
3. Vous devriez voir les visiteurs actifs et événements en temps réel

### Variables d'environnement (Optionnel)

Pour gérer différents environnements (dev/staging/prod), créez plusieurs conteneurs GTM :
- `GTM-DEV123` pour développement
- `GTM-PROD456` pour production

Et ajoutez dans `.env` :
```bash
REACT_APP_GTM_ID=GTM-PROD456
```

Puis dans `index.html` :
```html
<script>
  const gtmId = '%REACT_APP_GTM_ID%' || 'GTM-XXXXXXX'
  // ... code GTM avec gtmId dynamique
</script>
```

---

## 📧 Newsletter Integration

### Options recommandées

**1. SendGrid (Recommandé pour Email transactionnel)**
- ✅ 100 emails/jour gratuits
- ✅ API RESTful simple
- ✅ Templates visuels
- ✅ Analytics détaillés

**Configuration :**
```bash
# Backend .env
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=newsletter@qcautocompare.ca
```

**Endpoint backend `/api/newsletter/subscribe` :**
```python
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

@router.post("/newsletter/subscribe")
async def subscribe_newsletter(email: str):
    sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))
    # Ajouter à la liste de contacts
    # Envoyer email de confirmation
```

**2. Mailchimp (Recommandé pour Marketing)**
- ✅ 500 contacts gratuits
- ✅ Templates professionnels
- ✅ Segmentation avancée
- ✅ A/B testing intégré

**Configuration :**
```bash
# Backend .env
MAILCHIMP_API_KEY=xxxxx
MAILCHIMP_SERVER_PREFIX=us21
MAILCHIMP_AUDIENCE_ID=xxxxx
```

**Intégration frontend :**
```typescript
// pages/Footer.tsx - Newsletter form
const handleNewsletterSubmit = async (email: string) => {
  const response = await fetch(`${backendUrl}/api/newsletter/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  // Handle success/error
}
```

### RGPD / Conformité

⚠️ **Important pour la collecte d'emails :**
- Checkbox explicite de consentement
- Double opt-in (email de confirmation)
- Lien de désabonnement dans chaque email
- Politique de confidentialité claire

---

## 🔄 Prochaines améliorations

- [ ] Alerts email pour nouvelles offres
- [ ] Comparaison côte-à-côte de véhicules
- [ ] Historique des prix
- [ ] Favoris / Watchlist pour utilisateurs
- [ ] API publique pour développeurs
- [ ] Application mobile (React Native)

---
