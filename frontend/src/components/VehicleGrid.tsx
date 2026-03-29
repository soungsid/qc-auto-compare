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

  const exportCSV = () => {
    const headers = [
      'Année', 'Marque', 'Modèle', 'Version', 'État', 'Traction',
      'PDSF', 'Prix vente', 'Kilométrage', 'Concessionnaire', 'Ville', 'Source', 'Fingerprint',
    ]
    const rows = data.map((v) => [
      v.year, v.make, v.model, v.trim ?? '',
      v.condition, v.drivetrain ?? '', v.msrp ?? '', v.sale_price ?? '',
      v.mileage_km ?? '', v.dealer?.name ?? '', v.dealer?.city ?? '', v.ingest_source, v.fingerprint,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qc-auto-compare-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4" data-testid="vehicle-grid">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="vehicle-count">
          {isLoading ? 'Chargement…' : `${total.toLocaleString('fr-CA')} véhicules`}
        </p>
        <button
          type="button"
          onClick={exportCSV}
          data-testid="export-csv-btn"
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Chargement des véhicules…
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">
          Aucun véhicule trouvé avec ces filtres.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400 pt-2" data-testid="pagination">
          <span>
            Page {filters.page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => onFiltersChange({ page: filters.page - 1 })}
              data-testid="pagination-prev"
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 min-h-[44px] disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              ← Précédente
            </button>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => onFiltersChange({ page: filters.page + 1 })}
              data-testid="pagination-next"
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 min-h-[44px] disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              Suivante →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
