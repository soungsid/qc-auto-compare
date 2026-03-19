# QC Auto Compare — Bug Fix & Feature Prompt

## Contexte du projet

Application web de comparaison de véhicules pour le Québec (`qc-auto-compare`).
- **Frontend** : React 18 + TypeScript + Tailwind CSS + React Query + React Table 8
- **Backend** : FastAPI + SQLAlchemy async + PostgreSQL
- **Scraper** : `crawler/scrape_dealers.py` (requests + BeautifulSoup)
- **URL de prod** : `https://auto.canadaquebec.ca`
- **API de prod** : `https://auto.canadaquebec.ca/api`

---

## MÉCANISME D'IDEMPOTENCE — COMPRENDRE LE SYSTÈME ACTUEL

### Comment le fingerprint assure l'idempotence entre deux crawls

L'objectif est simple : **entre deux exécutions du crawler, un véhicule déjà en base ne
doit jamais être inséré une deuxième fois — il doit être mis à jour si ses données ont
changé, ou ignoré si rien n'a changé.**

Le mécanisme actuel repose sur un **fingerprint SHA-256 calculé côté serveur** à chaque
ingest (`backend/app/core/fingerprint.py`). Ce fingerprint est l'identité stable du
véhicule, indépendant de l'UUID de la DB ou du payload.

**Stratégie de calcul du fingerprint (par priorité décroissante) :**

```
1. VIN disponible (17 chars valides)
   → sha256("vin:{vin_normalisé}")
   → Identité globalement unique. Priorité absolue.

2. dealer_slug + stock_number disponibles
   → sha256("stock:{dealer_slug}:{stock_number}")
   → Unique au sein du stock d'un concessionnaire.
   → NOTE: condition, trim, etc. ne font PAS partie du hash ici.

3. Fallback composite (ni VIN ni stock_number)
   → sha256("composite:{dealer_slug}:{make}:{model}:{trim}:{year}:{condition}")
   → Moins stable (sensible aux changements de trim ou condition).
```

**Flux à chaque ingest :**
```
Crawler envoie POST /api/ingest/batch
   ↓
Backend normalise (vin, condition, make, drivetrain, transmission)
   ↓
Backend calcule fingerprint (jamais le client)
   ↓
SELECT * FROM vehicles WHERE fingerprint = ?
   ├── Trouvé → _detect_changes() → UPDATE si changements, sinon SKIP
   └── Non trouvé → INSERT nouveau véhicule
   ↓
Toujours → écriture dans IngestLog (audit trail)
   ↓
UNIQUE CONSTRAINT sur fingerprint = filet de sécurité DB contre les races conditions
```

**Ce mécanisme fonctionne bien.** Les résultats du dernier crawl en témoignent :
- 843 véhicules traités → 0 doublons, 20 SKIP (identiques), 721 créés, 102 mis à jour.

### Gap identifié : `condition` absent de CHANGEABLE_FIELDS

**Problème** : `backend/app/services/ingest_service.py` définit `CHANGEABLE_FIELDS` comme :
```python
CHANGEABLE_FIELDS = {
    "sale_price", "msrp", "is_active", "image_url",
    "listing_url", "freight_pdi", "color_ext", "color_int",
}
```
`condition` n'y figure pas. Conséquence : pour les véhicules identifiés par stock_number
(fingerprint de type `stock:`), **même si un re-ingest envoie la bonne condition, elle
n'est jamais corrigée** — le record garde sa mauvaise valeur initiale.

C'est précisément la cause des 15 véhicules Paquet Nissan erronés (détaillés dans BUG #2).

---

## NOUVELLES FONCTIONNALITÉS À IMPLÉMENTER

### FEATURE #1 [FRONTEND] : Afficher l'identifiant unique (fingerprint) pour l'idempotence

**Contexte** : Chaque véhicule possède un champ `fingerprint` (SHA-256, 64 chars) qui sert
d'identifiant unique stable pour l'idempotence de l'ingest. Il est retourné par l'API dans
le champ `fingerprint` de chaque objet `Vehicle`. Il est actuellement invisible dans l'UI.

