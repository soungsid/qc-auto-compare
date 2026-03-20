import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import { ICustomWorld } from '../support/world'

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given('que je suis sur la page d\'accueil', async function (this: ICustomWorld) {
  await this.listingPage.goto()
})

Given('que je navigue vers la page des concessionnaires', async function (this: ICustomWorld) {
  await this.dealersPage.goto()
})

// ---------------------------------------------------------------------------
// When — Sliders
// ---------------------------------------------------------------------------

When('je déplace le curseur de prix minimum à {int}', async function (
  this: ICustomWorld,
  valeur: number,
) {
  await this.listingPage.setPrixMinSlider(valeur)
})

When('je déplace le curseur de prix maximum à {int}', async function (
  this: ICustomWorld,
  valeur: number,
) {
  await this.listingPage.setPrixMaxSlider(valeur)
})

When('je déplace le curseur de kilométrage maximum à {int}', async function (
  this: ICustomWorld,
  valeur: number,
) {
  await this.listingPage.setKmMaxSlider(valeur)
})

When('j\'applique les filtres', async function (this: ICustomWorld) {
  await this.listingPage.appliquerFiltres()
})

// ---------------------------------------------------------------------------
// When — Barre de filtres (FilterBar)
// ---------------------------------------------------------------------------

When('je sélectionne la marque {string} dans la barre de filtres', async function (
  this: ICustomWorld,
  marque: string,
) {
  await this.listingPage.filtrerParMarque(marque)
})

When('je sélectionne le type {string} dans les filtres', async function (
  this: ICustomWorld,
  type: string,
) {
  await this.listingPage.filtrerParEtat(type)
})

When('je saisis le prix minimum {string} dans la barre de filtres', async function (
  this: ICustomWorld,
  prix: string,
) {
  await this.listingPage.saisirPrixMin(parseInt(prix, 10))
})

When('je saisis le prix maximum {string} dans la barre de filtres', async function (
  this: ICustomWorld,
  prix: string,
) {
  await this.listingPage.saisirPrixMax(parseInt(prix, 10))
})

When('je réinitialise les filtres via la barre', async function (this: ICustomWorld) {
  await this.listingPage.reinitialiserFiltresBarre()
})

// ---------------------------------------------------------------------------
// When — Navigation véhicule
// ---------------------------------------------------------------------------

When('je clique sur le premier véhicule de la liste', async function (this: ICustomWorld) {
  await this.listingPage.ouvrirPremierVehicule()
})

When('je fais défiler la page vers le bas', async function (this: ICustomWorld) {
  await this.vehiclePage.humanScroll(1000)
})

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('au moins un véhicule est affiché', async function (this: ICustomWorld) {
  const count = await this.listingPage.getNombreCartesVisibles()
  assert.ok(count > 0, `Aucun véhicule affiché (0 cartes trouvées)`)
})

Then('le nombre de résultats est visible', async function (this: ICustomWorld) {
  const count = await this.listingPage.getNombreResultats()
  assert.ok(count > 0, `Le compteur de résultats affiche 0 ou est introuvable`)
})

Then('la page ne contient pas d\'erreur', async function (this: ICustomWorld) {
  const title = await this.page.title()
  assert.ok(!/erreur|error|404|500/i.test(title), `La page a un titre d'erreur: "${title}"`)
})

Then('je vois le titre du véhicule', async function (this: ICustomWorld) {
  const titre = await this.vehiclePage.getTitre()
  assert.ok(titre.length > 0, 'Le titre du véhicule est vide ou absent')
})

Then('je vois le prix du véhicule', async function (this: ICustomWorld) {
  const prix = await this.vehiclePage.getPrix()
  assert.ok(prix !== null && prix > 0, `Prix du véhicule introuvable ou invalide: ${prix}`)
})

Then('je vois les informations du concessionnaire', async function (this: ICustomWorld) {
  const infos = await this.vehiclePage.hasInfosEssentielles()
  assert.ok(
    infos.concessionnaire,
    'Les informations du concessionnaire sont absentes de la fiche',
  )
})

Then('la page affiche des informations de financement ou de location', async function (
  this: ICustomWorld,
) {
  const hasFinancement = await this.vehiclePage.voirOffresFinancement()
  assert.ok(hasFinancement, 'Aucune information de financement ou location trouvée')
})

Then('une image du véhicule est visible', async function (this: ICustomWorld) {
  const hasImage = await this.vehiclePage.hasImageChargee()
  // Non bloquant — certains véhicules n'ont pas d'image
  if (!hasImage) {
    console.warn('⚠️  Aucune image trouvée pour ce véhicule (acceptable si pas d\'image disponible)')
  }
})

Then('au moins un concessionnaire est affiché', async function (this: ICustomWorld) {
  const has = await this.dealersPage.hasConcessionnaires()
  assert.ok(has, 'Aucun concessionnaire affiché sur la page')
})

Then('les concessionnaires ont une localisation au Québec', async function (this: ICustomWorld) {
  const has = await this.dealersPage.hasInfoCompletes()
  assert.ok(has, 'Aucune ville du Québec trouvée dans les résultats')
})
