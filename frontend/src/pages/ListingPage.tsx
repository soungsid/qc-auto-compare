import { useState, useEffect, useCallback } from 'react'
import { VehicleSearchFilters } from '../components/VehicleSearchFilters'
import { ActiveFilterChips } from '../components/ActiveFilterChips'
import { Navbar } from '../components/Navbar'
import { VehicleTable } from '../components/VehicleTable'
import { VehicleGrid } from '../components/VehicleGrid'
import { Footer } from '../components/Footer'
import { SEO, getOrganizationSchema, getItemListSchema } from '../components/SEO'
import { useStats, useVehicles } from '../hooks/useVehicles'
import { useFiltersFromUrl } from '../hooks/useFiltersFromUrl'
import type { VehicleFilters } from '../types'

type ViewMode = 'table' | 'cards'

export function ListingPage() {
  const { filters, setFilters, resetFilters } = useFiltersFromUrl()
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('qc-auto-view-mode') as ViewMode) || 'cards'
    }
    return 'cards'
  })

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    localStorage.setItem('qc-auto-view-mode', viewMode)
  }, [viewMode])

  const { data, isLoading, isError } = useVehicles(filters)
  const { data: stats } = useStats()

  const handleFiltersChange = useCallback((updated: Partial<VehicleFilters>) => {
    setFilters(updated)
  }, [setFilters])

  const handleReset = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  const handleRemoveFilter = useCallback((keys: (keyof VehicleFilters)[]) => {
    const patch: Partial<VehicleFilters> = { page: 1 }
    for (const key of keys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(patch as any)[key] = undefined
    }
    setFilters(patch)
  }, [setFilters])

  const pageTitle = filters.make 
    ? `${filters.make}${filters.model ? ` ${filters.model}` : ''} - Véhicules au Québec`
    : 'Comparer les véhicules neufs et d\'occasion au Québec'
  
  const pageDescription = filters.make
    ? `Trouvez les meilleures offres ${filters.make}${filters.model ? ` ${filters.model}` : ''} chez les concessionnaires au Québec. Prix, financement et location.`
    : 'Comparez les prix de véhicules neufs et d\'occasion chez les concessionnaires directs à Montréal et Québec. Trouvez votre prochaine voiture au meilleur prix.'

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors" data-testid="listing-page">
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords={['voiture', 'véhicule', 'auto', 'concessionnaire', 'Québec', 'Montréal', 'prix', 'neuf', 'occasion', filters.make, filters.model].filter(Boolean) as string[]}
        structuredData={data?.items ? getItemListSchema(data.items, filters.page) : getOrganizationSchema()}
      />

      <Navbar stats={stats ? { active_vehicles: stats.active_vehicles, total_dealers: stats.total_dealers, last_updated_at: stats.last_updated_at } : undefined} />

      <main className="mx-auto flex max-w-screen-2xl gap-0 lg:gap-6 px-4 sm:px-6 pt-4 pb-8">
        {/* Sidebar Filters */}
        <VehicleSearchFilters
          onChange={handleFiltersChange}
          onReset={handleReset}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          totalResults={data?.total}
          currentFilters={filters}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* View mode toggle + Sort controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg" data-testid="view-mode-toggle">
              <button
                onClick={() => setViewMode('table')}
                data-testid="view-mode-table"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">Tableau</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                data-testid="view-mode-cards"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                <span className="hidden sm:inline">Cartes</span>
              </button>
            </div>

            {viewMode === 'cards' && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Trier par:</label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFiltersChange({ sort: e.target.value, page: 1 })}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
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
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  data-testid="sort-order-toggle"
                >
                  {filters.order === 'asc' ? '↑ Croissant' : '↓ Décroissant'}
                </button>
              </div>
            )}
          </div>

          {isError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-400" data-testid="error-message">
              Impossible de charger les données. Vérifiez que le backend est démarré sur{' '}
              <code className="rounded bg-red-100 dark:bg-red-900/30 px-1">http://localhost:8000</code>.
            </div>
          )}

          <ActiveFilterChips
            filters={filters}
            onRemove={handleRemoveFilter}
            onReset={handleReset}
          />

          {!isLoading && !isError && data?.total === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center" data-testid="empty-state">
              <div className="text-5xl">🔍</div>
              <div>
                <p className="text-lg sm:text-xl font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                  Aucun véhicule ne correspond à vos critères
                </p>
                <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                  Essayez de retirer un filtre ci-dessus pour élargir votre recherche.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-medium rounded-lg transition-colors"
                data-testid="empty-state-reset-btn"
              >
                Réinitialiser tous les filtres
              </button>
            </div>
          )}

          {(isLoading || (data?.total ?? 0) > 0) && (viewMode === 'table' ? (
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
          ))}
        </div>
      </main>

      <Footer />
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
