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
  years: { min: number; max: number }
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
export function VehicleSearchFilters({ onChange, onReset, collapsed = false, onToggleCollapse, totalResults }: Props) {
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
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({})
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<Record<string, string[]>>({})
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([])
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([])
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([])
  const [selectedDrivetrains, setSelectedDrivetrains] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [vehicleCondition, setVehicleCondition] = useState<'all' | 'new' | 'used'>('all')
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 })
  const [mileageRange, setMileageRange] = useState({ min: 0, max: 300000 })
  const [yearRange, setYearRange] = useState({ min: 2000, max: 2026 })
  const [priceSliderValues, setPriceSliderValues] = useState({ min: 0, max: 100000 })
  const [mileageSliderValues, setMileageSliderValues] = useState({ min: 0, max: 300000 })
  const [yearSliderValues, setYearSliderValues] = useState({ min: 2000, max: 2026 })

  // Fetch filter options from API — re-fetches with context when primary filters change
  useEffect(() => {
    const fetchOptions = async (isInitial: boolean) => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || ''
        const params = new URLSearchParams()
        if (selectedBrands.length === 1) params.set('make', selectedBrands[0])
        if (vehicleCondition && vehicleCondition !== 'all') params.set('condition', vehicleCondition)
        const url = `${backendUrl}/api/filters/options${params.toString() ? `?${params}` : ''}`
        const response = await fetch(url)
        const data = await response.json()
        setFilterOptions(data)

        // Only initialise slider bounds on first load (not on context re-fetches)
        if (isInitial) {
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
            setYearSliderValues({ min, max })
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
    fetchOptions(selectedBrands.length === 0 && !vehicleCondition)
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
    if (priceSliderValues.min > (filterOptions?.price_range.min || 0)) {
      newFilters.min_price = priceSliderValues.min
    }
    if (priceSliderValues.max < (filterOptions?.price_range.max || 100000)) {
      newFilters.max_price = priceSliderValues.max
    }

    // Year range (bidirectional)
    if (yearSliderValues.min > (filterOptions?.years.min || 2000)) {
      newFilters.year_min = yearSliderValues.min
    }
    if (yearSliderValues.max < (filterOptions?.years.max || 2026)) {
      newFilters.year_max = yearSliderValues.max
    }

    // Mileage range (bidirectional)
    if (mileageSliderValues.max < (filterOptions?.mileage_range.max || 300000)) {
      newFilters.mileage_max = mileageSliderValues.max
    }

    return newFilters
  }, [
    vehicleCondition, selectedBrands, selectedModels, selectedBodyTypes, selectedFuelTypes,
    selectedTransmissions, selectedDrivetrains, priceSliderValues, yearSliderValues, mileageSliderValues,
    filterOptions
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
    setYearSliderValues({ min: filterOptions?.years.min || 2000, max: filterOptions?.years.max || 2026 })
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

  const visibleBrands = showAllBrands 
    ? filterOptions?.brands || [] 
    : (filterOptions?.brands || []).slice(0, 8)

  return (
    <>
      {/* Mobile: Floating filter button */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          data-testid="mobile-filters-btn"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtres {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </button>
      </div>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:sticky top-0 left-0 h-screen lg:h-auto
          ${collapsed ? 'w-16 lg:w-16' : 'w-80 lg:w-72'}
          bg-white dark:bg-slate-800 
          border-r lg:border border-gray-200 dark:border-slate-700
          overflow-y-auto z-50 lg:z-auto
          transition-all duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        data-testid="filters-sidebar"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between z-10">
          {!collapsed && (
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Filtres
              {totalResults !== undefined && (
                <span className="text-sm font-normal text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                  {totalResults.toLocaleString('fr-CA')} résultats
                </span>
              )}
            </h3>
          )}
          <div className="flex items-center gap-2">
            {/* Desktop collapse toggle */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:block text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title={collapsed ? 'Développer' : 'Réduire'}
              >
                <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {!collapsed && (
              <>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                  data-testid="reset-filters-btn"
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="p-4 space-y-4">
          {/* Type de véhicule - avec option "Tous" */}
          <Section
            title="Type de véhicule"
            isOpen={openSections.type}
            onToggle={() => toggleSection('type')}
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="vehicle-type"
                  value="all"
                  checked={vehicleCondition === 'all'}
                  onChange={() => setVehicleCondition('all')}
                  className="w-4 h-4 text-blue-600"
                  data-testid="filter-condition-all"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Tous les véhicules</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="vehicle-type"
                  value="used"
                  checked={vehicleCondition === 'used'}
                  onChange={() => setVehicleCondition('used')}
                  className="w-4 h-4 text-blue-600"
                  data-testid="filter-condition-used"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Véhicules d'occasion</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="vehicle-type"
                  value="new"
                  checked={vehicleCondition === 'new'}
                  onChange={() => setVehicleCondition('new')}
                  className="w-4 h-4 text-blue-600"
                  data-testid="filter-condition-new"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Véhicules neufs</span>
              </label>
            </div>
          </Section>

          {/* Marque & Modèle */}
          <Section
            title="Marque & Modèle"
            isOpen={openSections.brand}
            onToggle={() => toggleSection('brand')}
          >
            <div className="space-y-2">
              {visibleBrands.length === 0 && (
                <p className="text-sm text-gray-400 italic">Aucune marque disponible</p>
              )}
              {visibleBrands.map((brandData) => (
                <div key={brandData.brand}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brandData.brand)}
                        onChange={() => handleBrandSelect(brandData.brand)}
                        className="w-4 h-4 text-blue-600 rounded"
                        data-testid={`filter-brand-${brandData.brand}`}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {brandData.brand} <span className="text-gray-400">({brandData.total_count})</span>
                      </span>
                    </label>
                    {brandData.models.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleBrand(brandData.brand)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedBrands[brandData.brand] ? 'rotate-180' : ''}`}
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
                    <div className="ml-6 mt-2 space-y-1">
                      {brandData.models.map((modelData) => (
                        <label key={modelData.model} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(selectedModels[brandData.brand] || []).includes(modelData.model)}
                            onChange={() => handleModelSelect(brandData.brand, modelData.model)}
                            className="w-3.5 h-3.5 text-blue-600 rounded"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {modelData.model} <span className="text-gray-400">({modelData.count})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {filterOptions && filterOptions.brands.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllBrands(!showAllBrands)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showAllBrands ? 'Montrer moins' : 'Montrer toutes les marques'}
                </button>
              )}
            </div>
          </Section>

          {/* Type de carrosserie */}
          <Section
            title="Type de carrosserie"
            isOpen={openSections.bodyType}
            onToggle={() => toggleSection('bodyType')}
          >
            <div className="grid grid-cols-2 gap-2">
              {filterOptions?.body_types.length === 0 && (
                <p className="col-span-2 text-sm text-gray-400 italic">Aucun type disponible</p>
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
                    flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                    ${selectedBodyTypes.includes(bt.body_type)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-slate-600 hover:border-gray-300'
                    }
                  `}
                  data-testid={`filter-body-${bt.body_type}`}
                >
                  <span className="text-2xl mb-1">{bodyTypeIcons[bt.body_type] || '🚗'}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{bt.body_type}</span>
                  <span className="text-xs text-gray-400">({bt.count})</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Prix - Slider bidirectionnel */}
          <Section
            title="Prix"
            isOpen={openSections.price}
            onToggle={() => toggleSection('price')}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
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

          {/* Kilométrage - Slider bidirectionnel */}
          <Section
            title="Kilométrage"
            isOpen={openSections.mileage}
            onToggle={() => toggleSection('mileage')}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
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

          {/* Année - Slider bidirectionnel */}
          <Section
            title="Année"
            isOpen={openSections.year}
            onToggle={() => toggleSection('year')}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>De {yearSliderValues.min}</span>
                <span>À {yearSliderValues.max}</span>
              </div>
              <DualRangeSlider
                min={yearRange.min}
                max={yearRange.max}
                step={1}
                values={yearSliderValues}
                onChange={setYearSliderValues}
                testIdPrefix="year"
              />
            </div>
          </Section>

          {/* Transmission */}
          <Section
            title="Transmission"
            isOpen={openSections.transmission}
            onToggle={() => toggleSection('transmission')}
          >
            <div className="space-y-2">
              {filterOptions?.transmissions.length === 0 && (
                <p className="text-sm text-gray-400 italic">Aucune transmission disponible</p>
              )}
              {filterOptions?.transmissions.map((trans) => (
                <label key={trans.transmission} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTransmissions.includes(trans.transmission)}
                    onChange={() => {
                      setSelectedTransmissions(prev =>
                        prev.includes(trans.transmission)
                          ? prev.filter(t => t !== trans.transmission)
                          : [...prev, trans.transmission]
                      )
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                    data-testid={`filter-transmission-${trans.transmission}`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {formatTransmission(trans.transmission)} <span className="text-gray-400">({trans.count})</span>
                  </span>
                </label>
              ))}
            </div>
          </Section>

          {/* Carburant */}
          <Section
            title="Carburant"
            isOpen={openSections.fuel}
            onToggle={() => toggleSection('fuel')}
          >
            <div className="space-y-2">
              {filterOptions?.fuel_types.length === 0 && (
                <p className="text-sm text-gray-400 italic">Aucun carburant disponible</p>
              )}
              {filterOptions?.fuel_types.map((ft) => (
                <label key={ft.fuel_type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFuelTypes.includes(ft.fuel_type)}
                    onChange={() => {
                      setSelectedFuelTypes(prev =>
                        prev.includes(ft.fuel_type)
                          ? prev.filter(f => f !== ft.fuel_type)
                          : [...prev, ft.fuel_type]
                      )
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                    data-testid={`filter-fuel-${ft.fuel_type}`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {ft.fuel_type} <span className="text-gray-400">({ft.count})</span>
                  </span>
                </label>
              ))}
            </div>
          </Section>

          {/* Traction */}
          <Section
            title="Traction"
            isOpen={openSections.drivetrain}
            onToggle={() => toggleSection('drivetrain')}
          >
            <div className="space-y-2">
              {filterOptions?.drivetrains.length === 0 && (
                <p className="text-sm text-gray-400 italic">Aucune traction disponible</p>
              )}
              {filterOptions?.drivetrains.map((dt) => (
                <label key={dt.drivetrain} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDrivetrains.includes(dt.drivetrain)}
                    onChange={() => {
                      setSelectedDrivetrains(prev =>
                        prev.includes(dt.drivetrain)
                          ? prev.filter(d => d !== dt.drivetrain)
                          : [...prev, dt.drivetrain]
                      )
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                    data-testid={`filter-drivetrain-${dt.drivetrain}`}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {dt.drivetrain} <span className="text-gray-400">({dt.count})</span>
                  </span>
                </label>
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
                    w-8 h-8 rounded-full border-2 transition-all
                    ${selectedColors.includes(name) ? 'ring-2 ring-blue-500 ring-offset-2' : 'border-gray-300'}
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

        {/* UX-05: Sticky footer mobile — "Voir les N résultats" */}
        {!collapsed && mobileOpen && (
          <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
              data-testid="mobile-see-results-btn"
            >
              Voir{totalResults !== undefined ? ` les ${totalResults.toLocaleString('fr-CA')}` : ''} résultats →
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
      className="w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group relative"
      title={label}
    >
      <span className="text-2xl">{icon}</span>
      {/* Tooltip */}
      <span className="invisible group-hover:visible absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2 py-1 text-xs bg-gray-900 dark:bg-slate-700 text-white rounded whitespace-nowrap">
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
    <div className="border-b border-gray-200 dark:border-slate-700 pb-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left mb-3"
      >
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
          {title}
        </h4>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
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
      <div className="absolute w-full h-2 bg-gray-200 dark:bg-slate-600 rounded top-1/2 -translate-y-1/2" />
      
      {/* Active track (filled portion) */}
      <div
        className="absolute h-2 bg-blue-500 rounded top-1/2 -translate-y-1/2"
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
        className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 top-1/2 -translate-y-1/2"
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
        className="absolute w-full h-2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0 top-1/2 -translate-y-1/2"
        data-testid={`${testIdPrefix}-slider-max`}
      />
    </div>
  )
}
