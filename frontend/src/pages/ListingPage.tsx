import { useState, useEffect } from 'react'
import { FilterBar } from '../components/FilterBar'
import { ThemeToggle } from '../components/ThemeToggle'
import { VehicleTable } from '../components/VehicleTable'
import { VehicleGrid } from '../components/VehicleGrid'
import { useStats, useVehicles } from '../hooks/useVehicles'
import { DEFAULT_FILTERS, type VehicleFilters } from '../types'

type ViewMode = 'table' | 'cards'

/**
 * Main listing page — the primary entry point of the application.
 * FEATURE #2: Added toggle between table and card views
 */
export function ListingPage() {
  const [filters, setFilters] = useState<VehicleFilters>(DEFAULT_FILTERS)
  
  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('qc-auto-view-mode') as ViewMode) || 'table'
    }
    return 'table'
  })

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem('qc-auto-view-mode', viewMode)
  }, [viewMode])

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

        {/* View mode toggle + Sort controls */}
        <div className="flex items-center justify-between">
          {/* View mode toggle - FEATURE #2 */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg" data-testid="view-mode-toggle">
            <button
              onClick={() => setViewMode('table')}
              data-testid="view-mode-table"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Tableau
            </button>
            <button
              onClick={() => setViewMode('cards')}
              data-testid="view-mode-cards"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Cartes
            </button>
          </div>

          {/* Sort controls for card view */}
          {viewMode === 'cards' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Trier par:</label>
              <select
                value={filters.sort}
                onChange={(e) => handleFiltersChange({ sort: e.target.value, page: 1 })}
                className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-2 py-1 text-sm text-gray-900 dark:text-gray-100"
                data-testid="sort-select"
              >
                <option value="sale_price">Prix</option>
                <option value="year">Année</option>
                <option value="make">Marque</option>
                <option value="mileage_km">Kilométrage</option>
                <option value="created_at">Date d'ajout</option>
              </select>
              <button
                onClick={() => handleFiltersChange({ order: filters.order === 'asc' ? 'desc' : 'asc', page: 1 })}
                className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600"
                data-testid="sort-order-toggle"
              >
                {filters.order === 'asc' ? '↑ Croissant' : '↓ Décroissant'}
              </button>
            </div>
          )}
        </div>

        {/* Error state */}
        {isError && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400" data-testid="error-message">
            Impossible de charger les données. Vérifiez que le backend est démarré sur{' '}
            <code className="rounded bg-red-100 dark:bg-red-900/40 px-1">http://localhost:8000</code>.
          </div>
        )}

        {/* Table or Grid view based on viewMode */}
        {viewMode === 'table' ? (
          <VehicleTable
            data={data?.items ?? []}
            total={data?.total ?? 0}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isLoading={isLoading}
          />
        ) : (
          <VehicleGrid
            data={data?.items ?? []}
            total={data?.total ?? 0}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            isLoading={isLoading}
          />
        )}
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
