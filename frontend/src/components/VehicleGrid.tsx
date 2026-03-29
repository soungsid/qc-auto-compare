import type { Vehicle, VehicleFilters } from '../types'
import { VehicleCard } from './VehicleCard'

interface Props {
  data: Vehicle[]
  total: number
  filters: VehicleFilters
  onFiltersChange: (updated: Partial<VehicleFilters>) => void
  isLoading?: boolean
}

export function VehicleGrid({ data, total, filters, onFiltersChange, isLoading }: Props) {
  const totalPages = Math.ceil(total / filters.limit)

  return (
    <div className="flex flex-col gap-3" data-testid="vehicle-grid">
      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-brand-400 dark:text-brand-500">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Chargement des véhicules…
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-brand-400 dark:text-brand-500">
          Aucun véhicule trouvé avec ces filtres.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {data.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-brand-400 dark:text-brand-400 pt-2" data-testid="pagination">
          <span className="text-[11px]">
            Page {filters.page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => onFiltersChange({ page: filters.page - 1 })}
              data-testid="pagination-prev"
              className="rounded border border-surface-border dark:border-brand-700 bg-white dark:bg-dark-secondary px-4 py-2 text-[10px] disabled:opacity-40 hover:bg-surface-muted dark:hover:bg-dark-tertiary transition-colors"
            >
              ← Précédente
            </button>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => onFiltersChange({ page: filters.page + 1 })}
              data-testid="pagination-next"
              className="rounded border border-surface-border dark:border-brand-700 bg-white dark:bg-dark-secondary px-4 py-2 text-[10px] disabled:opacity-40 hover:bg-surface-muted dark:hover:bg-dark-tertiary transition-colors"
            >
              Suivante →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
