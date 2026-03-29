import { useState, useEffect, useCallback, useRef } from 'react'
import type { VehicleFilters } from '../types'

interface FilterOptions {
  brands: Array<{
    brand: string
    total_count: number
    models: Array<{ model: string; count: number }>
  }>
  body_types: Array<{ body_type: string; count: number }>
  fuel_types: Array<{ fuel_type: string; count: number }>
  transmissions: Array<{ transmission: string; count: number }>
  drivetrains: Array<{ drivetrain: string; count: number }>
  colors: string[]
  years: { min: number; max: number; list: Array<{ year: number; count: number }> }
  price_range: { min: number; max: number }
  mileage_range: { min: number; max: number }
  conditions: string[]
}

interface Props {
  onChange: (filters: Partial<VehicleFilters>) => void
  onReset: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  totalResults?: number
  /** Current filters from URL — used to initialize sidebar state on mount and for contextual re-fetch */
  currentFilters?: Partial<VehicleFilters>
}

// BUG-03: map raw DB transmission values to French display labels
const TRANSMISSION_LABELS: Record<string, string> = {
  automatic: 'Automatique',
  manual: 'Manuelle',
}
const formatTransmission = (raw: string) =>
  TRANSMISSION_LABELS[raw.toLowerCase()] ?? raw

/**
 * Composant de filtres avancés inspiré de HGrégoire
 * - Sidebar verticale sur desktop
 * - Overlay mobile avec bouton d'ouverture
 * - Sections accordéon
 * - Marque & Modèle hiérarchiques
 * - Sliders bidirectionnels (min/max)
 * - Filtre neuf/occasion avec option "Tous"
 */
