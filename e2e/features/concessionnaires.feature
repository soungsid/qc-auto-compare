# language: fr
Fonctionnalité: Liste des concessionnaires
  En tant qu'acheteur
  Je veux consulter la liste des concessionnaires partenaires
  Afin de trouver un concessionnaire près de chez moi

  @concessionnaires @smoke
  Scénario: La page concessionnaires affiche des résultats
    Étant donné que je navigue vers la page des concessionnaires
    Alors au moins un concessionnaire est affiché
    Et les concessionnaires ont une localisation au Québec

  @concessionnaires @chargement
  Scénario: La page se charge sans erreur
    Étant donné que je navigue vers la page des concessionnaires
    Alors la page ne contient pas d'erreur
