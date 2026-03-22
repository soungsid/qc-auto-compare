# Rapport d'audit UX — auto.canadaquebec.ca
**Date :** 22 mars 2026  
**Méthodologie :** Tests API exhaustifs + simulation de scénarios acheteurs  
**Base de données :** 845 véhicules actifs, 17 marques, 5 concessionnaires

---

## 1. Bugs critiques (à corriger immédiatement)

### 🔴 BUG-01 — Prix aberrants dans les données

**Symptôme :** Certains véhicules ont des prix impossibles qui corrompent le slider de prix.

| Véhicule | Prix affiché |
|----------|-------------|
| Nissan Armada 2018 | 2 393 228 770 $ |
| Nissan Kicks 2021 | 1 771 719 240 $ |
| Kia Forte 2015 | 89 949 760 $ |

**Impact :** Le slider de prix a un maximum de ~2,4 milliards $. Le curseur "max" est collé à l'extrême gauche de la barre, rendant le filtre prix totalement inutilisable. Le client croit que tous les véhicules coûtent des milliards.

**Correction :**
- Ajouter une validation lors de l'ingestion (rejet si prix > 500 000 $ ou < 500 $)
- Appliquer un filtre `BETWEEN 500 AND 500000` par défaut dans `/api/filters/options` pour le `price_range`
- Optionnel : afficher un badge "Prix à vérifier" sur ces fiches

---

### 🔴 BUG-02 — Filtres de carrosserie/transmission/carburant affichent les totaux globaux, pas les totaux filtrés

**Symptôme :** Quand on sélectionne **Nissan** (674 véhicules), le filtre "Type de carrosserie" continue d'afficher VUS (633) — le total GLOBAL — au lieu de VUS (545) — le total Nissan.

**Vérification API :**
```
GET /api/filters/options?make=Nissan
→ body_types: [VUS(633), Berline(120), ...]   ← retourne les totaux GLOBAUX

GET /api/vehicles?make=Nissan&body_type=VUS
→ total: 545   ← la vraie valeur pour Nissan+VUS
```

**Impact UX :** Le client voit "VUS (633)" mais après avoir cliqué, il voit 545 résultats. La différence de 88 véhicules crée de la confusion et un sentiment de tromperie. L'utilisateur ne comprend pas pourquoi le nombre change.

**Correction backend :** L'endpoint `/api/filters/options` doit accepter tous les mêmes paramètres de filtre que `/api/vehicles` et les appliquer pour calculer les counts contextuels.

```python
# backend/app/api/routes/filters.py
@router.get("/options")
async def get_filter_options(
    make: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    body_type: Optional[str] = Query(None),
    fuel_type: Optional[str] = Query(None),
    # ...
):
    # Passer le contexte au service pour calculer les counts filtrés
```

---

### 🔴 BUG-03 — Valeurs de transmission en anglais minuscule non traduites

**Symptôme :** La sidebar affiche `automatic (820)` et `manual (2)` au lieu de `Automatique` et `Manuelle`.

**Vérification :**
```
GET /api/filters/options
→ transmissions: [{"transmission": "automatic", "count": 820}, {"transmission": "manual", "count": 2}]
```

**Double problème :**
1. L'affichage n'est pas traduit (UX)
2. Si un futur filtre envoie "Automatique" (français), l'API retourne 0 résultats car `ilike('%Automatique%')` ne match pas `automatic`

**Correction :** Normaliser les valeurs à l'ingestion ET/OU ajouter un mapping d'affichage côté frontend :
```typescript
const TRANSMISSION_LABELS: Record<string, string> = {
  'automatic': 'Automatique',
  'manual': 'Manuelle',
  'cvt': 'CVT',
  'semi-automatic': 'Semi-automatique',
}
```

---

### 🟡 BUG-04 — ~13% des véhicules sans type de carrosserie → invisibles au filtre

**Symptôme :** Sur 200 véhicules testés, **26 n'ont pas de `body_type`** (données manquantes du crawl). Ces véhicules n'apparaissent jamais quand on filtre par carrosserie.

Exemples :
- Mercedes-Benz C 2010
- Dodge Journey 2014
- Nissan Micra 2017 et 2015
- Toyota Yaris 2014

**Calcul de l'impact :**
- Total véhicules sans body_type estimé : ~110/845 (13%)
- Un client cherchant "tous les VUS" ne verra pas les VUS dont le body_type n'a pas été crawlé

**Correction :** Améliorer le crawler pour extraire body_type. À court terme, ajouter une règle de normalisation par modèle connu (ex: Nissan Micra → Berline, Dodge Journey → VUS).

---

### 🟡 BUG-05 — Filtre "Électrique" → 0 résultats dans l'UI (partiellement résolu)

**Statut :** Corrigé le 22/03/2026 — les filtres `fuel_type`, `body_type`, `transmission` sont maintenant persistés dans l'URL.

