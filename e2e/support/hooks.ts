import { Before, After, BeforeAll, AfterAll, Status } from '@cucumber/cucumber'
import { chromium, Browser } from 'playwright'
import { ICustomWorld } from './world'
import { ListingPage } from '../pages/ListingPage'
import { DealersPage } from '../pages/DealersPage'
import { VehiclePage } from '../pages/VehiclePage'
import * as fs from 'fs'
import * as path from 'path'

let sharedBrowser: Browser

// Lance le navigateur une seule fois pour toute la suite
BeforeAll(async () => {
  const headless = process.env.HEADLESS !== 'false'
  sharedBrowser = await chromium.launch({
    headless,
    slowMo: headless ? 60 : 150, // Plus lent en mode headed pour visualiser
  })

  // Créer le dossier de rapports si nécessaire
  const reportsDir = path.join(process.cwd(), 'e2e', 'reports')
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true })
})

AfterAll(async () => {
  await sharedBrowser?.close()
})

// Avant chaque scénario — nouvel onglet isolé
Before(async function (this: ICustomWorld, { pickle }) {
  this.browser = sharedBrowser

  this.context = await sharedBrowser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'fr-CA',
    timezoneId: 'America/Montreal',
    // Simule un vrai navigateur desktop
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  })

  this.page = await this.context.newPage()

  // Écouter les erreurs console pour les inclure dans le rapport
  this.page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.warn(`[Console Error] ${msg.text()}`)
    }
  })

  // Initialiser les page objects
  this.listingPage = new ListingPage(this.page)
  this.dealersPage = new DealersPage(this.page)
  this.vehiclePage = new VehiclePage(this.page)

  // Réinitialiser les données capturées
  this.capturedPrices = []
  this.capturedCount = 0
})

// Après chaque scénario — screenshot si échec
After(async function (this: ICustomWorld, { result, pickle }) {
  if (result?.status === Status.FAILED) {
    const screenshotDir = path.join(process.cwd(), 'e2e', 'reports', 'screenshots')
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true })

    const safeName = pickle.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)
    const screenshotPath = path.join(screenshotDir, `ECHEC_${safeName}_${Date.now()}.png`)

    const buffer = await this.page.screenshot({ fullPage: true })
    fs.writeFileSync(screenshotPath, buffer)

    // Attacher le screenshot au rapport Allure
    await this.attach(buffer, 'image/png')
    console.warn(`📸 Screenshot sauvegardé: ${screenshotPath}`)
  }

  await this.page?.close()
  await this.context?.close()
})
