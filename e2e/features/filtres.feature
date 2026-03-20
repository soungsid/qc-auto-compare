# language: fr
Fonctionnalité: Filtrage et recherche de véhicules
  En tant qu'acheteur potentiel au Québec
  Je veux filtrer les véhicules selon mon budget et mes préférences
  Afin de trouver rapidement les options qui me correspondent

  Contexte:
    Étant donné que je suis sur la page d'accueil

  @prix @slider
  Scénario: Définir une fourchette de prix avec les curseurs
    Quand je déplace le curseur de prix minimum à 15000
    Et je déplace le curseur de prix maximum à 35000
    Et j'applique les filtres
    Alors au moins un véhicule est affiché
    Et le nombre de résultats est visible

  @marque
  Scénario: Filtrer par marque Toyota
    Quand je sélectionne la marque "Toyota" dans la barre de filtres
    Alors au moins un véhicule est affiché
    Et la page ne contient pas d'erreur

  @condition
  Scénario: Filtrer les véhicules neufs seulement
    Quand je sélectionne le type "new" dans les filtres
    Alors au moins un véhicule est affiché

  @prix @barre
  Scénario: Saisir une fourchette de prix dans la barre de filtres
    Quand je saisis le prix minimum "10000" dans la barre de filtres
    Et je saisis le prix maximum "25000" dans la barre de filtres
    Alors au moins un véhicule est affiché

  @reinitialisation
  Scénario: Réinitialiser les filtres remet tout à zéro
    Quand je sélectionne la marque "Toyota" dans la barre de filtres
    Et je réinitialise les filtres via la barre
    Alors au moins un véhicule est affiché

  @kilometrage @slider
  Scénario: Filtrer par kilométrage maximum avec le curseur
    Quand je déplace le curseur de kilométrage maximum à 50000
    Et j'applique les filtres
    Alors au moins un véhicule est affiché
