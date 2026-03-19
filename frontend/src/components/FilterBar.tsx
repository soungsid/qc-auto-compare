import { useQuery } from '@tanstack/react-query'
import type { VehicleFilters } from '../types'
import { api } from '../api'

// Fallback values if API fails
const FALLBACK_MAKES = ['Chevrolet', 'Hyundai', 'Kia', 'Mitsubishi', 'Nissan', 'Toyota']
const FALLBACK_CONDITIONS = ['new', 'used', 'certified']
const FALLBACK_DRIVETRAINS = ['FWD', 'AWD', 'RWD', '4WD']
const FALLBACK_CITIES = ['Montréal', 'Laval', 'Brossard', 'Québec', 'Lévis']

// Generate year options from current year + 1 to 2015
const currentYear = new Date().getFullYear()
const FALLBACK_YEARS = Array.from({ length: currentYear - 2014 + 2 }, (_, i) => currentYear + 1 - i)

interface FilterOptions {
  makes: string[]
  conditions: string[]
  drivetrains: string[]
  transmissions: string[]
  cities: string[]
  years: number[]
  ingest_sources: string[]
  price_range: { min: number | null; max: number | null }
  mileage_range: { min: number | null; max: number | null }
}

/**
 * BUG #3 FIX: Hook to fetch dynamic filter options from the API
 */
function useFilterOptions() {
  return useQuery<FilterOptions>({
    queryKey: ['filterOptions'],
    queryFn: async () => {
      const response = await api.get('/api/filters/options')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  })
}

interface Props {
  filters: VehicleFilters
  onChange: (updated: Partial<VehicleFilters>) => void
  onReset: () => void
}

/**
 * Filter bar for the vehicle listing page.
 * BUG #3 FIX: Uses dynamic filter options from API instead of hardcoded values
 * BUG #4 FIX: Includes year_min, year_max, min_price, mileage_max filters
 */
export function FilterBar({ filters, onChange, onReset }: Props) {
  const { data: options, isLoading: optionsLoading } = useFilterOptions()
  
  const num = (val: string) => (val === '' ? undefined : Number(val))
  const str = (val: string) => (val === '' ? undefined : val)

  // Use API values or fallbacks
  const makes = options?.makes ?? FALLBACK_MAKES
  const conditions = options?.conditions ?? FALLBACK_CONDITIONS
  const drivetrains = options?.drivetrains ?? FALLBACK_DRIVETRAINS
  const cities = options?.cities ?? FALLBACK_CITIES
  const years = options?.years ?? FALLBACK_YEARS

  const selectClasses = "rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
  const inputClasses = "rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
  const labelClasses = "text-xs font-medium text-gray-500 dark:text-gray-400"

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition-colors" data-testid="filter-bar">
      <div className="flex flex-wrap items-end gap-3">

        {/* Make - BUG #3 FIX: Dynamic options */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Marque</label>
          <select
            className={selectClasses}
            value={filters.make ?? ''}
            onChange={(e) => onChange({ make: str(e.target.value), page: 1 })}
            data-testid="filter-make"
            disabled={optionsLoading}
          >
            <option value="">Toutes</option>
            {makes.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Modèle</label>
          <input
            type="text"
            placeholder="Ex: Kicks"
            className={`w-28 ${inputClasses}`}
            value={filters.model ?? ''}
            onChange={(e) => onChange({ model: str(e.target.value), page: 1 })}
            data-testid="filter-model"
          />
        </div>

        {/* Condition - BUG #3 FIX: Dynamic options */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>État</label>
          <select
            className={selectClasses}
            value={filters.condition ?? ''}
            onChange={(e) => onChange({ condition: str(e.target.value), page: 1 })}
            data-testid="filter-condition"
            disabled={optionsLoading}
          >
            <option value="">Tous</option>
            {conditions.map((c) => (
              <option key={c} value={c}>
                {c === 'new' ? 'Neuf' : c === 'used' ? 'Occasion' : c === 'certified' ? 'Certifié' : c}
              </option>
            ))}
          </select>
        </div>

        {/* Year Min - BUG #4 fix + BUG #3 dynamic */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Année min</label>
          <select
            className={selectClasses}
            value={filters.year_min ?? ''}
            onChange={(e) => onChange({ year_min: num(e.target.value), page: 1 })}
            data-testid="filter-year-min"
            disabled={optionsLoading}
          >
            <option value="">Toutes</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Year Max - BUG #4 fix + BUG #3 dynamic */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Année max</label>
          <select
            className={selectClasses}
            value={filters.year_max ?? ''}
            onChange={(e) => onChange({ year_max: num(e.target.value), page: 1 })}
            data-testid="filter-year-max"
            disabled={optionsLoading}
          >
            <option value="">Toutes</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Drivetrain - BUG #3 FIX: Dynamic options */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Traction</label>
          <select
            className={selectClasses}
            value={filters.drivetrain ?? ''}
            onChange={(e) => onChange({ drivetrain: str(e.target.value), page: 1 })}
            data-testid="filter-drivetrain"
            disabled={optionsLoading}
          >
            <option value="">Toutes</option>
            {drivetrains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* City - BUG #3 FIX: Dynamic options */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Ville</label>
          <select
            className={selectClasses}
            value={filters.city ?? ''}
            onChange={(e) => onChange({ city: str(e.target.value), page: 1 })}
            data-testid="filter-city"
            disabled={optionsLoading}
          >
            <option value="">Toutes</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Min price - BUG #4 fix */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Prix min ($)</label>
          <input
            type="number"
            placeholder={options?.price_range?.min ? `${Math.floor(options.price_range.min)}` : "Ex: 15000"}
            className={`w-28 ${inputClasses}`}
            value={filters.min_price ?? ''}
            onChange={(e) => onChange({ min_price: num(e.target.value), page: 1 })}
            data-testid="filter-min-price"
          />
        </div>

        {/* Max price */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Prix max ($)</label>
          <input
            type="number"
            placeholder={options?.price_range?.max ? `${Math.ceil(options.price_range.max)}` : "Ex: 50000"}
            className={`w-28 ${inputClasses}`}
            value={filters.max_price ?? ''}
            onChange={(e) => onChange({ max_price: num(e.target.value), page: 1 })}
            data-testid="filter-max-price"
          />
        </div>

        {/* Mileage max - BUG #4 fix */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Km max</label>
          <input
            type="number"
            placeholder={options?.mileage_range?.max ? `${options.mileage_range.max}` : "Ex: 50000"}
            className={`w-28 ${inputClasses}`}
            value={filters.mileage_max ?? ''}
            onChange={(e) => onChange({ mileage_max: num(e.target.value), page: 1 })}
            data-testid="filter-mileage-max"
          />
        </div>

        {/* Max monthly payment */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Pmt/mois max</label>
          <input
            type="number"
            placeholder="Ex: 350"
            className={`w-24 ${inputClasses}`}
            value={filters.max_monthly_payment ?? ''}
            onChange={(e) => onChange({ max_monthly_payment: num(e.target.value), page: 1 })}
            data-testid="filter-max-monthly"
          />
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          data-testid="filter-reset-btn"
          className="ml-auto rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-colors"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
