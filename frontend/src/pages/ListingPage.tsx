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
import type { VehicleFilters, Vehicle } from '../types'

type ViewMode = 'table' | 'cards'

function exportCSV(data: Vehicle[]) {
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
  a.download = `autoqc-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

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
    ? `${filters.make}${filters.model ? ` ${filters.model}` : ''} - AutoQC`
    : 'AutoQC — Comparez les véhicules neufs et d\'occasion au Québec'
  
  const pageDescription = filters.make
    ? `Trouvez les meilleures offres ${filters.make}${filters.model ? ` ${filters.model}` : ''} chez les concessionnaires au Québec.`
    : 'Comparez les prix de véhicules neufs et d\'occasion chez les concessionnaires du Québec.'

  return (
    <div className="min-h-screen bg-surface-muted dark:bg-dark-primary transition-colors" data-testid="listing-page">
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords={['voiture', 'véhicule', 'auto', 'concessionnaire', 'Québec', 'Montréal', 'prix', 'neuf', 'occasion', filters.make, filters.model].filter(Boolean) as string[]}
        structuredData={data?.items ? getItemListSchema(data.items, filters.page) : getOrganizationSchema()}
      />

      <Navbar stats={stats ? { active_vehicles: stats.active_vehicles, total_dealers: stats.total_dealers, last_updated_at: stats.last_updated_at } : undefined} />

      {/* Subbar - sticky on mobile */}
      <div className="sticky top-0 z-20 bg-white dark:bg-dark-secondary border-b border-surface-border dark:border-brand-700 px-3 sm:px-5 py-2 flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide">
        {/* View toggle */}
        <div className="flex border border-surface-border dark:border-brand-600 rounded overflow-hidden" data-testid="view-mode-toggle">
          <button
            onClick={() => setViewMode('table')}
            data-testid="view-mode-table"
            className={`text-[10px] px-2.5 py-1 transition-colors ${
              viewMode === 'table'
                ? 'bg-brand-700 text-white dark:bg-brand-600'
                : 'text-brand-400 dark:text-brand-400 bg-white dark:bg-dark-secondary hover:bg-surface-muted'
            }`}
          >
            ☰ Tableau
          </button>
          <button
            onClick={() => setViewMode('cards')}
            data-testid="view-mode-cards"
            className={`text-[10px] px-2.5 py-1 transition-colors ${
              viewMode === 'cards'
                ? 'bg-brand-700 text-white dark:bg-brand-600'
                : 'text-brand-400 dark:text-brand-400 bg-white dark:bg-dark-secondary hover:bg-surface-muted'
            }`}
          >
            ⊞ Cartes
          </button>
        </div>

        {/* Result count */}
        <span className="text-[11px] text-brand-400 dark:text-brand-500 ml-1" data-testid="vehicle-count">
          {isLoading ? 'Chargement…' : `${(data?.total ?? 0).toLocaleString('fr-CA')} résultats`}
        </span>

        {/* Sort controls (right side) */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-brand-400 dark:text-brand-500">Trier par :</span>
          <select
            value={`${filters.sort}_${filters.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('_')
              handleFiltersChange({ sort, order: order as 'asc' | 'desc', page: 1 })
            }}
            className="text-[10px] border border-surface-border dark:border-brand-600 rounded px-2 py-1 text-brand-700 dark:text-brand-200 bg-white dark:bg-dark-secondary"
            data-testid="sort-select"
          >
            <option value="sale_price_asc">Prix ↑</option>
            <option value="sale_price_desc">Prix ↓</option>
            <option value="year_desc">Année ↓</option>
            <option value="year_asc">Année ↑</option>
            <option value="mileage_km_asc">Km ↑</option>
            <option value="mileage_km_desc">Km ↓</option>
            <option value="make_asc">Marque A-Z</option>
            <option value="created_at_desc">Récents</option>
          </select>
          <button
            type="button"
            onClick={() => exportCSV(data?.items ?? [])}
            data-testid="export-csv-btn"
            className="text-[10px] px-2.5 py-1 border border-surface-border dark:border-brand-600 rounded text-brand-400 dark:text-brand-400 bg-white dark:bg-dark-secondary hover:bg-surface-muted dark:hover:bg-dark-tertiary transition-colors"
            aria-label="Exporter en CSV"
          >
            ↓ CSV
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex bg-surface-muted dark:bg-dark-primary">
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
        <div className="flex-1 p-3.5 min-w-0 flex flex-col gap-3">
          {isError && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-400" data-testid="error-message">
              Impossible de charger les données. Vérifiez que le backend est démarré.
            </div>
          )}

          <ActiveFilterChips
            filters={filters}
            onRemove={handleRemoveFilter}
            onReset={handleReset}
          />

          {!isLoading && !isError && data?.total === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center" data-testid="empty-state">
              <div className="text-4xl">🔍</div>
              <div>
                <p className="text-base font-bold text-brand-700 dark:text-brand-200 mb-1">
                  Aucun véhicule ne correspond à vos critères
                </p>
                <p className="text-[11px] text-brand-400 dark:text-brand-400">
                  Essayez de retirer un filtre pour élargir votre recherche.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-accent-400 hover:bg-accent-500 text-white font-bold rounded text-[11px] transition-colors"
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
      </div>

      <Footer />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

