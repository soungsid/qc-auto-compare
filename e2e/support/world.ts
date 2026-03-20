import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber'
import { Browser, BrowserContext, Page, chromium } from 'playwright'
import { ListingPage } from '../pages/ListingPage'
import { DealersPage } from '../pages/DealersPage'
import { VehiclePage } from '../pages/VehiclePage'

export interface ICustomWorld extends World {
  browser: Browser
  context: BrowserContext
  page: Page
  listingPage: ListingPage
  dealersPage: DealersPage
  vehiclePage: VehiclePage
  // Données capturées durant les scénarios
  capturedPrices: number[]
  capturedCount: number
}

export class CustomWorld extends World implements ICustomWorld {
  browser!: Browser
  context!: BrowserContext
  page!: Page
  listingPage!: ListingPage
  dealersPage!: DealersPage
  vehiclePage!: VehiclePage
  capturedPrices: number[] = []
  capturedCount: number = 0

  constructor(options: IWorldOptions) {
    super(options)
  }
}

setWorldConstructor(CustomWorld)
