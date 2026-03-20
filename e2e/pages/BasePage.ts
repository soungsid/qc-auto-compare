import { Page } from 'playwright'

/**
 * Page de base — utilitaires communs + simulation comportement humain
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  protected readonly BASE_URL = process.env.QA_BASE_URL || 'https://auto.canadaquebec.ca'

  // ---------------------------------------------------------------------------
  // Simulation comportement humain
  // ---------------------------------------------------------------------------

  /**
   * Pause aléatoire entre minMs et maxMs — simule le temps de réflexion humain
   */
  async humanPause(minMs = 300, maxMs = 800): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs
    await this.page.waitForTimeout(delay)
  }

  /**
   * Clic humain : hover → pause → clic
   */
  async humanClick(selector: string): Promise<void> {
    const el = this.page.locator(selector)
    await el.scrollIntoViewIfNeeded()
    await el.hover()
    await this.humanPause(100, 250)
    await el.click()
    await this.humanPause(200, 500)
  }

  /**
   * Saisie humaine : clic → pause → frappe caractère par caractère
   */
  async humanType(selector: string, text: string): Promise<void> {
    const el = this.page.locator(selector)
    await el.click()
    await this.humanPause(150, 300)
    await el.clear()
    // Frappe lettre par lettre avec délai variable
    for (const char of text) {
      await this.page.keyboard.type(char)
      await this.page.waitForTimeout(Math.random() * 80 + 40)
    }
    await this.humanPause(200, 400)
  }

  /**
   * Interaction avec un <input type="range"> (slider HTML natif)
   *
   * Stratégie :
   * 1. Hover sur le slider pour montrer l'intention
   * 2. Utilise evaluate() pour définir la valeur précisément
   *    (les sliders overlappants rendent le drag physique peu fiable)
   * 3. Dispatch les événements 'input' et 'change' pour déclencher
   *    les callbacks React (onChange dans DualRangeSlider)
   */
  async setSliderValue(testId: string, value: number): Promise<void> {
    const slider = this.page.locator(`[data-testid="${testId}"]`)

    await slider.scrollIntoViewIfNeeded()
    await slider.hover()
    await this.humanPause(200, 400)

    // Vérifier que le slider est bien présent et récupérer ses attributs
    const { min, max } = await slider.evaluate((el: HTMLInputElement) => ({
      min: parseFloat(el.min) || 0,
      max: parseFloat(el.max) || 100,
    }))

    // Clamp la valeur dans les bornes du slider
    const clamped = Math.min(Math.max(value, min), max)

    // Simuler un mouvement progressif (d'abord vers une valeur intermédiaire)
    const intermediary = Math.round((parseFloat(String(min)) + clamped) / 2)
    await slider.evaluate((el: HTMLInputElement, val) => {
      el.value = String(val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    }, intermediary)

    await this.humanPause(150, 300)

    // Puis la valeur finale
    await slider.evaluate((el: HTMLInputElement, val) => {
      el.value = String(val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, clamped)

    await this.humanPause(300, 600)
  }

  /**
   * Sélectionne une option dans un <select>
   */
  async selectOption(testId: string, value: string): Promise<void> {
    const select = this.page.locator(`[data-testid="${testId}"]`)
    await select.scrollIntoViewIfNeeded()
    await select.hover()
    await this.humanPause(150, 300)
    await select.selectOption(value)
    await this.humanPause(400, 800)
  }

  /**
   * Attend que le réseau soit calme (fin de chargement des données)
   */
  async waitForResults(): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 })
    await this.humanPause(400, 700)
  }

  /**
   * Scroll progressif vers le bas — simule un utilisateur qui parcourt la page
   */
  async humanScroll(pixelsDown = 600): Promise<void> {
    await this.humanPause(300, 500)
    await this.page.mouse.wheel(0, pixelsDown / 3)
    await this.humanPause(100, 200)
    await this.page.mouse.wheel(0, pixelsDown / 3)
    await this.humanPause(100, 200)
    await this.page.mouse.wheel(0, pixelsDown / 3)
    await this.humanPause(200, 400)
  }
}
