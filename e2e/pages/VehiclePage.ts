import { Page } from 'playwright'
import { BasePage } from './BasePage'

/**
 * Page Object — Fiche individuelle d'un véhicule
 */
export class VehiclePage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  /** Retourne le titre du véhicule (marque + modèle) */
  async getTitre(): Promise<string> {
    const h1 = this.page.locator('h1').first()
    await h1.waitFor({ timeout: 10_000 })
    return (await h1.textContent()) || ''
  }

  /** Retourne le prix du véhicule affiché */
  async getPrix(): Promise<number | null> {
    const body = await this.page.textContent('body')
    const match = body?.match(/(\d[\d\s]{3,})\s*\$/)
    if (match) {
      return parseInt(match[1].replace(/\s/g, ''), 10)
    }
    return null
  }

  /** Vérifie que la fiche contient les informations essentielles */
  async hasInfosEssentielles(): Promise<{ titre: boolean; prix: boolean; concessionnaire: boolean }> {
    const body = await this.page.textContent('body')
    return {
      titre: (await this.page.locator('h1').count()) > 0,
      prix: /\d[\d\s]+\s*\$/.test(body || ''),
      concessionnaire: /concessionnaire|dealer/i.test(body || ''),
    }
  }

  /** Vérifie que l'image du véhicule est chargée */
  async hasImageChargee(): Promise<boolean> {
    const img = this.page.locator('img').first()
    if (!(await img.isVisible())) return false
    return await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalHeight > 0)
  }

  /** Scroll pour voir le détail du financement */
  async voirOffresFinancement(): Promise<boolean> {
    await this.humanScroll(800)
    const body = await this.page.textContent('body')
    return /location|financement|bail|mensuel/i.test(body || '')
  }
}