**Vérification API :** `GET /api/vehicles?fuel_type=Électrique` retourne bien **61 résultats**.

**Vérification nécessaire :** Tester dans le navigateur que le clic sur "Électrique" met bien à jour l'URL et affiche les 61 véhicules.

---

## 2. Améliorations UX prioritaires (Quick Wins)

### 🟠 UX-01 — Compteur de résultats en temps réel dans la sidebar

**Problème actuel :** Le bouton submit a été supprimé (recherche automatique). Mais l'utilisateur n'a aucun retour visuel du nombre de résultats correspondant à ses critères actuels.

**Suggestion :** Afficher le nombre de résultats dans l'en-tête de la sidebar, mis à jour en temps réel (avec le debounce de 400ms déjà en place) :

```
┌─────────────────────────────┐
│ Filtres    [843 résultats]  │
│ [Réinitialiser]             │
└─────────────────────────────┘
```

---

### 🟠 UX-02 — Chips "filtres actifs" avec suppression individuelle

**Problème actuel :** Quand plusieurs filtres sont actifs, l'utilisateur ne voit pas facilement ce qui est sélectionné, surtout sur desktop. Il faut scrolle la sidebar pour voir.

**Suggestion :** Afficher des badges supprimables au-dessus des résultats :

```
[Nissan ×]  [VUS ×]  [2022+ ×]  [Effacer tout]
```

Clic sur `×` = suppression individuelle du filtre.

---

### 🟠 UX-03 — Message d'état clair quand les résultats = 0

**Problème actuel :** Si une combinaison de filtres donne 0 résultats, la grille est vide mais sans explication.

**Suggestion :**
```
┌────────────────────────────────────────┐
│  Aucun véhicule ne correspond         │
│                                        │
│  VUS + Électrique + AWD + < 30 000$   │
│  → 0 résulttat                         │
│                                        │
│  Essayez de :                          │
│  • Supprimer le filtre "AWD"           │
│  • Augmenter votre budget              │
│  • [Voir les VUS Électriques] →        │
└────────────────────────────────────────┘
```

---

### 🟠 UX-04 — Histogramme de distribution sur le slider de prix

**Problème actuel :** Le slider de prix est aveugle — l'utilisateur ne sait pas combien de véhicules se trouvent dans chaque tranche.

**Suggestion :** Afficher un mini-histogramme (barres SVG) au-dessus du slider, comme sur Airbnb. Cela guide l'utilisateur vers les tranches avec le plus d'offres.

```
     ▄▄▄▄▄▄
   ▄▄██████▄▄▄
  ▄████████████▄▄
──────────────────────
 5k       35k     100k
    [===••===]
```

---

### 🟠 UX-05 — Mobile : fermeture automatique de la sidebar après sélection

**Problème actuel :** En mobile, l'overlay de filtres reste ouvert après chaque sélection. L'utilisateur doit manuellement fermer (bouton X) pour voir les résultats.

**Suggestion :** Sur mobile uniquement, fermer l'overlay automatiquement après 1,5s ou après un second clic sur un filtre déjà sélectionné. Ou ajouter un bouton "Voir les résultats" uniquement en mobile (non intrusif, en bas du drawer).

---

## 3. Fonctionnalités manquantes (Impact business fort)

### 🔵 FEAT-01 — Comparateur de véhicules côte-à-côte

**Constat :** L'API supporte déjà `/api/vehicles/compare?ids=id1,id2,id3` (testé — retourne 3 véhicules). L'interface ne l'expose pas du tout.

**Scenario utilisateur :** "Je veux comparer la Nissan Leaf 2023 vs la Mazda MX-30 2023 — mêmes caractéristiques, quel concessionnaire propose le meilleur prix ?"

**Suggestion d'implémentation :**
- Checkbox "Comparer" sur chaque carte (max 3-4 véhicules)
- Barre sticky en bas avec "Comparer (2) →"
- Page `/compare?ids=...` avec tableau côte-à-côte

---

### 🔵 FEAT-02 — Page de détail véhicule interne

**Constat actuel :** Les cartes ont un lien direct vers le site du concessionnaire. Il n'y a pas de page de détail interne sur `auto.canadaquebec.ca`.

**Problèmes :**
- L'utilisateur quitte le site dès le premier clic
- Impossible de partager un véhicule spécifique
- Pas de tracking des véhicules vus
- L'API existe déjà (`/api/vehicles/{id}`)

**Suggestion :** Page `/vehicle/{id}` avec :
- Photos (l'URL d'image est disponible)
- Toutes les caractéristiques
- Informations concessionnaire + carte Google Maps
- Lien "Voir chez le concessionnaire →"
- Bouton "Ajouter à la comparaison"
- "Véhicules similaires"

---

### 🔵 FEAT-03 — Recherche par ville / rayon géographique

**Constat :** L'API supporte `city=Montreal` mais l'interface n'expose pas ce filtre de façon intuitive.

