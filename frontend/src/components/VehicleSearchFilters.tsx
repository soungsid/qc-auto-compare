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

  return (
    <>
      {/* Mobile: Floating action button (bottom-right) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-5 right-5 z-30 flex items-center gap-2 px-4 py-3 bg-accent-400 text-white font-bold rounded-full shadow-lg hover:bg-accent-500 transition-colors min-h-[48px] text-[11px]"
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
          w-full ${collapsed ? 'lg:w-16' : 'lg:w-[220px]'}
          max-h-[85vh] lg:max-h-none lg:h-screen
          rounded-t-[10px] lg:rounded-none
          bg-white dark:bg-dark-secondary
          lg:border-r border-surface-border dark:border-brand-700
          overflow-y-auto z-50 lg:z-auto
          transition-all duration-300
          ${mobileOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
        `}
        data-testid="filters-sidebar"
      >
        {/* Mobile handle bar */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-secondary p-[14px] flex items-center justify-between z-10">
          {!collapsed && (
            <h3 className="text-[12px] font-bold text-brand-700 dark:text-brand-200 flex items-center gap-2">
              Filtres
              {totalResults !== undefined && (
                <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 bg-brand-50 dark:bg-brand-700/30 px-2 py-0.5 rounded-full">
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
                className="hidden lg:block text-gray-400 hover:text-brand-700 dark:hover:text-brand-200"
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
                  className="text-[10px] text-accent-400 hover:text-accent-500"
                  data-testid="reset-filters-btn"
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
          <div className="p-[14px] space-y-4">
          {/* Type de véhicule */}
          <Section
            title="Type de véhicule"
            isOpen={openSections.type}
            onToggle={() => toggleSection('type')}
          >
            <div className="space-y-2">
              <div
                className="flex items-center gap-2 cursor-pointer min-h-[44px] sm:min-h-0"
                onClick={() => setVehicleCondition('all')}
                data-testid="filter-condition-all"
              >
                <div className={`w-3 h-3 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${vehicleCondition === 'all' ? 'border-brand-700 dark:border-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                  {vehicleCondition === 'all' && <div className="w-[5px] h-[5px] rounded-full bg-brand-700 dark:bg-brand-200" />}
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Tous les véhicules</span>
              </div>
              <div
                className="flex items-center gap-2 cursor-pointer min-h-[44px] sm:min-h-0"
                onClick={() => setVehicleCondition('used')}
                data-testid="filter-condition-used"
              >
                <div className={`w-3 h-3 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${vehicleCondition === 'used' ? 'border-brand-700 dark:border-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                  {vehicleCondition === 'used' && <div className="w-[5px] h-[5px] rounded-full bg-brand-700 dark:bg-brand-200" />}
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Véhicules d'occasion</span>
              </div>
              <div
                className="flex items-center gap-2 cursor-pointer min-h-[44px] sm:min-h-0"
                onClick={() => setVehicleCondition('new')}
                data-testid="filter-condition-new"
              >
                <div className={`w-3 h-3 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${vehicleCondition === 'new' ? 'border-brand-700 dark:border-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                  {vehicleCondition === 'new' && <div className="w-[5px] h-[5px] rounded-full bg-brand-700 dark:bg-brand-200" />}
                </div>
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Véhicules neufs</span>
              </div>
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
                className="w-full px-2 py-1.5 text-[11px] border border-surface-border dark:border-brand-700 rounded bg-white dark:bg-dark-secondary text-gray-600 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-500 focus:outline-none focus:border-brand-700 dark:focus:border-brand-200"
              />
              {visibleBrands.length === 0 && (
                <p className="text-[11px] text-gray-400 italic">Aucune marque disponible</p>
              )}
              {visibleBrands.map((brandData) => (
                <div key={brandData.brand}>
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-2 cursor-pointer flex-1"
                      onClick={() => handleBrandSelect(brandData.brand)}
                      data-testid={`filter-brand-${brandData.brand}`}
                    >
                      <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedBrands.includes(brandData.brand) ? 'border-brand-700 bg-brand-700 dark:border-brand-200 dark:bg-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                        {selectedBrands.includes(brandData.brand) && (
                          <svg className="w-[7px] h-[7px] text-white dark:text-brand-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 5L4.5 7.5L8 2" />
                          </svg>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-600 dark:text-gray-300">
                        {brandData.brand} <span className="text-gray-300 dark:text-gray-500">({brandData.total_count})</span>
                      </span>
                    </div>
                    {brandData.models.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleBrand(brandData.brand)}
                        className="p-1 text-gray-400 hover:text-gray-600"
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
                          <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${(selectedModels[brandData.brand] || []).includes(modelData.model) ? 'border-brand-700 bg-brand-700 dark:border-brand-200 dark:bg-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                            {(selectedModels[brandData.brand] || []).includes(modelData.model) && (
                              <svg className="w-[7px] h-[7px] text-white dark:text-brand-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 5L4.5 7.5L8 2" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-600 dark:text-gray-300">
                            {modelData.model} <span className="text-gray-300 dark:text-gray-500">({modelData.count})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* Type de carrosserie */}
          <Section
            title="Type de carrosserie"
            isOpen={openSections.bodyType}
            onToggle={() => toggleSection('bodyType')}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {filterOptions?.body_types.length === 0 && (
                <p className="col-span-2 text-[11px] text-gray-400 italic">Aucun type disponible</p>
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
                  className={`
                    flex flex-col items-center justify-center py-[6px] px-[4px] rounded-[5px] transition-all text-center
                    ${selectedBodyTypes.includes(bt.body_type)
                      ? 'border-[1.5px] border-brand-700 dark:border-brand-200 bg-brand-50 dark:bg-brand-700/30'
                      : 'border-[0.5px] border-surface-border dark:border-brand-700 hover:border-gray-300'
                    }
                  `}
                  data-testid={`filter-body-${bt.body_type}`}
                >
                  <span className="text-[16px] mb-0.5">{bodyTypeIcons[bt.body_type] || '🚗'}</span>
                  <span className={`text-[9px] ${selectedBodyTypes.includes(bt.body_type) ? 'font-semibold text-brand-700 dark:text-brand-200' : 'text-gray-600 dark:text-gray-300'}`}>{bt.body_type}</span>
                  <span className="text-[9px] text-gray-300 dark:text-gray-500">({bt.count})</span>
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
                  className="w-full px-2 py-1.5 text-[11px] border border-surface-border dark:border-brand-700 rounded bg-white dark:bg-dark-secondary text-gray-600 dark:text-gray-300 focus:outline-none focus:border-brand-700"
                  data-testid="price-input-min"
                />
                <span className="text-[9px] text-gray-400 flex-shrink-0">—</span>
                <input
                  type="number"
                  value={priceSliderValues.max}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) setPriceSliderValues(prev => ({ ...prev, max: Math.min(priceRange.max, Math.max(val, prev.min)) }))
                  }}
                  className="w-full px-2 py-1.5 text-[11px] border border-surface-border dark:border-brand-700 rounded bg-white dark:bg-dark-secondary text-gray-600 dark:text-gray-300 focus:outline-none focus:border-brand-700"
                  data-testid="price-input-max"
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
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
                  className="w-full px-2 py-1.5 text-[11px] border border-surface-border dark:border-brand-700 rounded bg-white dark:bg-dark-secondary text-gray-600 dark:text-gray-300 focus:outline-none focus:border-brand-700"
                  data-testid="mileage-input-min"
                />
                <span className="text-[9px] text-gray-400 flex-shrink-0">—</span>
                <input
                  type="number"
                  value={mileageSliderValues.max}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val)) setMileageSliderValues(prev => ({ ...prev, max: Math.min(mileageRange.max, Math.max(val, prev.min)) }))
                  }}
                  className="w-full px-2 py-1.5 text-[11px] border border-surface-border dark:border-brand-700 rounded bg-white dark:bg-dark-secondary text-gray-600 dark:text-gray-300 focus:outline-none focus:border-brand-700"
                  data-testid="mileage-input-max"
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
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
                  <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedYears.includes(year) ? 'border-brand-700 bg-brand-700 dark:border-brand-200 dark:bg-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                    {selectedYears.includes(year) && (
                      <svg className="w-[7px] h-[7px] text-white dark:text-brand-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5L4.5 7.5L8 2" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-300">
                    {year} <span className="text-gray-300 dark:text-gray-500">({count})</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Transmission */}
          <Section
            title="Transmission"
            isOpen={openSections.transmission}
            onToggle={() => toggleSection('transmission')}
          >
            <div className="space-y-1.5">
              {filterOptions?.transmissions.length === 0 && (
                <p className="text-[11px] text-gray-400 italic">Aucune transmission disponible</p>
              )}
              {filterOptions?.transmissions.map((trans) => (
                <div
                  key={trans.transmission}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    setSelectedTransmissions(prev =>
                      prev.includes(trans.transmission)
                        ? prev.filter(t => t !== trans.transmission)
                        : [...prev, trans.transmission]
                    )
                  }}
                  data-testid={`filter-transmission-${trans.transmission}`}
                >
                  <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedTransmissions.includes(trans.transmission) ? 'border-brand-700 bg-brand-700 dark:border-brand-200 dark:bg-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                    {selectedTransmissions.includes(trans.transmission) && (
                      <svg className="w-[7px] h-[7px] text-white dark:text-brand-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5L4.5 7.5L8 2" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-300">
                    {formatTransmission(trans.transmission)} <span className="text-gray-300 dark:text-gray-500">({trans.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Carburant */}
          <Section
            title="Carburant"
            isOpen={openSections.fuel}
            onToggle={() => toggleSection('fuel')}
          >
            <div className="space-y-1.5">
              {filterOptions?.fuel_types.length === 0 && (
                <p className="text-[11px] text-gray-400 italic">Aucun carburant disponible</p>
              )}
              {filterOptions?.fuel_types.map((ft) => (
                <div
                  key={ft.fuel_type}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    setSelectedFuelTypes(prev =>
                      prev.includes(ft.fuel_type)
                        ? prev.filter(f => f !== ft.fuel_type)
                        : [...prev, ft.fuel_type]
                    )
                  }}
                  data-testid={`filter-fuel-${ft.fuel_type}`}
                >
                  <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedFuelTypes.includes(ft.fuel_type) ? 'border-brand-700 bg-brand-700 dark:border-brand-200 dark:bg-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                    {selectedFuelTypes.includes(ft.fuel_type) && (
                      <svg className="w-[7px] h-[7px] text-white dark:text-brand-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5L4.5 7.5L8 2" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-300">
                    {ft.fuel_type} <span className="text-gray-300 dark:text-gray-500">({ft.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Traction */}
          <Section
            title="Traction"
            isOpen={openSections.drivetrain}
            onToggle={() => toggleSection('drivetrain')}
          >
            <div className="space-y-1.5">
              {filterOptions?.drivetrains.length === 0 && (
                <p className="text-[11px] text-gray-400 italic">Aucune traction disponible</p>
              )}
              {filterOptions?.drivetrains.map((dt) => (
                <div
                  key={dt.drivetrain}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    setSelectedDrivetrains(prev =>
                      prev.includes(dt.drivetrain)
                        ? prev.filter(d => d !== dt.drivetrain)
                        : [...prev, dt.drivetrain]
                    )
                  }}
                  data-testid={`filter-drivetrain-${dt.drivetrain}`}
                >
                  <div className={`w-[11px] h-[11px] rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedDrivetrains.includes(dt.drivetrain) ? 'border-brand-700 bg-brand-700 dark:border-brand-200 dark:bg-brand-200' : 'border-gray-300 dark:border-gray-500'}`}>
                    {selectedDrivetrains.includes(dt.drivetrain) && (
                      <svg className="w-[7px] h-[7px] text-white dark:text-brand-900" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 5L4.5 7.5L8 2" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-300">
                    {dt.drivetrain} <span className="text-gray-300 dark:text-gray-500">({dt.count})</span>
                  </span>
                </div>
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
                    ${selectedColors.includes(name) ? 'ring-2 ring-brand-700 dark:ring-brand-200 ring-offset-2' : 'border-gray-300 dark:border-gray-600'}
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

        {/* Mobile CTA — "Appliquer les filtres" */}
        {!collapsed && mobileOpen && (
          <div className="sticky bottom-0 bg-white dark:bg-dark-secondary border-t border-surface-border dark:border-brand-700 p-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-400 hover:bg-accent-500 text-white font-semibold rounded-lg transition-colors"
              data-testid="mobile-see-results-btn"
            >
              Appliquer les filtres
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
      className="w-full p-2 rounded-lg hover:bg-surface-muted dark:hover:bg-brand-700/30 transition-colors group relative"
      title={label}
    >
      <span className="text-2xl">{icon}</span>
      {/* Tooltip */}
      <span className="invisible group-hover:visible absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2 py-1 text-[10px] bg-brand-700 dark:bg-brand-200 text-white dark:text-brand-900 rounded whitespace-nowrap">
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
        <h4 className="text-[9px] font-bold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
          {title}
        </h4>
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
      <div className="absolute w-full h-1.5 bg-gray-200 dark:bg-brand-700/30 rounded top-1/2 -translate-y-1/2" />
      
      {/* Active track (filled portion) */}
      <div
        className="absolute h-1.5 bg-brand-700 dark:bg-brand-200 rounded top-1/2 -translate-y-1/2"
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
        className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-brand-700 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:bg-brand-700 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 top-1/2 -translate-y-1/2"
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
        className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-brand-700 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:bg-brand-700 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 top-1/2 -translate-y-1/2"
        data-testid={`${testIdPrefix}-slider-max`}
      />
    </div>
  )
}
