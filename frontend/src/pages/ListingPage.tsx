import { useState } from 'react'
import { FilterBar } from '../components/FilterBar'
import { VehicleTable } from '../components/VehicleTable'
import { useStats, useVehicles } from '../hooks/useVehicles'
import { DEFAULT_FILTERS, type VehicleFilters } from '../types'

/**
 * Main listing page — the primary entry point of the application.
 *
 * Layout:
 *   Header (logo + last-updated timestamp)
 *   FilterBar
 *   VehicleTable (with pagination + CSV export)
 */
export function ListingPage() {
  const [filters, setFilters] = useState<VehicleFilters>(DEFAULT_FILTERS)

  const { data, isLoading, isError } = useVehicles(filters)
  const { data: stats } = useStats()

  const handleFiltersChange = (updated: Partial<VehicleFilters>) => {
    setFilters((prev) => ({ ...prev, ...updated }))
  }

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS)
  }

  const lastUpdated = stats?.last_updated_at
    ? formatRelative(new Date(stats.last_updated_at))
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              🚗 QC Auto Compare
            </h1>
            <p className="text-xs text-gray-500">
              Voitures neuves chez les concessionnaires directs — Montréal &amp; Québec
            </p>
          </div>
          <div className="text-right text-xs text-gray-400">
            {stats && (
              <>
                <p>
                  {stats.active_vehicles.toLocaleString('fr-CA')} véhicules ·{' '}
                  {stats.total_dealers} concessionnaires
                </p>
                {lastUpdated && <p>Mis à jour {lastUpdated}</p>}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-6 py-6">
        {/* Source summary pills */}
        {stats?.vehicles_by_source && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.vehicles_by_source).map(([source, count]) => (
              <button
                key={source}
                onClick={() =>
                  handleFiltersChange({
                    ingest_source: filters.ingest_source === source ? undefined : source,
                    page: 1,
                  })
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filters.ingest_source === source
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {source}: {count}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <FilterBar
          filters={filters}
          onChange={handleFiltersChange}
          onReset={handleReset}
        />

        {/* Error state */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Impossible de charger les données. Vérifiez que le backend est démarré sur{' '}
            <code className="rounded bg-red-100 px-1">http://localhost:8000</code>.
          </div>
        )}

        {/* Table */}
        <VehicleTable
          data={data?.items ?? []}
          total={data?.total ?? 0}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLoading={isLoading}
        />
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `il y a ${diffD}j`
}