**Ce qui est attendu** :
- Dans la vue tableau (`VehicleTable.tsx`), ajouter une colonne **masquée par défaut**
  nommée "ID / Fingerprint" avec un toggle "Colonnes avancées" pour l'afficher
- Afficher les 8 premiers caractères du fingerprint sous forme de badge monospace cliquable
  (au clic : copier le fingerprint complet dans le presse-papier + toast "Copié !")
- Le tooltip au survol affiche le fingerprint complet
- Dans la vue carte (FEATURE #2), afficher le fingerprint tronqué en bas de la carte,
  dans une section "Détails techniques" repliable
- Cela permet aux développeurs et opérateurs de retracer facilement un véhicule entre
  la DB, l'API et les sources externes

**Exemple de fingerprint** : `50fab516bd490c38f6c856f0d9f7af1cb2f3b73a05c6b91e68de65d82e804772`
→ Afficher : `50fab516` avec tooltip et bouton copier

---

### FEATURE #2 [FRONTEND] : Vue carte (Card View) en alternative au tableau

**Contexte** : La vue tableau actuelle (`VehicleTable.tsx`) est dense et peu lisible sur
mobile. Il faut ajouter une vue "cartes" plus visuelle et user-friendly, accessible par
un toggle Tableau / Cartes dans le header.

**Ce qui est attendu** :

**Toggle de vue** : Deux boutons icône dans le header de la page principale (à côté
du bouton CSV) :
- 📋 Tableau (vue actuelle, par défaut)
- 🃏 Cartes (nouvelle vue)

**Structure d'une carte véhicule** :
```
┌─────────────────────────────────────────┐
│  [Image du véhicule si disponible,      │
│   sinon placeholder avec icône 🚗]      │
├─────────────────────────────────────────┤
│  Badge [NEUF] ou [OCCASION]  •  2026    │
│  Nissan Kicks                           │
│  Version: S Avant                       │
├─────────────────────────────────────────┤
│  💰 26 995 $   (PDSF: 28 500 $)        │
│  📍 Capitale Nissan — Québec            │
│  🎨 Bronze canyon métallisé             │
│  ⚙️  AWD • CVT                         │
├─────────────────────────────────────────┤
│  [Voir le véhicule →]  (listing_url)   │
│  ─────────────────────────────────────  │
│  ID: 50fab516  📋                       │
└─────────────────────────────────────────┘
```

**Comportement** :
- Grille responsive : 1 colonne mobile, 2 colonnes tablette, 3-4 colonnes desktop
- La pagination existante (Précédente / Suivante) reste identique
- Les filtres et le tri fonctionnent exactement comme pour le tableau
- Si `image_url` est null → afficher un placeholder gris avec "🚗 [Marque Modèle]"
- Badge condition : "Neuf" (vert), "Occasion" (gris), "Certifié" (bleu)
- Le badge ingest_source reste visible sur la carte (en petit, coin supérieur droit)
- Le fingerprint (8 chars) en bas de carte, cliquable pour copier (même comportement
  que FEATURE #1)

**État persistant** : Mémoriser le choix tableau/carte dans `localStorage` sous la clé
`qc-auto-view-mode` pour que l'utilisateur retrouve sa préférence au retour.

---

## BUGS CRITIQUES À CORRIGER

### BUG #1 [FRONTEND - CRITIQUE] : Le tri est uniquement client-side

**Fichier** : `frontend/src/components/VehicleTable.tsx`

**Problème** : Les clics sur les en-têtes de colonnes trient uniquement les 50 résultats
de la page courante (client-side via React Table), mais ne mettent jamais à jour les
paramètres `sort` et `order` envoyés à l'API. L'utilisateur croit trier l'ensemble des
843 véhicules alors qu'il ne trie que 50.

**Code actuel** :
```typescript
const [sorting, setSorting] = useState<SortingState>([])
const table = useReactTable({
  state: { sorting },
  onSortingChange: setSorting,              // met à jour le state local uniquement
  getSortedRowModel: getSortedRowModel(),   // tri client-side
  manualPagination: true,
  ...
})
```

**Correction attendue** :
- Supprimer le state `sorting` local et `getSortedRowModel`
- Connecter `onSortingChange` aux filtres parents via `onFiltersChange({ sort, order, page: 1 })`
- Activer `manualSorting: true` dans React Table
- Le composant parent (`VehicleTable` ou `App`) possède déjà `sort` et `order` dans les
  filtres, initialisés à `sale_price / asc` — ils doivent être mis à jour dynamiquement

**Colonnes triables côté serveur** (déjà supportées par le backend) :
`sale_price`, `msrp`, `year`, `make`, `model`, `mileage_km`, `created_at`

---

### BUG #2 [DATA QUALITY - CRITIQUE] : Incohérence du champ `condition` — véhicules d'occasion affichés comme neufs

**Concessionnaire concerné** : Paquet Nissan (Lévis)
**Nombre de véhicules affectés** : **15 véhicules** actuellement en base de données

**Cause racine technique** : Le fingerprint des 15 véhicules est de type `stock:` (basé sur
`dealer_slug + stock_number`), donc `condition` ne fait pas partie du hash. Lors des
re-ingests v2/v3 avec la bonne valeur `condition="used"`, le backend a bien retrouvé les
enregistrements existants (même fingerprint), mais comme `condition` n'est pas dans
`CHANGEABLE_FIELDS`, la valeur erronée n'a jamais été écrasée.

**Correction à apporter à `ingest_service.py`** (en plus des 3 volets décrits ci-dessous) :
```python
# Ajouter condition dans CHANGEABLE_FIELDS
CHANGEABLE_FIELDS = {
    "sale_price", "msrp", "is_active", "image_url",
    "listing_url", "freight_pdi", "color_ext", "color_int",
    "condition",   # ← AJOUTER
    "drivetrain",  # ← AJOUTER
    "transmission", # ← AJOUTER
    "mileage_km",  # ← AJOUTER
}

# Et dans _detect_changes(), ajouter condition au field_map :
field_map = {
    ...
    "condition": normalize_condition(payload.condition) if payload.condition else None,
    "drivetrain": normalize_drivetrain(payload.drivetrain),
    "transmission": normalize_transmission(payload.transmission),
    "mileage_km": payload.mileage_km if payload.mileage_km else None,
}
```
Note: Mettre à jour `condition` ne change pas le fingerprint existant (le fingerprint est
calculé à partir du payload entrant, pas de la DB). Le record garde son fingerprint stable
mais voit sa condition corrigée.



**Preuve concrète — l'API expose le problème ici** :
```
GET https://auto.canadaquebec.ca/api/vehicles?condition=new&page=1&page_size=200
```
Dans la réponse JSON, les 15 véhicules suivants ont `condition: "new"` mais une
`listing_url` contenant `/occasion/` :

| `id` (UUID) | Véhicule | listing_url (contient /occasion/) |
|-------------|----------|-----------------------------------|
| `80d9043f-b010-4fa7-85d3-690bb6280f27` | 2020 Nissan Qashqai | `https://www.paquetnissan.com/occasion/Nissan-Qashqai-2020-id13435471.html` |
| `f6a413d2-4a0e-46dc-9b51-4f3344df3732` | 2019 Nissan Kicks | `https://www.paquetnissan.com/occasion/Nissan-Kicks-2019-id13228355.html` |
| `c890ffd4-cfe5-43a5-ad11-a990cf0b1236` | 2021 Nissan Qashqai | `https://www.paquetnissan.com/occasion/Nissan-Qashqai-2021-id13501991.html` |
| `1de7c9b3-b7be-461d-ad04-a4354e8e3895` | 2019 Nissan Qashqai | `https://www.paquetnissan.com/occasion/Nissan-Qashqai-2019-id12775027.html` |
| `0b1c53ca-23bc-43aa-a4ca-57ec310ce822` | 2021 Nissan Qashqai | `https://www.paquetnissan.com/occasion/Nissan-Qashqai-2021-id12884570.html` |
| `6e2017b6-9cec-46c9-835b-acfebd68f848` | 2019 Nissan Qashqai | `https://www.paquetnissan.com/occasion/Nissan-Qashqai-2019-id13045830.html` |
| `7ad1a72c-5e7a-4f81-9736-a35a7f90c957` | 2021 Nissan Sentra | `https://www.paquetnissan.com/occasion/Nissan-Sentra-2021-id13459150.html` |
| `a7d54926-49d6-42f7-8c99-281627d80ebb` | 2023 Nissan Kicks | `https://www.paquetnissan.com/occasion/Nissan-Kicks-2023-id13435326.html` |
| `a2f47ca9-7ef5-4885-b0bc-7b0263a68cc6` | 2020 Nissan Qashqai | `https://www.paquetnissan.com/occasion/Nissan-Qashqai-2020-id13282003.html` |
| `9ed25a2c-55af-4e0f-ba4c-cb719fb38ca6` | 2021 Nissan Qashqai | `https://www.paquetnissan.com/occasion/Nissan-Qashqai-2021-id13515724.html` |
| `6532fb16-f25d-412a-b6f9-96b9a6a2b500` | 2022 Nissan Kicks | `https://www.paquetnissan.com/occasion/Nissan-Kicks-2022-id13417272.html` |
| `c4f30e94-3b12-4c2c-8050-c5cf260788c7` | 2022 Nissan Rogue | `https://www.paquetnissan.com/occasion/Nissan-Rogue-2022-id13490038.html` |
| `b6805de4-34e6-4b86-b6fd-5f1c4055b1dd` | 2022 Nissan Sentra | `https://www.paquetnissan.com/occasion/Nissan-Sentra-2022-id13523755.html` |
| `e15a7d13-6015-4d6a-9733-af8b2d3c754a` | 2020 Nissan Qashqai | `https://www.paquetnissan.com/occasion/Nissan-Qashqai-2020-id12963849.html` |
| `b2366d4d-dbc4-4207-b5cf-7e1bd72b389d` | 2023 Nissan Kicks | `https://www.paquetnissan.com/occasion/Nissan-Kicks-2023-id12439465.html` |

**Corrections à apporter en 3 volets** :

**Volet A — Correction immédiate des données existantes en DB** :

Le LLM doit créer un script Python ou une migration SQL qui corrige les 15 enregistrements
ci-dessus. La règle de correction est simple et fiable :
- Si `listing_url` contient `/occasion/` ET `condition = "new"` → mettre `condition = "used"`
- Si `listing_url` contient `/neufs/` ET `condition = "used"` → mettre `condition = "new"`

Utiliser l'endpoint PATCH si disponible, ou directement via SQLAlchemy :
```python
# Exemple de correction via l'API ou SQLAlchemy
UPDATE vehicles
SET condition = 'used'
WHERE id IN (
  '80d9043f-...', 'f6a413d2-...', ...  -- les 15 IDs ci-dessus
)
AND condition = 'new'
AND listing_url LIKE '%/occasion/%';
```

Important : après correction, recalculer le `fingerprint` si `condition` fait partie du
hash (vérifier `backend/app/core/fingerprint.py`). Si oui, mettre à jour le fingerprint
en même temps pour préserver l'idempotence des prochains ingests.

**Volet B — Prévention dans le scraper** :

Dans `crawler/scrape_dealers.py`, ajouter une validation post-extraction :
```python
def validate_and_fix_condition(vehicle: dict) -> dict:
    """Ensure condition is consistent with listing_url."""
    url = vehicle.get("listing_url", "")
    if "/occasion/" in url:
        vehicle["condition"] = "used"
    elif "/neufs/inventaire/" in url or "/neufs/" in url:
        vehicle["condition"] = "new"
    return vehicle
```
Appeler cette fonction sur chaque véhicule avant l'ingest, dans la boucle principale.

**Volet C — Détection future dans le backend** :

Dans `backend/app/services/ingest_service.py`, ajouter une validation à l'ingest :
```python
# Après normalisation des champs, avant le fingerprint
listing_url = payload.listing_url or ""
if "/occasion/" in listing_url and payload.condition == "new":
    logger.warning(f"Condition mismatch: condition=new but URL={listing_url}. Correcting to 'used'.")
    payload = payload.model_copy(update={"condition": "used"})
```

---

### BUG #3 [FRONTEND] : Options de filtres hardcodées

**Fichier** : `frontend/src/components/FilterBar.tsx`

**Problème** : Les listes de marques, conditions, transmissions et villes sont des tableaux
hardcodés :
```typescript
const MAKES = ['', 'Chevrolet', 'Hyundai', 'Kia', 'Mitsubishi', 'Nissan', 'Toyota']
const CONDITIONS = ['', 'new', 'used', 'certified']
const CITIES = ['', 'Montréal', 'Laval', 'Brossard', 'Québec', 'Lévis']
```

**Problème** : Si de nouveaux concessionnaires d'autres villes sont ajoutés, ils
n'apparaîtront pas dans les filtres. Même chose pour les nouvelles marques.

**Correction attendue** :
- Appeler `GET /api/crawl/stats` (déjà existant) ou créer un endpoint
  `GET /api/filters/options` qui retourne les valeurs disponibles dynamiquement
- Fallback sur les valeurs hardcodées si l'API échoue

---

### BUG #4 [BACKEND] : Filtres manquants dans l'endpoint liste

**Fichier** : `backend/app/services/search_service.py`

**Problème** : Des filtres essentiels pour une app automobile ne sont pas implémentés dans
le endpoint `GET /api/vehicles` :

| Filtre manquant | Type | Description |
|-----------------|------|-------------|
| `year_min` | int | Année minimale |
| `year_max` | int | Année maximale |
| `min_price` | float | Prix minimum (le max est déjà là) |
| `mileage_max` | int | Kilométrage maximum |

**Correction attendue** : Ajouter ces paramètres dans le router et les appliquer via des
clauses WHERE dans `search_service.py`. Exposer `min_price` et `year_min`/`year_max` dans
le `FilterBar.tsx` côté frontend.

---

### BUG #5 [BACKEND] : Index de base de données manquants

**Fichier** : `backend/app/db/models.py` et migrations

**Problème** : Aucun index sur les colonnes les plus filtrées, ce qui va ralentir les
requêtes à mesure que la DB grossit.

**Colonnes à indexer** :
```python
# Dans la classe Vehicle
__table_args__ = (
    UniqueConstraint("fingerprint"),
    Index("idx_vehicles_condition", "condition"),
    Index("idx_vehicles_make", "make"),
    Index("idx_vehicles_year", "year"),
    Index("idx_vehicles_sale_price", "sale_price"),
    Index("idx_vehicles_is_active", "is_active"),
)
```

Et sur la table `Dealer` :
```python
Index("idx_dealers_city", "city"),
```

---

### BUG #6 [BACKEND] : Doublons de lease_offers à chaque ré-ingest

**Fichier** : `backend/app/services/ingest_service.py`

**Problème** : À chaque ré-ingest, les `lease_offers` sont supprimées et recréées (ou
appendées sans déduplication). Cela crée des doublons et des historiques incorrects.

**Correction attendue** :
- Ajouter une contrainte unique sur `lease_offers` :
  `UniqueConstraint("vehicle_id", "term_months", "payment_frequency")`
- Implémenter un upsert (INSERT … ON CONFLICT DO UPDATE) pour les offres de leasing

---

### BUG #7 [BACKEND] : Véhicules disparus jamais désactivés

**Fichier** : `backend/app/services/ingest_service.py`

**Problème** : Quand un véhicule est vendu et disparaît de l'inventaire d'un concessionnaire,
il reste dans la DB avec `is_active=true`. Il continue à s'afficher dans les résultats.

**Correction attendue** :
- Ajouter un mécanisme de "soft delete" : à la fin de chaque session de scraping complète
  pour un concessionnaire, les véhicules non revus depuis la dernière session doivent passer
  à `is_active=false`
- L'endpoint liste doit par défaut filtrer sur `is_active=true`
- Le scraper peut envoyer la liste des stock_numbers vus à un endpoint de réconciliation, ou
  le backend peut comparer `last_seen_at` avec l'heure de début du scraping

---

## AMÉLIORATIONS PRIORITAIRES (non bloquantes)

### AMÉLIORATION #1 [FRONTEND] : Filtres trim et min_price non exposés dans l'UI

Le backend supporte déjà `trim` (ilike) et `min_price` (>=) mais ces filtres ne sont pas
exposés dans `FilterBar.tsx`. Les ajouter comme champs optionnels.

### AMÉLIORATION #2 [FRONTEND] : Affichage de la couleur et kilométrage

La table affiche `drivetrain` mais pas `color_ext`, `color_int`, `transmission`,
`mileage_km`. Ces champs sont retournés par l'API. Les ajouter en colonnes optionnelles
(masquées par défaut avec un toggle "afficher plus").

### AMÉLIORATION #3 [UX] : Condition affichée en français avec badge coloré

Actuellement `condition` affiche "new" ou "used" en anglais brut.
- "new" → badge vert "Neuf"
- "used" → badge gris "Occasion"
- "certified" → badge bleu "Certifié"

### AMÉLIORATION #4 [FRONTEND] : Persistance des filtres dans l'URL

Les filtres actifs devraient se refléter dans l'URL (query string) pour permettre le
partage et la navigation arrière/avant du navigateur.
Exemple : `/?make=Nissan&condition=new&max_price=35000`

---

## STRUCTURE DES FICHIERS CLÉS

```
frontend/src/
  components/
    VehicleTable.tsx    # Table principale — BUG #1 (tri)
    FilterBar.tsx       # Filtres — BUG #3, AMÉLIORATION #1
  hooks/
    useVehicles.ts      # React Query hook — envoie les filtres à l'API
  types.ts              # Interfaces TypeScript (Vehicle, VehicleFilters, etc.)

backend/app/
  db/
    models.py           # SQLAlchemy ORM — BUG #5 (indexes)
  services/
    search_service.py   # Logique de filtrage/tri — BUG #4
    ingest_service.py   # Upsert logic — BUG #2, #6, #7
  routers/
    vehicles.py         # Endpoint GET /api/vehicles
  schemas/
    vehicle.py          # VehicleResponse schema
    ingest.py           # VehicleIngestPayload schema

crawler/
  scrape_dealers.py     # Scraper direct HTTP — BUG #2
```

---

## CONTRAINTES IMPORTANTES

1. **Ne pas casser l'API existante** : Le endpoint `GET /api/vehicles` doit rester
   rétrocompatible (tous les nouveaux paramètres doivent être optionnels).

2. **Pas de migration de données destructive** : Les corrections de `condition` doivent
   être faites via UPDATE, jamais via DELETE + INSERT (risque de perte d'historique).

3. **Le scraper doit rester idempotent** : Relancer `scrape_dealers.py` plusieurs fois de
   suite ne doit pas créer de doublons (déjà géré via fingerprint, à préserver).

4. **Valeurs de `condition` normalisées** : Toujours stocker en minuscules (`new`, `used`,
   `certified`). Jamais `New`, `Neuf`, `occasion`.

---

## ORDRE DE PRIORITÉ SUGGÉRÉ

1. BUG #1 (tri frontend) — visible immédiatement par l'utilisateur
2. BUG #2 (condition incohérente) — crée de la confusion dans les résultats de recherche
3. BUG #4 (filtres manquants year/mileage) — fonctionnalité attendue dans une app auto
4. AMÉLIORATION #3 (badges condition en français)
5. BUG #3 (options hardcodées)
6. BUG #5 (indexes DB) — performance future
7. BUG #6, #7 (lease offers, is_active) — intégrité des données long terme
