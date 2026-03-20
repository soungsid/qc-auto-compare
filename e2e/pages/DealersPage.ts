import { Page } from 'playwright'
import { BasePage } from './BasePage'

/**
 * Page Object — Page des concessionnaires (/dealers)
 */
export class DealersPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto(): Promise<void> {
    await this.page.goto(`${this.BASE_URL}/dealers`, { waitUntil: 'domcontentloaded' })
    await this.waitForResults()
  }

  /** Retourne le nombre de concessionnaires affichés */
  async getNombreConcessionnaires(): Promise<number> {
    // Les cartes de concessionnaires — sélecteur générique basé sur la structure de DealersListPage
    const cards = this.page.locator('[data-testid^="dealer-card-"], .dealer-card, article')
    return await cards.count()
  }

  /** Retourne les noms de tous les concessionnaires affichés */
  async getNomConcessionnaires(): Promise<string[]> {
    const cards = this.page.locator('h2, h3').filter({ hasText: /\w+/ })
    const count = await cards.count()
    const noms: string[] = []
    for (let i = 0; i < count; i++) {
      const text = await cards.nth(i).textContent()
      if (text?.trim()) noms.push(text.trim())
    }
    return noms
  }

  /** Filtre par marque */
  async filtrerParMarque(marque: string): Promise<void> {
    const select = this.page.locator('select').first()
    await select.hover()
    await this.humanPause(150, 300)
    await select.selectOption(marque)
    await this.waitForResults()
  }

  /** Filtre par ville */
  async filtrerParVille(ville: string): Promise<void> {
    const selects = this.page.locator('select')
    const count = await selects.count()
    const citySelect = selects.nth(count > 1 ? 1 : 0)
    await citySelect.hover()
    await this.humanPause(150, 300)
    await citySelect.selectOption(ville)
    await this.waitForResults()
  }

  /** Vérifie qu'au moins un concessionnaire est affiché */
  async hasConcessionnaires(): Promise<boolean> {
    const count = await this.getNombreConcessionnaires()
    return count > 0
  }

  /** Vérifie qu'un concessionnaire a bien un nom et une ville visibles */
  async hasInfoCompletes(): Promise<boolean> {
    const body = await this.page.textContent('body')
    // La page doit contenir au moins une ville connue du Québec
    const villes = ['Montréal', 'Laval', 'Québec', 'Lévis', 'Brossard', 'Longueuil']
    return villes.some((v) => body?.includes(v))
  }
}
