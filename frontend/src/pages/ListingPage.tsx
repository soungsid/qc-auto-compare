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

const sortOptions = [
  { value: 'sale_price_asc', sort: 'sale_price', order: 'asc' as const, label: 'Prix ↑' },
  { value: 'sale_price_desc', sort: 'sale_price', order: 'desc' as const, label: 'Prix ↓' },
  { value: 'created_at_desc', sort: 'created_at', order: 'desc' as const, label: 'Récent' },
  { value: 'make_asc', sort: 'make', order: 'asc' as const, label: 'Marque' },
  { value: 'year_desc', sort: 'year', order: 'desc' as const, label: 'Année' },
  { value: 'mileage_km_asc', sort: 'mileage_km', order: 'asc' as const, label: 'Km ↑' },
]

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
  const [searchQuery, setSearchQuery] = useState('')

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

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const parts = searchQuery.trim().split(/\s+/)
      handleFiltersChange({ make: parts[0], model: parts.slice(1).join(' ') || undefined, page: 1 })
    }
  }, [searchQuery, handleFiltersChange])

  const currentSort = `${filters.sort}_${filters.order}`

  const pageTitle = filters.make 
    ? `${filters.make}${filters.model ? ` ${filters.model}` : ''} - AutoQC`
    : 'AutoQC — Comparez les véhicules neufs et d\'occasion au Québec'
  
  const pageDescription = filters.make
    ? `Trouvez les meilleures offres ${filters.make}${filters.model ? ` ${filters.model}` : ''} chez les concessionnaires au Québec.`
    : 'Comparez les prix de véhicules neufs et d\'occasion chez les concessionnaires du Québec.'

  const resultLabel = filters.condition === 'new' ? 'neufs' : filters.condition === 'used' ? 'd\'occasion' : 'neufs et d\'occasion'

  return (
    <div className="min-h-screen bg-creme dark:bg-dark-primary transition-colors" data-testid="listing-page">
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords={['voiture', 'véhicule', 'auto', 'concessionnaire', 'Québec', 'Montréal', 'prix', 'neuf', 'occasion', filters.make, filters.model].filter(Boolean) as string[]}
        structuredData={data?.items ? getItemListSchema(data.items, filters.page) : getOrganizationSchema()}
      />

      <Navbar stats={stats ? { active_vehicles: stats.active_vehicles, total_dealers: stats.total_dealers, last_updated_at: stats.last_updated_at } : undefined} />

      {/* Editorial page header */}
      <div className="bg-white dark:bg-dark-card border-b border-creme-300 dark:border-charbon-600">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10 py-5 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            {/* Title — editorial style */}
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-charbon-900 dark:text-creme-200 leading-tight">
                Véhicules {resultLabel}
                <span className="text-ambre-400 ml-2">
                  {isLoading ? '…' : `— ${(data?.total ?? 0).toLocaleString('fr-CA')}`}
                </span>
              </h1>
              <p className="text-[11px] text-acier-400 mt-1 font-display">
                {filters.make ? `${filters.make}${filters.model ? ` ${filters.model}` : ''}` : 'Tous les concessionnaires du Québec'}
              </p>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une marque, un modèle…"
                  className="w-64 pl-9 pr-3 py-2 text-xs rounded-full border border-creme-400 dark:border-charbon-600 bg-creme-50 dark:bg-dark-elevated text-charbon-900 dark:text-creme-200 placeholder:text-acier-300 focus:outline-none focus:ring-2 focus:ring-ambre-400/40"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-acier-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
            </form>
          </div>

          {/* Toolbar row: sort + view toggle + CSV */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {/* Segmented sort */}
            <div className="flex bg-creme-200 dark:bg-dark-elevated rounded-lg p-0.5 gap-0.5">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    handleFiltersChange({ sort: opt.sort, order: opt.order, page: 1 })
                  }}
                  className={`text-[10px] px-3 py-1.5 rounded-md font-medium transition-colors ${
                    currentSort === opt.value
                      ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900 shadow-sm'
                      : 'text-acier-500 dark:text-acier-400 hover:text-charbon-700 dark:hover:text-creme-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* View toggle */}
              <div className="flex border border-creme-400 dark:border-charbon-600 rounded-lg overflow-hidden" data-testid="view-mode-toggle">
                <button
                  onClick={() => setViewMode('cards')}
                  data-testid="view-mode-cards"
                  className={`text-[10px] px-3 py-1.5 transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900'
                      : 'text-acier-400 bg-white dark:bg-dark-card hover:bg-creme-100'
                  }`}
                >
                  ⊞ Cartes
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  data-testid="view-mode-table"
                  className={`text-[10px] px-3 py-1.5 transition-colors ${
                    viewMode === 'table'
                      ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900'
                      : 'text-acier-400 bg-white dark:bg-dark-card hover:bg-creme-100'
                  }`}
                >
                  ☰ Tableau
                </button>
              </div>

              {/* CSV export */}
              <button
                type="button"
                onClick={() => exportCSV(data?.items ?? [])}
                data-testid="export-csv-btn"
                className="text-[10px] px-3 py-1.5 border border-creme-400 dark:border-charbon-600 rounded-lg text-acier-400 bg-white dark:bg-dark-card hover:bg-creme-100 dark:hover:bg-dark-elevated transition-colors"
                aria-label="Exporter en CSV"
              >
                ↓ CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex max-w-[1440px] mx-auto">
        {/* Sidebar Filters */}
        <VehicleSearchFilters
          onChange={handleFiltersChange}
          onReset={handleReset}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          totalResults={data?.total}
          currentFilters={filters}
        />

        {/* Main content */}
        <div className="flex-1 px-4 sm:px-6 lg:px-10 py-6 min-w-0 flex flex-col gap-4">
          {isError && (
            <div className="rounded-xl border border-bordeaux-100 dark:border-bordeaux-700/50 bg-bordeaux-50 dark:bg-bordeaux-700/10 p-4 text-sm text-bordeaux-500 dark:text-bordeaux-200" data-testid="error-message">
              Impossible de charger les données. Vérifiez que le backend est démarré.
            </div>
          )}

          <ActiveFilterChips
            filters={filters}
            onRemove={handleRemoveFilter}
            onReset={handleReset}
          />

          {!isLoading && !isError && data?.total === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center" data-testid="empty-state">
              <div className="text-5xl opacity-40">🔍</div>
              <div>
                <p className="text-lg font-serif text-charbon-900 dark:text-creme-200 mb-1">
                  Aucun véhicule ne correspond à vos critères
                </p>
                <p className="text-xs text-acier-400 dark:text-acier-500">
                  Essayez de retirer un filtre pour élargir votre recherche.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 bg-ambre-400 hover:bg-ambre-300 text-charbon-900 font-bold rounded-lg text-xs transition-colors"
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