**Scenario utilisateur :** "Je cherche une voiture à moins de 50 km de Québec."

**Suggestion :** Ajouter un filtre "Ville / Région" avec les villes des concessionnaires disponibles. À terme : géolocalisation + rayon en km.

---

### 🔵 FEAT-04 — Alertes email / notification nouveaux véhicules

**Scenario :** "Je cherche un Nissan Leaf 2022-2023 sous 25 000$. Prévenez-moi quand un arrive."

**Suggestion :** Formulaire "Sauvegarder cette recherche" → email de notification à chaque nouveau véhicule correspondant aux critères.

---

### 🔵 FEAT-05 — Filtre par paiement mensuel

**Constat :** L'API supporte `max_monthly_payment` et `payment_frequency`. L'interface ne l'expose pas.

**Scenario :** "Je peux me permettre 400$/mois. Quels véhicules puis-je me payer ?"

**Suggestion :** Slider "Paiement mensuel max" dans la section Prix. Très différenciant vs les sites concurrents qui n'ont que le prix d'achat.

---

### 🔵 FEAT-06 — Tri par pertinence + affichage du rapport qualité/prix

**Constat :** Le tri est disponible (prix, année, km) mais pas de "meilleur rapport qualité/prix".

**Suggestion :** Score calculé automatiquement basé sur :
- Prix vs MSRP (rabais%)
- Kilométrage vs âge
- Disponibilité de photos
- Badge "Bonne affaire" si prix < moyenne du modèle

---

## 4. Scénarios utilisateurs et résultats observés

| Scénario | Résultat API | État |
|----------|-------------|------|
| Famille cherche VUS AWD usagé < 35k$ | 126 véhicules | ✅ Fonctionne |
| Nissan Kicks 2023 et + | 268 véhicules | ✅ Fonctionne |
| Véhicule électrique (tout type) | 61 véhicules | ✅ Corrigé |
| VUS électrique | 39 véhicules | ✅ Fonctionne |
| Budget serré < 10k$ | 16 véhicules | ✅ Fonctionne |
| Véhicule < 30k km | 552 véhicules | ✅ Fonctionne |
| Prix entre 20k-30k$ | 328 véhicules | ✅ Fonctionne |
| Véhicule récent 2022+ | 698 véhicules | ✅ Fonctionne |
| Neuf + AWD | 8 véhicules | ⚠️ Peu de résultats |
| Filtres carrosserie après marque | Compteurs incorrects | ❌ BUG-02 |
| Slider prix | Max aberrant (2,4 Mrd) | ❌ BUG-01 |
| Transmission "automatic" en UI | Valeur en anglais | ❌ BUG-03 |

---

## 5. Qualité des données (audit)

| Champ | Véhicules avec données | Manquants (sur 200 testés) |
|-------|----------------------|--------------------------|
| `fuel_type` | 200/200 (100%) | 0 |
| `transmission` | 200/200 (100%) | 0 |
| `sale_price` | 200/200 (100%) | 0 (mais 3 aberrants) |
| `image_url` | 200/200 (100%) | 0 |
| `listing_url` | 200/200 (100%) | 0 |
| `body_type` | ~174/200 (87%) | ~26 (13%) |
| `drivetrain` | ~199/200 (99.5%) | ~1 |

**Priorité :** Améliorer l'extraction du `body_type` dans le crawler (impact direct sur la pertinence des filtres).

---

## 6. Roadmap suggérée

### Sprint 1 — Bugs (1-2 semaines)
1. ✅ **BUG-01** — Filtrer les prix aberrants (validation côté ingestion + borne max slider)
2. ✅ **BUG-02** — Filtres contextuels (adapter `/api/filters/options` pour accepter les paramètres actifs)
3. ✅ **BUG-03** — Traduire les valeurs de transmission en français dans l'affichage
4. ✅ **BUG-04** — Améliorer l'extraction `body_type` dans le crawler

### Sprint 2 — Quick Wins UX (1-2 semaines)
5. **UX-01** — Compteur résultats en temps réel dans la sidebar
6. **UX-02** — Chips filtres actifs avec suppression individuelle
7. **UX-03** — Message 0 résultats avec suggestions
8. **UX-05** — Fermeture overlay mobile

### Sprint 3 — Fonctionnalités (2-4 semaines)
9. **FEAT-02** — Page détail véhicule interne (`/vehicle/:id`)
10. **FEAT-01** — Comparateur côte-à-côte (l'API est prête)
11. **UX-04** — Histogramme prix dans le slider
12. **FEAT-05** — Filtre paiement mensuel

### Sprint 4 — Croissance (1-2 mois)
13. **FEAT-03** — Filtre géographique
14. **FEAT-04** — Alertes email
15. **FEAT-06** — Score qualité/prix

---

*Rapport généré à partir de tests automatisés Playwright et requêtes API directes.*
