# Amélioration du Crawler - Extraction body_type

## Objectif

Améliorer les spiders Scrapy pour extraire automatiquement le **type de carrosserie** (body_type) des pages de véhicules.

## Types de carrosserie à détecter

Les valeurs possibles pour `body_type` sont :
- **Berline** - 4 portes avec coffre séparé
- **VUS** - Véhicule utilitaire sport (SUV)
- **Coupé** - 2 portes sportif
- **Hayon** - Hatchback, 5 portes avec coffre intégré
- **Camion** - Pickup truck
- **Cabriolet** - Convertible
- **Commercial** - Véhicule commercial/travail
- **Fourgonnette** - Minivan, van

## Stratégies d'extraction

### 1. Recherche par mots-clés dans le texte

La plupart des sites affichent le type de carrosserie dans :
- Le titre du véhicule
- La description
- Les caractéristiques techniques
- Les balises meta

**Patterns de détection (regex) :**

```python
BODY_TYPE_PATTERNS = {
    'VUS': r'\b(vus|suv|utilitaire sport)\b',
    'Berline': r'\b(berline|sedan)\b',
    'Coupé': r'\b(coup[ée]|coupe)\b',
    'Hayon': r'\b(hayon|hatchback|5\s*portes)\b',
    'Camion': r'\b(camion|pickup|pick-up|truck)\b',
    'Cabriolet': r'\b(cabriolet|convertible|décapotable)\b',
    'Commercial': r'\b(commercial|cargo|travail)\b',
    'Fourgonnette': r'\b(fourgonnette|minivan|van)\b',
}

def extract_body_type(text: str) -> Optional[str]:
    """
    Extrait le type de carrosserie d'un texte.
    """
    import re
    text = text.lower()
    
    for body_type, pattern in BODY_TYPE_PATTERNS.items():
        if re.search(pattern, text, re.IGNORECASE):
            return body_type
    
    return None
```

### 2. Extraction depuis selectors CSS

**Exemple pour un site Nissan :**

```python
class NissanSpider(scrapy.Spider):
    name = 'nissan'
    
    def parse_vehicle(self, response):
        # Méthode 1: Depuis un span/div spécifique
        body_type = response.css('.vehicle-specs .body-style::text').get()
        
        # Méthode 2: Depuis la description complète
        if not body_type:
            description = response.css('.vehicle-description::text').get()
            body_type = extract_body_type(description)
        
        # Méthode 3: Depuis le titre
        if not body_type:
            title = response.css('h1.vehicle-title::text').get()
            body_type = extract_body_type(title)
        
        # Méthode 4: Depuis structured data (JSON-LD)
        if not body_type:
            jsonld = response.css('script[type="application/ld+json"]::text').get()
            if jsonld:
                data = json.loads(jsonld)
                body_type = data.get('bodyType') or data.get('vehicleModelType')
        
        yield {
            'make': ...,
            'model': ...,
            'body_type': body_type,
            # ...
        }
```

### 3. Détection par modèle de véhicule (Fallback)

Si l'extraction échoue, utiliser un mapping connu :

```python
# crawler/body_type_mapping.py

MODEL_TO_BODY_TYPE = {
    # Nissan
    'Kicks': 'VUS',
    'Rogue': 'VUS',
    'Pathfinder': 'VUS',
    'Sentra': 'Berline',
    'Altima': 'Berline',
    'Versa': 'Berline',
    'GT-R': 'Coupé',
    'Z': 'Coupé',
    'Frontier': 'Camion',
    'Titan': 'Camion',
    'Leaf': 'Hayon',
    
    # Toyota
    'Corolla': 'Berline',
    'Camry': 'Berline',
    'RAV4': 'VUS',
    'Highlander': 'VUS',
    '4Runner': 'VUS',
    'Tacoma': 'Camion',
    'Tundra': 'Camion',
    'Prius': 'Hayon',
    'Sienna': 'Fourgonnette',
    'GR86': 'Coupé',
    
    # Hyundai
    'Elantra': 'Berline',
    'Sonata': 'Berline',
    'Tucson': 'VUS',
    'Santa Fe': 'VUS',
    'Palisade': 'VUS',
    'Kona': 'VUS',
    'Venue': 'VUS',
    'Ioniq 5': 'VUS',
    
    # Kia
    'Forte': 'Berline',
    'K5': 'Berline',
    'Sportage': 'VUS',
    'Sorento': 'VUS',
    'Telluride': 'VUS',
    'Seltos': 'VUS',
    'Soul': 'Hayon',
    'Carnival': 'Fourgonnette',
    'EV6': 'VUS',
    
    # ... (ajouter plus de marques/modèles)
}

def get_body_type_from_model(make: str, model: str) -> Optional[str]:
    """
    Récupère le body_type depuis le mapping de modèles.
    """
    # Normaliser le nom du modèle
    model_normalized = model.strip().title()
    return MODEL_TO_BODY_TYPE.get(model_normalized)
```

