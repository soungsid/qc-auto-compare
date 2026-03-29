import type { VehicleFilters } from '../types'

interface Props {
  filters: Partial<VehicleFilters>
  onRemove: (keys: (keyof VehicleFilters)[]) => void
  onReset: () => void
}

interface Chip {
  id: string
  label: string
  keys: (keyof VehicleFilters)[]
}

const TRANSMISSION_FR: Record<string, string> = {
  automatic: 'Automatique',
  manual: 'Manuelle',
}

const CONDITION_FR: Record<string, string> = {
  new: 'Neuf',
  used: 'Occasion',
}

function formatPrice(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k$` : `${v}$`
}

function formatKm(v: number) {
  return `${(v / 1000).toFixed(0)} 000 km`
}

function buildChips(filters: Partial<VehicleFilters>): Chip[] {
  const chips: Chip[] = []

  if (filters.make) {
    const label = filters.model ? `${filters.make} ${filters.model}` : filters.make
    chips.push({ id: 'make', label, keys: ['make', 'model'] })
  } else if (filters.model) {
    chips.push({ id: 'model', label: filters.model, keys: ['model'] })
  }

  if (filters.condition && filters.condition !== 'all') {
    chips.push({
      id: 'condition',
      label: CONDITION_FR[filters.condition] ?? filters.condition,
      keys: ['condition'],
    })
  }

  if (filters.body_type) {
    chips.push({ id: 'body_type', label: filters.body_type, keys: ['body_type'] })
  }

  if (filters.fuel_type) {
    chips.push({ id: 'fuel_type', label: filters.fuel_type, keys: ['fuel_type'] })
  }

  if (filters.transmission) {
    const label = TRANSMISSION_FR[filters.transmission.toLowerCase()] ?? filters.transmission
    chips.push({ id: 'transmission', label, keys: ['transmission'] })
  }

  if (filters.drivetrain) {
    chips.push({ id: 'drivetrain', label: filters.drivetrain, keys: ['drivetrain'] })
  }

  // Year range — combine into one chip
  if (filters.year_min || filters.year_max) {
    const label =
      filters.year_min && filters.year_max
        ? `${filters.year_min}–${filters.year_max}`
        : filters.year_min
        ? `${filters.year_min}+`
        : `≤ ${filters.year_max}`
    chips.push({ id: 'year', label, keys: ['year_min', 'year_max'] })
  }

  // Price range — combine into one chip
  if (filters.min_price || filters.max_price) {
    const label =
      filters.min_price && filters.max_price
        ? `${formatPrice(filters.min_price)}–${formatPrice(filters.max_price)}`
        : filters.min_price
        ? `≥ ${formatPrice(filters.min_price)}`
        : `≤ ${formatPrice(filters.max_price!)}`
    chips.push({ id: 'price', label, keys: ['min_price', 'max_price'] })
  }

  if (filters.mileage_max) {
    chips.push({ id: 'mileage', label: `≤ ${formatKm(filters.mileage_max)}`, keys: ['mileage_max'] })
  }

  if (filters.city) {
    chips.push({ id: 'city', label: filters.city, keys: ['city'] })
  }

  return chips
}

export function ActiveFilterChips({ filters, onRemove, onReset }: Props) {
  const chips = buildChips(filters)
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="active-filter-chips">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onRemove(chip.keys)}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors min-h-[36px]"
          data-testid={`chip-${chip.id}`}
        >
          {chip.label}
          <span className="text-zinc-400 dark:text-zinc-500 leading-none" aria-label="Supprimer ce filtre">×</span>
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 underline transition-colors"
          data-testid="chip-reset-all"
        >
          Effacer tout
        </button>
      )}
    </div>
  )
}
