# language: fr
Fonctionnalité: Consultation de la fiche d'un véhicule
  En tant qu'acheteur
  Je veux consulter la fiche complète d'un véhicule
  Afin de voir ses informations, son prix et les offres de financement

  Contexte:
    Étant donné que je suis sur la page d'accueil

  @fiche @smoke
  Scénario: Ouvrir la fiche du premier véhicule
    Quand je clique sur le premier véhicule de la liste
    Alors je vois le titre du véhicule
    Et je vois le prix du véhicule
    Et je vois les informations du concessionnaire

  @fiche @financement
  Scénario: Voir les offres de financement sur la fiche
    Quand je clique sur le premier véhicule de la liste
    Et je fais défiler la page vers le bas
    Alors la page affiche des informations de financement ou de location

  @fiche @image
  Scénario: La fiche affiche une image du véhicule
    Quand je clique sur le premier véhicule de la liste
    Alors une image du véhicule est visible
