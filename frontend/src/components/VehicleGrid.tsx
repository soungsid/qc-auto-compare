import type { Vehicle, VehicleFilters } from '../types'
import { VehicleCard } from './VehicleCard'

/**
 * FEATURE #2: Grid view for vehicles using cards
 */

interface Props {
  data: Vehicle[]
  total: number
  filters: VehicleFilters
  onFiltersChange: (updated: Partial<VehicleFilters>) => void
  isLoading?: boolean
}

export function VehicleGrid({ data, total, filters, onFiltersChange, isLoading }: Props) {
  const totalPages = Math.ceil(total / filters.limit)

  // Export CSV
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
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="vehicle-count">
          {isLoading ? 'Chargement…' : `${total.toLocaleString('fr-CA')} véhicules`}
        </p>
        <button
          onClick={exportCSV}
          data-testid="export-csv-btn"
          className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Chargement des véhicules…
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          Aucun véhicule trouvé avec ces filtres.
        </div>
      ) : (
        /* Cards grid - responsive: 1 col mobile, 2 col tablet, 3-4 col desktop */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400" data-testid="pagination">
          <span>
            Page {filters.page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => onFiltersChange({ page: filters.page - 1 })}
              data-testid="pagination-prev"
              className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              ← Précédente
            </button>
            <button
              disabled={filters.page >= totalPages}
              onClick={() => onFiltersChange({ page: filters.page + 1 })}
              data-testid="pagination-next"
              className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Suivante →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
