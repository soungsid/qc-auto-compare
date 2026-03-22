// ---------------------------------------------------------------------------
// Domain types matching the FastAPI response schemas
// ---------------------------------------------------------------------------

export interface Dealer {
  id: string
  slug: string
  name: string
  brand: string
  city?: string
  phone?: string
  address?: string
  website?: string
  inventory_url?: string
  last_crawled_at?: string
}

export interface LeaseOffer {
  id: string
  offer_type?: string        // lease | finance | cash
  term_months?: number
  payment_amount?: number
  payment_frequency?: string // monthly | biweekly | weekly
  down_payment?: number
  annual_km?: number
  interest_rate_pct?: number
  offer_expiry?: string
}

export interface Vehicle {
  id: string
  fingerprint: string
  make: string
  model: string
  trim?: string
  year: number
  condition: string
  color_ext?: string
  color_int?: string
  drivetrain?: string
  transmission?: string
  mileage_km: number
  vin?: string
  stock_number?: string
  msrp?: number
  sale_price?: number
  freight_pdi?: number
  listing_url?: string
  image_url?: string
  ingest_source: string
  is_active: boolean
  last_seen_at?: string
  created_at: string
  updated_at?: string
  dealer?: Dealer
  lease_offers: LeaseOffer[]
}

export interface VehicleListResponse {
  total: number
  page: number
  limit: number
  items: Vehicle[]
}

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

export interface VehicleFilters {
  make?: string
  model?: string
  trim?: string
  condition?: string
  body_type?: string
  fuel_type?: string
  transmission?: string
  drivetrain?: string
  city?: string
  min_price?: number
  max_price?: number
  year_min?: number
  year_max?: number
  mileage_max?: number
  max_monthly_payment?: number
  payment_frequency?: string
  ingest_source?: string
  sort: string
  order: 'asc' | 'desc'
  page: number
  limit: number
}

export const DEFAULT_FILTERS: VehicleFilters = {
  sort: 'sale_price',
  order: 'asc',
  page: 1,
  limit: 50,
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface StatsResponse {
  total_vehicles: number
  active_vehicles: number
  total_dealers: number
  vehicles_by_source: Record<string, number>
  last_updated_at?: string
}
