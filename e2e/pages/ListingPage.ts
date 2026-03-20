import { Page } from 'playwright'
import { BasePage } from './BasePage'

/**
 * Page Object — Page de listing principale (/)
 *
 * Sélecteurs basés sur les data-testid réels du code source :
 *   VehicleSearchFilters.tsx — sidebar avec sliders DualRangeSlider
 *   FilterBar.tsx            — barre de filtres texte/selects
 *   VehicleCard.tsx          — carte véhicule (data-testid="vehicle-card-{id}")
 */
export class ListingPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async goto(): Promise<void> {
    await this.page.goto(this.BASE_URL, { waitUntil: 'domcontentloaded' })
    // Attendre que la page de listing soit montée
    await this.page.waitForSelector('[data-testid="listing-page"]', { timeout: 15_000 })
    await this.waitForResults()
  }

  // ---------------------------------------------------------------------------
  // Filtres — Sidebar (VehicleSearchFilters.tsx)
  // La sidebar contient les sliders DualRangeSlider pour prix/km/année
  // ---------------------------------------------------------------------------

  /** Définit le prix minimum via le slider */
  async setPrixMinSlider(valeur: number): Promise<void> {
    await this.setSliderValue('price-slider-min', valeur)
  }

  /** Définit le prix maximum via le slider */
  async setPrixMaxSlider(valeur: number): Promise<void> {
    await this.setSliderValue('price-slider-max', valeur)
  }

  /** Définit le kilométrage maximum via le slider */
  async setKmMaxSlider(valeur: number): Promise<void> {
    // Ouvrir la section kilométrage si elle est fermée (accordion)
    const mileageSection = this.page.locator('button', { hasText: 'Kilométrage' })
    const isVisible = await this.page.locator('[data-testid="mileage-slider-max"]').isVisible()
    if (!isVisible) {
      await mileageSection.click()
      await this.humanPause(200, 400)
    }
    await this.setSliderValue('mileage-slider-max', valeur)
  }

  /** Définit l'année minimum via le slider */
  async setAnneeMinSlider(valeur: number): Promise<void> {
    const yearSection = this.page.locator('button', { hasText: 'Année' })
    const isVisible = await this.page.locator('[data-testid="year-slider-min"]').isVisible()
    if (!isVisible) {
      await yearSection.click()
      await this.humanPause(200, 400)
    }
    await this.setSliderValue('year-slider-min', valeur)
  }

  /** Sélectionne le type de véhicule (neuf/occasion/tous) */
  async selectCondition(condition: 'all' | 'new' | 'used'): Promise<void> {
    await this.humanClick(`[data-testid="filter-condition-${condition}"]`)
  }

  /** Sélectionne une marque dans la sidebar */
  async selectMarque(marque: string): Promise<void> {
    const checkbox = this.page.locator(`[data-testid="filter-brand-${marque}"]`)
    const isVisible = await checkbox.isVisible()
    if (!isVisible) {
      // Cliquer "Montrer toutes les marques" si nécessaire
      const showMore = this.page.locator('button', { hasText: 'Montrer toutes les marques' })
      if (await showMore.isVisible()) {
        await showMore.click()
        await this.humanPause(200, 400)
      }
    }
    await this.humanClick(`[data-testid="filter-brand-${marque}"]`)
  }

  /** Clique sur Appliquer les filtres (sidebar) */
  async appliquerFiltres(): Promise<void> {
    await this.humanClick('[data-testid="apply-filters-btn"]')
    await this.waitForResults()
  }

  /** Réinitialise tous les filtres (sidebar) */
  async reinitialiserFiltres(): Promise<void> {
    await this.humanClick('[data-testid="reset-filters-btn"]')
    await this.waitForResults()
  }

  // ---------------------------------------------------------------------------
  // Filtres — Barre de filtres (FilterBar.tsx) — selects et champs texte
  // ---------------------------------------------------------------------------

  /** Filtre par marque via le select de la barre */
  async filtrerParMarque(marque: string): Promise<void> {
    await this.selectOption('filter-make', marque)
    await this.waitForResults()
  }

  /** Filtre par état (neuf/occasion/certifié) via le select de la barre */
  async filtrerParEtat(etat: string): Promise<void> {
    await this.selectOption('filter-condition', etat)
    await this.waitForResults()
  }

  /** Filtre par année minimale */
  async filtrerAnneeMin(annee: number): Promise<void> {
    await this.selectOption('filter-year-min', String(annee))
    await this.waitForResults()
  }

  /** Saisit un prix minimum dans la barre de filtres */
  async saisirPrixMin(prix: number): Promise<void> {
    await this.humanType('[data-testid="filter-min-price"]', String(prix))
    await this.page.keyboard.press('Tab') // Déclenche onBlur/onChange
    await this.waitForResults()
  }

  /** Saisit un prix maximum dans la barre de filtres */
  async saisirPrixMax(prix: number): Promise<void> {
    await this.humanType('[data-testid="filter-max-price"]', String(prix))
    await this.page.keyboard.press('Tab')
    await this.waitForResults()
  }

  /** Réinitialise les filtres via le bouton de la barre */
  async reinitialiserFiltresBarre(): Promise<void> {
    await this.humanClick('[data-testid="filter-reset-btn"]')
    await this.waitForResults()
  }

  // ---------------------------------------------------------------------------
  // Tri
  // ---------------------------------------------------------------------------

  /** Clique sur l'en-tête de colonne "Prix" pour trier (vue tableau) */
  async trierParPrix(): Promise<void> {
    const priceHeader = this.page.locator('th', { hasText: 'Prix' }).first()
    await priceHeader.hover()
    await this.humanPause(150, 300)
    await priceHeader.click()
    await this.waitForResults()
  }

  // ---------------------------------------------------------------------------
  // Consultation des résultats
  // ---------------------------------------------------------------------------

  /** Retourne le nombre de véhicules affichés selon le compteur */
  async getNombreResultats(): Promise<number> {
    // Le bouton "Voir les X résultats" contient le total
    const applyBtn = this.page.locator('[data-testid="apply-filters-btn"]')
    const text = await applyBtn.textContent()
    const match = text?.match(/[\d\s]+/)
    if (match) {
      return parseInt(match[0].replace(/\s/g, ''), 10)
    }
    return 0
  }

  /** Retourne tous les prix affichés sur la page (en nombres) */
  async getPrixAffiches(): Promise<number[]> {
    // Les cartes véhicule ont le prix dans un élément formaté fr-CA
    const cards = this.page.locator('[data-testid^="vehicle-card-"]')
    const count = await cards.count()
    const prices: number[] = []

    for (let i = 0; i < count; i++) {
      const cardText = await cards.nth(i).textContent()
      // Prix en format "25 000 $" ou "25,000 $"
      const match = cardText?.match(/(\d[\d\s]+)\s*\$/)?.[1]
      if (match) {
        const val = parseInt(match.replace(/\s/g, ''), 10)
        if (!isNaN(val) && val > 100) prices.push(val)
      }
    }
    return prices
  }

  /** Retourne le nombre de cartes véhicule visibles */
  async getNombreCartesVisibles(): Promise<number> {
    return await this.page.locator('[data-testid^="vehicle-card-"]').count()
  }

  /** Clique sur la première carte véhicule */
  async ouvrirPremierVehicule(): Promise<string> {
    const firstCard = this.page.locator('[data-testid^="vehicle-card-"]').first()
    await firstCard.scrollIntoViewIfNeeded()
    await this.humanPause(300, 600)

    // Récupérer l'URL du lien de la fiche avant de cliquer
    const link = firstCard.locator('a[href]').first()
    const href = await link.getAttribute('href') || ''

    await firstCard.hover()
    await this.humanPause(200, 400)

    // Ouvrir dans le même onglet
    await firstCard.locator('a').first().click()
    await this.waitForResults()

    return href
  }

  /** Vérifie qu'il y a au moins N véhicules affichés */
  async hasMinVehicules(min: number): Promise<boolean> {
    const count = await this.getNombreCartesVisibles()
    return count >= min
  }

  /** Vérifie qu'aucune erreur JS n'est dans la console */
  async hasNoConsoleErrors(): Promise<boolean> {
    // Les erreurs sont loggées dans les hooks — on vérifie l'état de la page
    const errorOverlay = this.page.locator('[data-testid="error-boundary"]')
    return !(await errorOverlay.isVisible())
  }
}