### 4. Intégration complète dans le spider

```python
# crawler/spiders/nissan_spider.py

from crawler.body_type_mapping import get_body_type_from_model, extract_body_type

class NissanSpider(scrapy.Spider):
    name = 'nissan_improved'
    
    def parse_vehicle(self, response):
        make = response.css('.vehicle-make::text').get() or 'Nissan'
        model = response.css('.vehicle-model::text').get()
        
        # Stratégie 1: Extraction depuis CSS selector
        body_type = response.css('.vehicle-specs .body-style::text').get()
        
        # Stratégie 2: Extraction depuis texte complet
        if not body_type:
            full_text = ' '.join(response.css('.vehicle-details::text').getall())
            body_type = extract_body_type(full_text)
        
        # Stratégie 3: Depuis JSON-LD structured data
        if not body_type:
            try:
                jsonld = response.css('script[type="application/ld+json"]::text').get()
                if jsonld:
                    data = json.loads(jsonld)
                    body_type = data.get('bodyType')
            except:
                pass
        
        # Stratégie 4: Fallback - mapping de modèles
        if not body_type and model:
            body_type = get_body_type_from_model(make, model)
        
        yield {
            'make': make,
            'model': model,
            'body_type': body_type,  # ✅ Nouveau champ
            'year': ...,
            'price': ...,
            # ... autres champs
        }
```

## Tests

### Test unitaire pour extraction

```python
# tests/test_body_type_extraction.py

import pytest
from crawler.body_type_mapping import extract_body_type, get_body_type_from_model

def test_extract_body_type_from_text():
    assert extract_body_type("Nissan Kicks VUS 2024") == "VUS"
    assert extract_body_type("Toyota Camry Berline 4 portes") == "Berline"
    assert extract_body_type("Ford F-150 Pickup Truck") == "Camion"
    assert extract_body_type("Mazda MX-5 Cabriolet") == "Cabriolet"
    assert extract_body_type("Kia Soul Hayon 5 portes") == "Hayon"

def test_get_body_type_from_model():
    assert get_body_type_from_model("Nissan", "Kicks") == "VUS"
    assert get_body_type_from_model("Toyota", "Camry") == "Berline"
    assert get_body_type_from_model("Hyundai", "Tucson") == "VUS"
    assert get_body_type_from_model("Kia", "Carnival") == "Fourgonnette"
```

## Validation des données

Après extraction, valider que les body_type sont cohérents :

```bash
# Vérifier la distribution des body_types extraits
cd /app/backend
python -c "
from app.db.database import SessionLocal
from app.db.models import Vehicle
from sqlalchemy import func

db = SessionLocal()
result = db.query(Vehicle.body_type, func.count(Vehicle.id)).group_by(Vehicle.body_type).all()
for body_type, count in result:
    print(f'{body_type}: {count}')
"
```

**Résultat attendu :**
```
VUS: 1416
Berline: 843
Camion: 267
Hayon: 189
Coupé: 56
Cabriolet: 23
Fourgonnette: 18
Commercial: 12
None: 45  # ← À corriger manuellement
```

## Amélioration continue

1. **Collecter les cas manquants** - Logger les véhicules sans body_type
2. **Enrichir le mapping** - Ajouter nouveaux modèles au fur et à mesure
3. **Machine Learning (futur)** - Entraîner un modèle de classification si volume élevé

## Fichiers à modifier

- `/app/crawler/body_type_mapping.py` - Nouveau fichier avec mapping et extraction
- `/app/crawler/spiders/nissan_spider.py` - Ajouter extraction body_type
- `/app/crawler/spiders/toyota_spider.py` - Ajouter extraction body_type
- `/app/crawler/spiders/hyundai_spider.py` - Ajouter extraction body_type
- (Tous les autres spiders...)

## Exécution

```bash
cd /app/crawler
scrapy crawl nissan_improved -o output.json

# Vérifier les body_types extraits
cat output.json | jq '.[] | {model: .model, body_type: .body_type}'
```

---

**Note :** Cette amélioration nécessite de tester spider par spider, car chaque site a sa propre structure HTML.
