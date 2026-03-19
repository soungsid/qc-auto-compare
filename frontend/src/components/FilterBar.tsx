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

/**
 * Filter bar for the vehicle listing page.
 * Calls onChange with partial filter updates on every input change.
 */
export function FilterBar({ filters, onChange, onReset }: Props) {
  const num = (val: string) => (val === '' ? undefined : Number(val))
  const str = (val: string) => (val === '' ? undefined : val)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">

        {/* Make */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Marque</label>
          <select
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.make ?? ''}
            onChange={(e) => onChange({ make: str(e.target.value), page: 1 })}
          >
            {MAKES.map((m) => (
              <option key={m} value={m}>{m || 'Toutes'}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Modèle</label>
          <input
            type="text"
            placeholder="Ex: Kicks"
            className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.model ?? ''}
            onChange={(e) => onChange({ model: str(e.target.value), page: 1 })}
          />
        </div>

        {/* Condition */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Condition</label>
          <select
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.condition ?? ''}
            onChange={(e) => onChange({ condition: str(e.target.value), page: 1 })}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c === '' ? 'Toutes' : c === 'new' ? 'Neuf' : c === 'used' ? 'Usagé' : 'Certifié'}</option>
            ))}
          </select>
        </div>

        {/* Drivetrain */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Traction</label>
          <select
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.drivetrain ?? ''}
            onChange={(e) => onChange({ drivetrain: str(e.target.value), page: 1 })}
          >
            {DRIVETRAINS.map((d) => (
              <option key={d} value={d}>{d || 'Toutes'}</option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Ville</label>
          <select
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.city ?? ''}
            onChange={(e) => onChange({ city: str(e.target.value), page: 1 })}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c || 'Toutes'}</option>
            ))}
          </select>
        </div>

        {/* Max price */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Prix max ($)</label>
          <input
            type="number"
            placeholder="Ex: 30000"
            className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.max_price ?? ''}
            onChange={(e) => onChange({ max_price: num(e.target.value), page: 1 })}
          />
        </div>

        {/* Max monthly payment */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Pmt/mois max ($)</label>
          <input
            type="number"
            placeholder="Ex: 350"
            className="w-32 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.max_monthly_payment ?? ''}
            onChange={(e) => onChange({ max_monthly_payment: num(e.target.value), page: 1 })}
          />
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          className="ml-auto rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
