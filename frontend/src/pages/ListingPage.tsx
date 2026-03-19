import { useState } from 'react'
import { FilterBar } from '../components/FilterBar'
import { ThemeToggle } from '../components/ThemeToggle'
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors" data-testid="listing-page">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-colors">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              QC Auto Compare
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Voitures neuves chez les concessionnaires directs — Montréal &amp; Québec
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
              {stats && (
                <>
                  <p data-testid="stats-summary">
                    {stats.active_vehicles.toLocaleString('fr-CA')} véhicules ·{' '}
                    {stats.total_dealers} concessionnaires
                  </p>
                  {lastUpdated && <p>Mis à jour {lastUpdated}</p>}
                </>
              )}
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-6 py-6">
        {/* Source summary pills */}
        {stats?.vehicles_by_source && (
          <div className="flex flex-wrap gap-2" data-testid="source-pills">
            {Object.entries(stats.vehicles_by_source).map(([source, count]) => (
              <button
                key={source}
                onClick={() =>
                  handleFiltersChange({
                    ingest_source: filters.ingest_source === source ? undefined : source,
                    page: 1,
                  })
                }
                data-testid={`source-pill-${source}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filters.ingest_source === source
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
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
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400" data-testid="error-message">
            Impossible de charger les données. Vérifiez que le backend est démarré sur{' '}
            <code className="rounded bg-red-100 dark:bg-red-900/40 px-1">http://localhost:8000</code>.
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

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-4 transition-colors">
        <div className="mx-auto max-w-screen-2xl px-6 text-center text-xs text-gray-400 dark:text-gray-500">
          QC Auto Compare — Comparateur de véhicules neufs au Québec
        </div>
      </footer>
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
