import type { Vehicle, VehicleFilters } from '../types'
import { VehicleCard } from './VehicleCard'

interface Props {
  data: Vehicle[]
  total: number
  filters: VehicleFilters
  onFiltersChange: (updated: Partial<VehicleFilters>) => void
  isLoading?: boolean
}

function SkeletonCard({ featured = false }: { featured?: boolean }) {
  if (featured) {
    return (
      <div className="rounded-xl overflow-hidden bg-white dark:bg-dark-card border border-creme-300 dark:border-charbon-600">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-2/3 aspect-[3/1] md:aspect-auto md:min-h-[260px] skeleton" />
          <div className="md:w-1/3 p-6 space-y-3">
            <div className="h-8 w-32 skeleton rounded" />
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-4 w-full skeleton rounded" />
            <div className="h-10 w-full skeleton rounded-lg mt-auto" />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl overflow-hidden bg-white dark:bg-dark-card border border-creme-300 dark:border-charbon-600">
      <div className="aspect-[16/9] skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-20 skeleton rounded" />
        <div className="h-5 w-28 skeleton rounded" />
        <div className="flex gap-1">
          <div className="h-4 w-14 skeleton rounded" />
          <div className="h-4 w-14 skeleton rounded" />
        </div>
      </div>
    </div>
  )
}

export function VehicleGrid({ data, total, filters, onFiltersChange, isLoading }: Props) {
  const totalPages = Math.ceil(total / filters.limit)

  return (
    <div className="flex flex-col gap-6" data-testid="vehicle-grid">
      {/* Loading state — skeleton grid */}
      {isLoading ? (
        <div className="space-y-6">
          <SkeletonCard featured />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SkeletonCard /><SkeletonCard />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-acier-400 dark:text-acier-500 font-serif italic">
          Aucun véhicule trouvé avec ces filtres.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Featured card — first item, full width */}
          {data.length > 0 && (
            <VehicleCard key={data[0].id} vehicle={data[0]} featured />
          )}

          {/* 2-column section — items 2-3 */}
          {data.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {data.slice(1, 3).map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          )}

          {/* 3-column section — items 4+ */}
          {data.length > 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.slice(3).map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-creme-300 dark:border-charbon-600" data-testid="pagination">
          <span className="text-xs text-acier-400 dark:text-acier-500 font-display">
            Page {filters.page} / {totalPages}
          </span>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => onFiltersChange({ page: filters.page - 1 })}
              data-testid="pagination-prev"
              className="rounded-lg border border-creme-400 dark:border-charbon-600 bg-white dark:bg-dark-card px-5 py-2 text-xs font-medium text-charbon-700 dark:text-creme-300 disabled:opacity-30 hover:bg-creme-200 dark:hover:bg-dark-elevated transition-colors"
            >
              ← Précédente
            </button>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => onFiltersChange({ page: filters.page + 1 })}
              data-testid="pagination-next"
              className="rounded-lg border border-creme-400 dark:border-charbon-600 bg-white dark:bg-dark-card px-5 py-2 text-xs font-medium text-charbon-700 dark:text-creme-300 disabled:opacity-30 hover:bg-creme-200 dark:hover:bg-dark-elevated transition-colors"
            >
              Suivante →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
