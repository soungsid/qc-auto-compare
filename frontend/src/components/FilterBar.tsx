import type { VehicleFilters } from '../types'

interface Props {
  filters: VehicleFilters
  onChange: (updated: Partial<VehicleFilters>) => void
  onReset: () => void
}

const MAKES = ['', 'Chevrolet', 'Hyundai', 'Kia', 'Mitsubishi', 'Nissan', 'Toyota']
const DRIVETRAINS = ['', 'FWD', 'AWD', 'RWD', '4WD']
const CONDITIONS = ['', 'new', 'used', 'certified']
const CITIES = ['', 'Montréal', 'Laval', 'Brossard', 'Québec', 'Lévis']

// Generate year options from current year + 1 to 2015
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2014 + 2 }, (_, i) => currentYear + 1 - i)

/**
 * Filter bar for the vehicle listing page.
 * Calls onChange with partial filter updates on every input change.
 * BUG #4 fix: Added year_min, year_max, mileage_max filters
 */
export function FilterBar({ filters, onChange, onReset }: Props) {
  const num = (val: string) => (val === '' ? undefined : Number(val))
  const str = (val: string) => (val === '' ? undefined : val)

  const selectClasses = "rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
  const inputClasses = "rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
  const labelClasses = "text-xs font-medium text-gray-500 dark:text-gray-400"

  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm transition-colors" data-testid="filter-bar">
      <div className="flex flex-wrap items-end gap-3">

        {/* Make */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Marque</label>
          <select
            className={selectClasses}
            value={filters.make ?? ''}
            onChange={(e) => onChange({ make: str(e.target.value), page: 1 })}
            data-testid="filter-make"
          >
            {MAKES.map((m) => (
              <option key={m} value={m}>{m || 'Toutes'}</option>
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

        {/* Condition */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>État</label>
          <select
            className={selectClasses}
            value={filters.condition ?? ''}
            onChange={(e) => onChange({ condition: str(e.target.value), page: 1 })}
            data-testid="filter-condition"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c === '' ? 'Tous' : c === 'new' ? 'Neuf' : c === 'used' ? 'Occasion' : 'Certifié'}
              </option>
            ))}
          </select>
        </div>

        {/* Year Min - BUG #4 fix */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Année min</label>
          <select
            className={selectClasses}
            value={filters.year_min ?? ''}
            onChange={(e) => onChange({ year_min: num(e.target.value), page: 1 })}
            data-testid="filter-year-min"
          >
            <option value="">Toutes</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Year Max - BUG #4 fix */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Année max</label>
          <select
            className={selectClasses}
            value={filters.year_max ?? ''}
            onChange={(e) => onChange({ year_max: num(e.target.value), page: 1 })}
            data-testid="filter-year-max"
          >
            <option value="">Toutes</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Drivetrain */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Traction</label>
          <select
            className={selectClasses}
            value={filters.drivetrain ?? ''}
            onChange={(e) => onChange({ drivetrain: str(e.target.value), page: 1 })}
            data-testid="filter-drivetrain"
          >
            {DRIVETRAINS.map((d) => (
              <option key={d} value={d}>{d || 'Toutes'}</option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Ville</label>
          <select
            className={selectClasses}
            value={filters.city ?? ''}
            onChange={(e) => onChange({ city: str(e.target.value), page: 1 })}
            data-testid="filter-city"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c || 'Toutes'}</option>
            ))}
          </select>
        </div>

        {/* Min price - BUG #4 fix */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Prix min ($)</label>
          <input
            type="number"
            placeholder="Ex: 15000"
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
            placeholder="Ex: 30000"
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
            placeholder="Ex: 50000"
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