export function VehicleSearchFilters({ onChange, onReset, collapsed = false, onToggleCollapse, totalResults, currentFilters }: Props) {
  // Stable ref so the auto-search effect never needs onChange in its dep array
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange })

  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true,
    brand: true,
    bodyType: true,
    price: true,
    mileage: false,
    year: false,
    transmission: false,
    fuel: false,
    drivetrain: false,
    color: false,
  })
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({})
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() =>
    currentFilters?.make ? [currentFilters.make] : []
  )
  const [selectedModels, setSelectedModels] = useState<Record<string, string[]>>({})
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>(() =>
    currentFilters?.body_type ? [currentFilters.body_type] : []
  )
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>(() =>
    currentFilters?.fuel_type ? [currentFilters.fuel_type] : []
  )
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>(() =>
    currentFilters?.transmission ? [currentFilters.transmission] : []
  )
  const [selectedDrivetrains, setSelectedDrivetrains] = useState<string[]>(() =>
    currentFilters?.drivetrain ? [currentFilters.drivetrain] : []
  )
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [vehicleCondition, setVehicleCondition] = useState<'all' | 'new' | 'used'>(() =>
    (currentFilters?.condition as 'all' | 'new' | 'used') || 'all'
  )
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 })
  const [mileageRange, setMileageRange] = useState({ min: 0, max: 300000 })
  const [yearRange, setYearRange] = useState({ min: 2000, max: 2026 })
  const [priceSliderValues, setPriceSliderValues] = useState({ min: 0, max: 100000 })
  const [mileageSliderValues, setMileageSliderValues] = useState({ min: 0, max: 300000 })
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [brandSearchQuery, setBrandSearchQuery] = useState('')

  // Track first fetch to properly initialize slider bounds
  const isFirstFetch = useRef(true)

  // Fetch filter options from API — re-fetches with context when primary filters change
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''
        const params = new URLSearchParams()
        // Use local sidebar state first, fall back to URL context for when page loads with URL filters
        const contextMake = selectedBrands.length === 1 ? selectedBrands[0] : (selectedBrands.length === 0 ? currentFilters?.make : undefined)
        const contextCondition = vehicleCondition !== 'all' ? vehicleCondition : (currentFilters?.condition !== 'all' ? currentFilters?.condition : undefined)
        if (contextMake) params.set('make', contextMake)
        if (contextCondition) params.set('condition', contextCondition)
        const url = `${backendUrl}/api/filters/options${params.toString() ? `?${params}` : ''}`
        const response = await fetch(url)
        const data = await response.json()
        setFilterOptions(data)

        // Only initialise slider bounds on first load (not on context re-fetches)
        if (isFirstFetch.current) {
          isFirstFetch.current = false
          if (data.price_range) {
            const min = Math.floor(data.price_range.min || 0)
            const max = Math.ceil(data.price_range.max || 100000)
            setPriceRange({ min, max })
            setPriceSliderValues({ min, max })
          }
          if (data.years) {
            const min = data.years.min || 2000
            const max = data.years.max || 2026
            setYearRange({ min, max })
          }
          if (data.mileage_range) {
            const min = data.mileage_range.min || 0
            const max = data.mileage_range.max || 300000
            setMileageRange({ min, max })
            setMileageSliderValues({ min, max })
          }
        }
      } catch (error) {
        console.error('Error fetching filter options:', error)
      }
    }
    fetchOptions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrands.join(','), vehicleCondition])

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleBrand = (brand: string) => {
    setExpandedBrands(prev => ({ ...prev, [brand]: !prev[brand] }))
  }

  const handleBrandSelect = (brand: string) => {
    const isBrandSelected = selectedBrands.includes(brand)
    if (isBrandSelected) {
      // Uncheck brand and all its models
      setSelectedBrands(selectedBrands.filter(b => b !== brand))
      const newModels = { ...selectedModels }
      delete newModels[brand]
      setSelectedModels(newModels)
    } else {
      // Check brand AND all its models
      setSelectedBrands([...selectedBrands, brand])
      const brandData = filterOptions?.brands.find(b => b.brand === brand)
      setSelectedModels({
        ...selectedModels,
        [brand]: brandData?.models.map(m => m.model) || []
      })
    }
  }

  const handleModelSelect = (brand: string, model: string) => {
    const brandModels = selectedModels[brand] || []
    const newBrandModels = brandModels.includes(model)
      ? brandModels.filter(m => m !== model)
      : [...brandModels, model]

    setSelectedModels({ ...selectedModels, [brand]: newBrandModels })

    // Sync brand checkbox: checked only when ALL models are selected
    const brandData = filterOptions?.brands.find(b => b.brand === brand)
    const totalModels = brandData?.models.length || 0

    if (newBrandModels.length === 0) {
      setSelectedBrands(selectedBrands.filter(b => b !== brand))
    } else if (newBrandModels.length === totalModels) {
      if (!selectedBrands.includes(brand)) {
        setSelectedBrands([...selectedBrands, brand])
      }
    } else {
      // Partial selection → uncheck brand
      setSelectedBrands(selectedBrands.filter(b => b !== brand))
    }
  }

  const handleApplyFilters = useCallback(() => {
    // Build filter query
    const newFilters: Partial<VehicleFilters> = {
      page: 1,
    }

    // Vehicle condition (neuf/occasion/tous)
    if (vehicleCondition !== 'all') {
      newFilters.condition = vehicleCondition
    }

    // Brands & Models
    // Collect brands from both explicit brand selection and model-level selections
    const brandsWithModels = Object.keys(selectedModels).filter(b => (selectedModels[b]?.length || 0) > 0)
    const allSelectedBrands = [...new Set([...selectedBrands, ...brandsWithModels])]

    if (allSelectedBrands.length > 0) {
      newFilters.make = allSelectedBrands[0]
      const brandModels = selectedModels[allSelectedBrands[0]] || []
      const brandData = filterOptions?.brands.find(b => b.brand === allSelectedBrands[0])
      const totalModels = brandData?.models.length || 0
      // Only add model filter when a specific subset is selected (not all)
      if (brandModels.length > 0 && brandModels.length < totalModels) {
        newFilters.model = brandModels[0]
      }
    }

    // Body types
    if (selectedBodyTypes.length > 0) {
      newFilters.body_type = selectedBodyTypes[0]
    }

    // Fuel types
    if (selectedFuelTypes.length > 0) {
      newFilters.fuel_type = selectedFuelTypes[0]
    }

    // Transmissions
    if (selectedTransmissions.length > 0) {
      newFilters.transmission = selectedTransmissions[0]
    }

    // Drivetrains
    if (selectedDrivetrains.length > 0) {
      newFilters.drivetrain = selectedDrivetrains[0]
    }

    // Price range (bidirectional)
    if (priceSliderValues.min > priceRange.min) {
      newFilters.min_price = priceSliderValues.min
    }
    if (priceSliderValues.max < priceRange.max) {
      newFilters.max_price = priceSliderValues.max
    }

    // Year filter — convert selected checkboxes to min/max range
    if (selectedYears.length > 0) {
      newFilters.year_min = Math.min(...selectedYears)
      newFilters.year_max = Math.max(...selectedYears)
    }

    // Mileage range (bidirectional)
    if (mileageSliderValues.max < mileageRange.max) {
      newFilters.mileage_max = mileageSliderValues.max
    }

    return newFilters
  }, [
    vehicleCondition, selectedBrands, selectedModels, selectedBodyTypes, selectedFuelTypes,
    selectedTransmissions, selectedDrivetrains, priceSliderValues, selectedYears, mileageSliderValues,
    priceRange, yearRange, mileageRange
  ])

  // Auto-trigger search with debounce whenever any filter state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      onChangeRef.current(handleApplyFilters())
    }, 400)
    return () => clearTimeout(timer)
  }, [handleApplyFilters])

  const handleReset = () => {
    setVehicleCondition('all')
    setSelectedBrands([])
    setSelectedModels({})
    setSelectedBodyTypes([])
    setSelectedFuelTypes([])
    setSelectedTransmissions([])
    setSelectedDrivetrains([])
    setSelectedColors([])
    setPriceSliderValues({ min: filterOptions?.price_range.min || 0, max: filterOptions?.price_range.max || 100000 })
    setMileageSliderValues({ min: 0, max: filterOptions?.mileage_range.max || 300000 })
    setSelectedYears([])
    setBrandSearchQuery('')
    onReset()
  }

  const activeFiltersCount = 
    (vehicleCondition !== 'all' ? 1 : 0) +
    selectedBrands.length + 
    selectedBodyTypes.length + 
    selectedFuelTypes.length +
    selectedTransmissions.length + 
    selectedDrivetrains.length + 
    selectedColors.length

  // Body type icons (simple SVG representations)
  const bodyTypeIcons: Record<string, string> = {
    'Berline': '🚗',
    'VUS': '🚙',
    'Coupé': '🏎️',
    'Hayon': '🚗',
    'Camion': '🚚',
    'Cabriolet': '🏎️',
    'Commercial': '🚐',
    'Fourgonnette': '🚐',
  }

  const colorMap: Record<string, string> = {
    'Noir': '#000000',
    'Blanc': '#FFFFFF',
    'Gris': '#808080',
    'Argent': '#C0C0C0',
    'Bleu': '#0000FF',
    'Rouge': '#FF0000',
    'Brun': '#8B4513',
    'Vert': '#008000',
    'Orange': '#FFA500',
    'Jaune': '#FFFF00',
    'Beige': '#F5F5DC',
  }

  // Search-based brand filtering (replaces showAllBrands pagination)
  const visibleBrands = (filterOptions?.brands || []).filter(b =>
    brandSearchQuery === '' || b.brand.toLowerCase().includes(brandSearchQuery.toLowerCase())
  )

  // Quick filter helpers
  const isQuickVUS = selectedBodyTypes.includes('VUS')
  const isQuickBerline = selectedBodyTypes.includes('Berline')
  const isQuickElectrique = selectedFuelTypes.includes('Électrique')
  const isQuickUnder30k = priceSliderValues.max <= 30000 && priceSliderValues.max !== priceRange.max

  const toggleQuickFilter = (type: 'vus' | 'berline' | 'electrique' | 'under30k') => {
    switch (type) {
      case 'vus':
        setSelectedBodyTypes(prev => prev.includes('VUS') ? prev.filter(t => t !== 'VUS') : [...prev, 'VUS'])
        break
      case 'berline':
        setSelectedBodyTypes(prev => prev.includes('Berline') ? prev.filter(t => t !== 'Berline') : [...prev, 'Berline'])
        break
      case 'electrique':
        setSelectedFuelTypes(prev => prev.includes('Électrique') ? prev.filter(t => t !== 'Électrique') : [...prev, 'Électrique'])
        break
      case 'under30k':
        if (isQuickUnder30k) {
          setPriceSliderValues(prev => ({ ...prev, max: priceRange.max }))
        } else {
          setPriceSliderValues(prev => ({ ...prev, max: 30000 }))
        }
        break
    }
  }

  return (
    <>
      {/* Mobile: Floating action button (bottom-right) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-30 flex items-center gap-2 px-4 py-3 bg-ambre-400 text-charbon-900 font-bold rounded-full shadow-lg hover:bg-ambre-500 transition-colors min-h-[48px] text-[11px] font-display"
        data-testid="mobile-filters-btn"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtres{activeFiltersCount > 0 && ` (${activeFiltersCount})`}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar (desktop) / Bottom sheet (mobile) */}
      <div
        className={`
          fixed lg:sticky
          bottom-0 lg:top-0 lg:bottom-auto
          left-0 right-0 lg:left-auto lg:right-auto
          w-full ${collapsed ? 'lg:w-16' : 'lg:w-[280px]'}
          max-h-[85vh] lg:max-h-none lg:h-screen
          rounded-t-2xl lg:rounded-none
          bg-creme dark:bg-dark-filter
          lg:border-r border-creme-400 dark:border-charbon-700
          overflow-y-auto z-50 lg:z-auto
          transition-all duration-300
          ${mobileOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        `}
        data-testid="filters-sidebar"
      >
        {/* Mobile handle bar */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-creme-400 dark:bg-charbon-600" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-[#F0EBE1] dark:bg-dark-filter p-4 flex items-center justify-between z-10 border-b border-creme-300 dark:border-charbon-700">
          {!collapsed && (
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-acier-500 dark:text-acier-400 font-display flex items-center gap-2">
              Filtres
              {totalResults !== undefined && (
                <span className="text-[10px] font-normal normal-case tracking-normal text-charbon-500 dark:text-creme-400 bg-creme-200 dark:bg-charbon-700 px-2 py-0.5 rounded-full">
                  {totalResults.toLocaleString('fr-CA')}
                </span>
              )}
            </h3>
          )}
          <div className="flex items-center gap-2">
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:block text-acier-400 hover:text-charbon-700 dark:hover:text-creme-200"
                title={collapsed ? 'Développer' : 'Réduire'}
              >
                <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {!collapsed && (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[10px] text-bordeaux-400 hover:text-bordeaux-500 font-display font-medium"
                  data-testid="reset-filters-btn"
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="lg:hidden p-2 text-acier-400 hover:text-charbon-600 dark:hover:text-creme-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapsed view - icons only */}
        {collapsed ? (
          <div className="p-2 space-y-2">
            <IconButton icon="🚗" label="Type" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="🏢" label="Marque" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="🚙" label="Carrosserie" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="💰" label="Prix" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="📏" label="Kilométrage" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="📅" label="Année" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="⚙️" label="Transmission" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="⛽" label="Carburant" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="🔧" label="Traction" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
            <IconButton icon="🎨" label="Couleur" onClick={() => { if (onToggleCollapse) onToggleCollapse() }} />
          </div>
        ) : (
          <div className="p-4 space-y-5">

          {/* Filtres rapides */}
          <div className="pb-3 border-b border-creme-300 dark:border-charbon-700">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-acier-500 dark:text-acier-400 font-display mb-2">Filtres rapides</h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'vus' as const, icon: '🚙', label: 'VUS', active: isQuickVUS },
                { key: 'berline' as const, icon: '🚗', label: 'Berline', active: isQuickBerline },
                { key: 'electrique' as const, icon: '⚡', label: 'Électrique', active: isQuickElectrique },
                { key: 'under30k' as const, icon: '💰', label: '< 30k$', active: isQuickUnder30k },
              ].map((qf) => (
                <button
                  key={qf.key}
                  type="button"
                  onClick={() => toggleQuickFilter(qf.key)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-display transition-all ${
                    qf.active
                      ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900 font-semibold'
                      : 'border border-creme-400 dark:border-charbon-600 text-charbon-500 dark:text-creme-400 hover:border-charbon-300 dark:hover:border-charbon-500'
                  }`}
                  data-testid={`quick-filter-${qf.key}`}
                >
                  <span className="text-sm">{qf.icon}</span>
                  {qf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Type de véhicule — toggle chips */}
          <Section
            title="État du véhicule"
            isOpen={openSections.type}
            onToggle={() => toggleSection('type')}
          >
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'used', 'new'] as const).map((cond) => {
                const labels = { all: 'Tous', used: 'Occasion', new: 'Neuf' }
                const isActive = vehicleCondition === cond
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setVehicleCondition(cond)}
                    className={`rounded-full px-3 py-1 text-xs font-display transition-all ${
                      isActive
                        ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900 font-semibold'
                        : 'border border-creme-400 dark:border-charbon-600 text-charbon-500 dark:text-creme-400'
                    }`}
                    data-testid={`filter-condition-${cond}`}
                  >
                    {labels[cond]}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Marque & Modèle */}
          <Section
            title="Marque & Modèle"
            isOpen={openSections.brand}
            onToggle={() => toggleSection('brand')}
          >
            <div className="space-y-2">
              {/* Brand search input */}
              <input
                type="text"
                value={brandSearchQuery}
                onChange={(e) => setBrandSearchQuery(e.target.value)}
                placeholder="Rechercher une marque…"
                className="w-full px-3 py-1.5 text-[11px] border border-creme-400 dark:border-charbon-600 rounded-full bg-white dark:bg-dark-card text-charbon-700 dark:text-creme-300 placeholder-acier-300 dark:placeholder-acier-500 focus:outline-none focus:ring-1 focus:ring-ambre-400 font-display"
              />
              {visibleBrands.length === 0 && (
                <p className="text-[11px] text-acier-400 italic font-display">Aucune marque disponible</p>
              )}
              {visibleBrands.map((brandData) => (
                <div key={brandData.brand}>
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => handleBrandSelect(brandData.brand)}
                      data-testid={`filter-brand-${brandData.brand}`}
                    >
                      <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedBrands.includes(brandData.brand) ? 'border-charbon-900 bg-charbon-900 dark:border-ambre-400 dark:bg-ambre-400' : 'border-acier-300 dark:border-acier-600'}`}>
                        {selectedBrands.includes(brandData.brand) && (
                          <svg className="w-[7px] h-[7px] text-creme dark:text-charbon-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 5L4.5 7.5L8 2" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[11px] text-charbon-600 dark:text-creme-300 font-display">
                        {brandData.brand} <span className="text-acier-300 dark:text-acier-500">({brandData.total_count})</span>
                      </span>
                    </div>
                    {brandData.models.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleBrand(brandData.brand)}
                        className="p-1 text-acier-400 hover:text-charbon-600 dark:hover:text-creme-300"
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${expandedBrands[brandData.brand] ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  {/* Models */}
                  {expandedBrands[brandData.brand] && (
                    <div className="ml-5 mt-1.5 space-y-1">
                      {brandData.models.map((modelData) => (
                        <div
                          key={modelData.model}
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => handleModelSelect(brandData.brand, modelData.model)}
                        >
                          <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${(selectedModels[brandData.brand] || []).includes(modelData.model) ? 'border-charbon-900 bg-charbon-900 dark:border-ambre-400 dark:bg-ambre-400' : 'border-acier-300 dark:border-acier-600'}`}>
                            {(selectedModels[brandData.brand] || []).includes(modelData.model) && (
                              <svg className="w-[7px] h-[7px] text-creme dark:text-charbon-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 5L4.5 7.5L8 2" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[11px] text-charbon-600 dark:text-creme-300 font-display">
                            {modelData.model} <span className="text-acier-300 dark:text-acier-500">({modelData.count})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Type de carrosserie — toggle chips */}
          <Section
            title="Type de carrosserie"
            isOpen={openSections.bodyType}
            onToggle={() => toggleSection('bodyType')}
          >
            <div className="flex flex-wrap gap-1.5">
              {filterOptions?.body_types.length === 0 && (
                <p className="text-[11px] text-acier-400 italic font-display">Aucun type disponible</p>
              )}
              {filterOptions?.body_types.map((bt) => (
                <button
                  type="button"
                  key={bt.body_type}
                  onClick={() => {
                    setSelectedBodyTypes(prev =>
                      prev.includes(bt.body_type)
                        ? prev.filter(t => t !== bt.body_type)
                        : [...prev, bt.body_type]
                    )
                  }}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-display transition-all ${
                    selectedBodyTypes.includes(bt.body_type)
                      ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900 font-semibold'
                      : 'border border-creme-400 dark:border-charbon-600 text-charbon-500 dark:text-creme-400'
                  }`}
                  data-testid={`filter-body-${bt.body_type}`}
                >
                  <span className="text-sm">{bodyTypeIcons[bt.body_type] || '🚗'}</span>
                  {bt.body_type}
                  <span className={`text-[9px] ${selectedBodyTypes.includes(bt.body_type) ? 'text-creme-400 dark:text-charbon-500' : 'text-acier-300 dark:text-acier-500'}`}>({bt.count})</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Prix - Text inputs + Slider */}
          <Section
            title="Prix"
            isOpen={openSections.price}
            onToggle={() => toggleSection('price')}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceSliderValues.min}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) setPriceSliderValues(prev => ({ ...prev, min: Math.max(priceRange.min, Math.min(val, prev.max)) }))
                  }}
                  className="w-full px-2 py-1.5 text-[11px] border border-creme-400 dark:border-charbon-600 rounded bg-white dark:bg-dark-card text-charbon-700 dark:text-creme-300 focus:outline-none focus:ring-1 focus:ring-ambre-400 font-display"
                  data-testid="price-input-min"
                />
                <span className="text-[9px] text-acier-400 flex-shrink-0">—</span>
                <input
                  type="number"
                  value={priceSliderValues.max}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) setPriceSliderValues(prev => ({ ...prev, max: Math.min(priceRange.max, Math.max(val, prev.min)) }))
                  }}
                  className="w-full px-2 py-1.5 text-[11px] border border-creme-400 dark:border-charbon-600 rounded bg-white dark:bg-dark-card text-charbon-700 dark:text-creme-300 focus:outline-none focus:ring-1 focus:ring-ambre-400 font-display"
                  data-testid="price-input-max"
                />
              </div>
              <div className="flex justify-between text-[10px] text-acier-400 dark:text-acier-500 font-display">
                <span>{priceSliderValues.min.toLocaleString('fr-CA')} $</span>
                <span>{priceSliderValues.max.toLocaleString('fr-CA')} $</span>
              </div>
              <DualRangeSlider
                min={priceRange.min}
                max={priceRange.max}
                step={500}
                values={priceSliderValues}
                onChange={setPriceSliderValues}
                testIdPrefix="price"
              />
            </div>
          </Section>

          {/* Kilométrage - Text inputs + Slider */}
          <Section
            title="Kilométrage"
            isOpen={openSections.mileage}
            onToggle={() => toggleSection('mileage')}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={mileageSliderValues.min}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) setMileageSliderValues(prev => ({ ...prev, min: Math.max(mileageRange.min, Math.min(val, prev.max)) }))
                  }}
                  className="w-full px-2 py-1.5 text-[11px] border border-creme-400 dark:border-charbon-600 rounded bg-white dark:bg-dark-card text-charbon-700 dark:text-creme-300 focus:outline-none focus:ring-1 focus:ring-ambre-400 font-display"
                  data-testid="mileage-input-min"
                />
                <span className="text-[9px] text-acier-400 flex-shrink-0">—</span>
                <input
                  type="number"
                  value={mileageSliderValues.max}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) setMileageSliderValues(prev => ({ ...prev, max: Math.min(mileageRange.max, Math.max(val, prev.min)) }))
                  }}
                  className="w-full px-2 py-1.5 text-[11px] border border-creme-400 dark:border-charbon-600 rounded bg-white dark:bg-dark-card text-charbon-700 dark:text-creme-300 focus:outline-none focus:ring-1 focus:ring-ambre-400 font-display"
                  data-testid="mileage-input-max"
                />
              </div>
              <div className="flex justify-between text-[10px] text-acier-400 dark:text-acier-500 font-display">
                <span>{mileageSliderValues.min.toLocaleString('fr-CA')} km</span>
                <span>{mileageSliderValues.max.toLocaleString('fr-CA')} km</span>
              </div>
              <DualRangeSlider
                min={mileageRange.min}
                max={mileageRange.max}
                step={5000}
                values={mileageSliderValues}
                onChange={setMileageSliderValues}
                testIdPrefix="mileage"
              />
            </div>
          </Section>

          {/* Année - Custom checkboxes */}
          <Section
            title="Année"
            isOpen={openSections.year}
            onToggle={() => toggleSection('year')}
          >
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {(filterOptions?.years.list ?? []).map(({ year, count }) => (
                <div
                  key={year}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    setSelectedYears(prev =>
                      prev.includes(year)
                        ? prev.filter(y => y !== year)
                        : [...prev, year]
                    )
                  }}
                  data-testid={`filter-year-${year}`}
                >
                  <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedYears.includes(year) ? 'border-charbon-900 bg-charbon-900 dark:border-ambre-400 dark:bg-ambre-400' : 'border-acier-300 dark:border-acier-600'}`}>
                    {selectedYears.includes(year) && (
                      <svg className="w-[7px] h-[7px] text-creme dark:text-charbon-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5L4.5 7.5L8 2" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[11px] text-charbon-600 dark:text-creme-300 font-display">
                    {year} <span className="text-acier-300 dark:text-acier-500">({count})</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Transmission — toggle chips */}
          <Section
            title="Transmission"
            isOpen={openSections.transmission}
            onToggle={() => toggleSection('transmission')}
          >
            <div className="flex flex-wrap gap-1.5">
              {filterOptions?.transmissions.length === 0 && (
                <p className="text-[11px] text-acier-400 italic font-display">Aucune transmission disponible</p>
              )}
              {filterOptions?.transmissions.map((trans) => (
                <button
                  type="button"
                  key={trans.transmission}
                  onClick={() => {
                    setSelectedTransmissions(prev =>
                      prev.includes(trans.transmission)
                        ? prev.filter(t => t !== trans.transmission)
                        : [...prev, trans.transmission]
                    )
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-display transition-all ${
                    selectedTransmissions.includes(trans.transmission)
                      ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900 font-semibold'
                      : 'border border-creme-400 dark:border-charbon-600 text-charbon-500 dark:text-creme-400'
                  }`}
                  data-testid={`filter-transmission-${trans.transmission}`}
                >
                  {formatTransmission(trans.transmission)} <span className={`text-[9px] ${selectedTransmissions.includes(trans.transmission) ? 'opacity-70' : 'text-acier-300 dark:text-acier-500'}`}>({trans.count})</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Carburant — toggle chips */}
          <Section
            title="Carburant"
            isOpen={openSections.fuel}
            onToggle={() => toggleSection('fuel')}
          >
            <div className="flex flex-wrap gap-1.5">
              {filterOptions?.fuel_types.length === 0 && (
                <p className="text-[11px] text-acier-400 italic font-display">Aucun carburant disponible</p>
              )}
              {filterOptions?.fuel_types.map((ft) => (
                <button
                  type="button"
                  key={ft.fuel_type}
                  onClick={() => {
                    setSelectedFuelTypes(prev =>
                      prev.includes(ft.fuel_type)
                        ? prev.filter(f => f !== ft.fuel_type)
                        : [...prev, ft.fuel_type]
                    )
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-display transition-all ${
                    selectedFuelTypes.includes(ft.fuel_type)
                      ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900 font-semibold'
                      : 'border border-creme-400 dark:border-charbon-600 text-charbon-500 dark:text-creme-400'
                  }`}
                  data-testid={`filter-fuel-${ft.fuel_type}`}
                >
                  {ft.fuel_type} <span className={`text-[9px] ${selectedFuelTypes.includes(ft.fuel_type) ? 'opacity-70' : 'text-acier-300 dark:text-acier-500'}`}>({ft.count})</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Traction */}
          <Section
            title="Traction"
            isOpen={openSections.drivetrain}
            onToggle={() => toggleSection('drivetrain')}
          >
            <div className="flex flex-wrap gap-1.5">
              {filterOptions?.drivetrains.length === 0 && (
                <p className="text-[11px] text-acier-400 italic font-display">Aucune traction disponible</p>
              )}
              {filterOptions?.drivetrains.map((dt) => (
                <button
                  type="button"
                  key={dt.drivetrain}
                  onClick={() => {
                    setSelectedDrivetrains(prev =>
                      prev.includes(dt.drivetrain)
                        ? prev.filter(d => d !== dt.drivetrain)
                        : [...prev, dt.drivetrain]
                    )
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-display transition-all ${
                    selectedDrivetrains.includes(dt.drivetrain)
                      ? 'bg-charbon-900 text-creme dark:bg-ambre-400 dark:text-charbon-900 font-semibold'
                      : 'border border-creme-400 dark:border-charbon-600 text-charbon-500 dark:text-creme-400'
                  }`}
                  data-testid={`filter-drivetrain-${dt.drivetrain}`}
                >
                  {dt.drivetrain} <span className={`text-[9px] ${selectedDrivetrains.includes(dt.drivetrain) ? 'opacity-70' : 'text-acier-300 dark:text-acier-500'}`}>({dt.count})</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Couleur */}
          <Section
            title="Couleur"
            isOpen={openSections.color}
            onToggle={() => toggleSection('color')}
          >
            <div className="flex flex-wrap gap-2">
              {Object.entries(colorMap).map(([name, hex]) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => {
                    setSelectedColors(prev =>
                      prev.includes(name)
                        ? prev.filter(c => c !== name)
                        : [...prev, name]
                    )
                  }}
                  className={`
                    w-7 h-7 rounded-full border-2 transition-all
                    ${selectedColors.includes(name) ? 'ring-2 ring-ambre-400 dark:ring-ambre-400 ring-offset-2 ring-offset-creme dark:ring-offset-dark-filter' : 'border-creme-400 dark:border-charbon-600'}
                  `}
                  style={{ backgroundColor: hex }}
                  title={name}
                  data-testid={`filter-color-${name}`}
                />
              ))}
            </div>
          </Section>
        </div>
        )}

        {/* Sticky bottom: Apply button (desktop) + Mobile CTA */}
        {!collapsed && (
          <div className={`sticky bottom-0 bg-[#F0EBE1] dark:bg-dark-filter border-t border-creme-300 dark:border-charbon-700 p-3 ${mobileOpen ? '' : 'hidden lg:block'}`}>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-ambre-400 hover:bg-ambre-500 text-charbon-900 font-bold rounded-lg transition-colors font-display text-sm"
              data-testid="mobile-see-results-btn"
            >
              Appliquer
              {totalResults !== undefined && (
                <span className="text-xs font-normal opacity-80">({totalResults.toLocaleString('fr-CA')} résultats)</span>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// Icon button component for collapsed view
interface IconButtonProps {
  icon: string
  label: string
  onClick: () => void
}

function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-2 rounded-lg hover:bg-creme-200 dark:hover:bg-charbon-700 transition-colors group relative"
      title={label}
    >
      <span className="text-2xl">{icon}</span>
      {/* Tooltip */}
      <span className="invisible group-hover:visible absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2 py-1 text-[10px] bg-charbon-900 dark:bg-creme-200 text-creme dark:text-charbon-900 rounded whitespace-nowrap font-display">
        {label}
      </span>
    </button>
  )
}

// Section component with accordion
interface SectionProps {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Section({ title, isOpen, onToggle, children }: SectionProps) {
  return (
    <div className="pb-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center w-full text-left mb-2"
      >
        <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-acier-500 dark:text-acier-400 font-display">
          {title}
        </h4>
        <svg className={`w-3 h-3 ml-auto text-acier-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div>{children}</div>}
    </div>
  )
}

// Dual Range Slider component for bidirectional min/max selection
interface DualRangeSliderProps {
  min: number
  max: number
  step: number
  values: { min: number; max: number }
  onChange: (values: { min: number; max: number }) => void
  testIdPrefix: string
}

function DualRangeSlider({ min, max, step, values, onChange, testIdPrefix }: DualRangeSliderProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(parseInt(e.target.value), values.max - step)
    onChange({ ...values, min: newMin })
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(parseInt(e.target.value), values.min + step)
    onChange({ ...values, max: newMax })
  }

  // Calculate percentages for track fill
  const minPercent = ((values.min - min) / (max - min)) * 100
  const maxPercent = ((values.max - min) / (max - min)) * 100

  return (
    <div className="relative h-6">
      {/* Background track */}
      <div className="absolute w-full h-1.5 bg-charbon-200 dark:bg-charbon-700 rounded top-1/2 -translate-y-1/2" />
      
      {/* Active track (filled portion) */}
      <div
        className="absolute h-1.5 bg-ambre-400 rounded top-1/2 -translate-y-1/2"
        style={{
          left: `${minPercent}%`,
          width: `${maxPercent - minPercent}%`
        }}
      />
      
      {/* Min slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={values.min}
        onChange={handleMinChange}
        className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-ambre-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-ambre-400 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white top-1/2 -translate-y-1/2"
        data-testid={`${testIdPrefix}-slider-min`}
      />
      
      {/* Max slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={values.max}
        onChange={handleMaxChange}
        className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-ambre-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-ambre-400 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white top-1/2 -translate-y-1/2"
        data-testid={`${testIdPrefix}-slider-max`}
      />
    </div>
  )
}
