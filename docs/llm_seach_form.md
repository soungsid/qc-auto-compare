Crée un composant React de barre de recherche/filtres pour un site de vente de véhicules d'occasion,
inspiré du site HGrégoire. Utilise Tailwind CSS. Voici toutes les spécifications :

---

## COMPORTEMENT RESPONSIVE

### Desktop (≥ 1024px)
- La barre de filtres est une colonne verticale fixe à GAUCHE du listing (sidebar).
- Largeur : ~280px. Le listing de véhicules occupe le reste à droite.
- Toutes les sections sont visibles et dépliées par défaut.
- Un bouton "Réinitialiser" est visible en haut de la sidebar.

### Mobile (< 1024px)
- La barre de filtres est CACHÉE par défaut.
- Un bouton "Filtres" flottant ou en haut du listing permet de l'ouvrir.
- Quand ouverte, la barre s'affiche en overlay ou en accordéon au-dessus du listing.
- Quand l'utilisateur clique "Voir les résultats" / soumet les filtres, la barre se FERME automatiquement.
- Un bouton "Modifier les filtres" ou une icône filtre reste toujours visible pour rouvrir le panneau.
- Afficher le nombre de filtres actifs sur le bouton d'ouverture (ex: "Filtres (3)").

---

## SECTIONS DE FILTRES

Chaque section a :
- Un titre en gras avec une icône chevron pour la réduire/déplier (accordéon).
- Un séparateur horizontal entre les sections.
- Les sélections actives sont visuellement mises en évidence (fond coloré, coche visible).

### 1. Type de véhicule
Type : Radio buttons (choix unique)
Options :
- Véhicules d'occasion (sélectionné par défaut)
- Véhicules neufs (spéciaux)

### 2. Marque & Modèle
Type : Checkboxes hiérarchiques sur 2 niveaux
- Niveau 1 : Marque (avec compteur entre parenthèses, ex: "Nissan (544)")
- Niveau 2 : Modèles sous chaque marque (indentés, avec compteur, ex: "Rogue (159)")
- Cliquer sur une marque la déploie et affiche ses modèles.
- On peut sélectionner une marque entière OU des modèles individuels.
- Afficher les 8 premières marques, avec un bouton "Montrer toutes les marques" / "Montrer moins".
- Exemple de données :
  Nissan (544) > Kicks (116), Qashqai (94), Rogue (159), Sentra (71), Leaf (22), ARIYA (17), MICRA (16), Versa (15)
  Hyundai (303) > Elantra (81), Tucson (60), Kona (60), Santa Fe (37), Venue (21)
  Kia (261) > Forte (49), Sportage (60), Seltos (43), Sorento (26), Niro (21)
  Ford (154) > Escape (57), F150 (19), Mustang (17), EDGE (11), Explorer (6)
  Toyota (137) > Corolla (45), Rav4 (24), Camry (14), Highlander (10), Sienna (9)
  Chevrolet (115) > Equinox (28), Spark (14), Silverado 1500 (10), Trailblazer (8), Malibu (7)
  Jeep (177) > Wrangler (102), Compass (23), Cherokee (12), Grand Cherokee (11)

### 3. Type de carrosserie
Type : Checkboxes visuelles avec icône SVG + label + compteur
Disposition : grille 2x4 (2 colonnes sur mobile, 2 colonnes sur desktop)
Options :
- Berline (500)
- VUS (1416)
- Coupé (52)
- Hayon (362)
- Camion (108)
- Cabriolet (49)
- Commercial (25)
- Fourgonnette (88)
Chaque option = une carte cliquable avec bordure, icône centrée, label et nombre.
Quand sélectionnée : bordure colorée (ex: bleu) + fond légèrement coloré.
Utiliser de simples SVG inline ou des emojis pour représenter les silhouettes de véhicules.

### 4. Prix
Type : Slider de plage à double poignée (range slider)
Plage : 0 $ → 70 000 $
Afficher les valeurs min/max sélectionnées au-dessus ou sous le slider.
Pas suggéré : 500 $

### 5. Kilométrage
Type : Slider de plage à double poignée
Plage : 0 km → 150 000 km
Afficher les valeurs min/max sélectionnées.
Pas suggéré : 5 000 km

### 6. Année
Type : Slider de plage à double poignée
Plage : 2000 → 2026
Afficher les années min/max sélectionnées.
Pas suggéré : 1 an

### 7. Transmission
Type : Checkboxes simples
Options :
- Automatique (2522)
- Manuelle (78)

### 8. Traction
Type : Checkboxes simples
Options :
- Traction arrière (93)
- Traction avant (1018)
- Traction intégrale (1489)

### 9. Carburant
Type : Checkboxes simples
Options :
- Essence (2269)
- Diesel (13)
- Électrique (179)
- Hybride (139)

### 10. Couleur
Type : Sélecteur visuel de pastilles de couleur (cercles colorés cliquables)
Couleurs communes : Noir, Blanc, Gris, Argent, Bleu, Rouge, Brun, Vert, Orange, Jaune, Beige
Quand sélectionnée : anneau de sélection autour de la pastille.

---

## BOUTON DE SOUMISSION

- Texte : "Voir les résultats →"
- Fixé en bas de la sidebar sur desktop.
- Sur mobile : apparaît en bas du panneau de filtres, clique → ferme le panneau.
- Afficher le nombre de résultats trouvés dynamiquement si possible (ex: "Voir les 2 600 résultats").

---

## STYLE GÉNÉRAL

- Fond de la sidebar : blanc (#FFFFFF) avec légère ombre à droite sur desktop.
- Titres de section : texte gras, taille 0.85rem, uppercase ou small-caps, couleur grise foncée.
- Séparateurs : ligne grise claire (border-gray-200).
- Checkboxes : utiliser des checkboxes stylisées (pas les natives du navigateur).
  Coche active : fond bleu (#0066CC ou similaire), icône ✓ blanche.
- Compteurs : texte gris clair entre parenthèses à côté du label.
- Accordéon : animation de height ou opacity pour le dépliage.
- Bouton "Réinitialiser" : lien texte rouge ou gris en haut, reset tous les filtres.
- Mobile overlay : fond semi-transparent derrière le panneau de filtres.

---

## ÉTAT (STATE MANAGEMENT)

Gérer l'état local avec useState pour :
- filters : objet contenant toutes les sélections actives
- openSections : quelles sections sont dépliées
- showAllBrands : booléen pour afficher toutes les marques
- mobileOpen : booléen pour l'ouverture mobile du panneau
- expandedBrands : quelles marques sont dépliées dans la section Marque & Modèle

Fonction onFiltersChange(filters) appelée à chaque modification ou à la soumission.

---

## CONTRAINTES TECHNIQUES

- React avec hooks (useState, useCallback).
- Tailwind CSS uniquement pour les styles.
- Aucune dépendance externe sauf React et Tailwind.
- Le composant s'appelle <VehicleSearchFilters /> et accepte une prop onSearch(filters).
- Le double range slider peut être implémenté avec deux inputs range superposés ou une lib légère.
- Responsive : lg:flex-row flex-col pour le layout parent (sidebar + listing).
- Accessibilité de base : labels associés aux inputs, aria-expanded sur les accordéons.