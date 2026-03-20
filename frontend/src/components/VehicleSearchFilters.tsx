import { useState, useEffect } from 'react'
import type { VehicleFilters } from '../types'

interface FilterOptions {
  brands: Array<{
    brand: string
    total_count: number
    models: Array<{ model: string; count: number }>
  }>
  body_types: Array<{ body_type: string; count: number }>
  transmissions: Array<{ transmission: string; count: number }>
  drivetrains: Array<{ drivetrain: string; count: number }>
  colors: string[]
  years: { min: number; max: number }
  price_range: { min: number; max: number }
  mileage_range: { min: number; max: number }
}

interface Props {
  onChange: (filters: Partial<VehicleFilters>) => void
  onReset: () => void
  totalResults?: number
}

/**
 * Composant de filtres avancés inspiré de HGrégoire
 * - Sidebar verticale sur desktop
 * - Overlay mobile avec bouton d'ouverture
 * - Sections accordéon
 * - Marque & Modèle hiérarchiques
 * - Sliders de plage
 * - Sélecteur de couleurs visuelles
 */
export function VehicleSearchFilters({ onChange, onReset, totalResults = 0 }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true,
    brand: true,
    bodyType: true,
    price: true,
    mileage: false,
    year: false,
    transmission: false,
    drivetrain: false,
    color: false,
  })
  const [showAllBrands, setShowAllBrands] = useState(false)
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({})
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedModels, setSelectedModels] = useState<Record<string, string[]>>({})
  const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([])
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([])
  const [selectedDrivetrains, setSelectedDrivetrains] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: 0, max: 70000 })
  const [mileageRange, setMileageRange] = useState({ min: 0, max: 150000 })
  const [yearRange, setYearRange] = useState({ min: 2000, max: 2026 })

  // Fetch filter options from API
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const backendUrl = import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/api/filters/options`)
        const data = await response.json()
        setFilterOptions(data)
        
        // Set initial ranges from API
        if (data.price_range) {
          setPriceRange({ min: data.price_range.min, max: data.price_range.max })
        }
        if (data.years) {
          setYearRange({ min: data.years.min, max: data.years.max })
        }
        if (data.mileage_range) {
          setMileageRange({ min: data.mileage_range.min, max: data.mileage_range.max })
        }
      } catch (error) {
        console.error('Error fetching filter options:', error)
      }
    }
    fetchOptions()
  }, [])

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleBrand = (brand: string) => {
    setExpandedBrands(prev => ({ ...prev, [brand]: !prev[brand] }))
  }

  const handleBrandSelect = (brand: string) => {
    const newSelected = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand]
    setSelectedBrands(newSelected)
    
    // If unselecting brand, remove its models too
    if (!newSelected.includes(brand)) {
      const newModels = { ...selectedModels }
      delete newModels[brand]
      setSelectedModels(newModels)
    }
  }

  const handleModelSelect = (brand: string, model: string) => {
    const brandModels = selectedModels[brand] || []
    const newBrandModels = brandModels.includes(model)
      ? brandModels.filter(m => m !== model)
      : [...brandModels, model]
    
    setSelectedModels({
      ...selectedModels,
      [brand]: newBrandModels
    })
  }

  const handleApplyFilters = () => {
    // Build filter query
    const newFilters: Partial<VehicleFilters> = {
      page: 1,
    }

    // Brands & Models
    if (selectedBrands.length > 0) {
      newFilters.make = selectedBrands[0] // For now, single brand
    }

    // Body types
    if (selectedBodyTypes.length > 0) {
      // @ts-ignore - body_type will be added to VehicleFilters
      newFilters.body_type = selectedBodyTypes[0]
    }

    // Price
    if (priceRange.min > (filterOptions?.price_range.min || 0)) {
      newFilters.min_price = priceRange.min
    }
    if (priceRange.max < (filterOptions?.price_range.max || 100000)) {
      newFilters.max_price = priceRange.max
    }

    // Year
    if (yearRange.min > (filterOptions?.years.min || 2000)) {
      newFilters.year_min = yearRange.min
    }
    if (yearRange.max < (filterOptions?.years.max || 2026)) {
      newFilters.year_max = yearRange.max
    }

    // Mileage
    if (mileageRange.max < (filterOptions?.mileage_range.max || 150000)) {
      newFilters.mileage_max = mileageRange.max
    }

    onChange(newFilters)
    setMobileOpen(false)
  }

  const handleReset = () => {
    setSelectedBrands([])
    setSelectedModels({})
    setSelectedBodyTypes([])
    setSelectedTransmissions([])
    setSelectedDrivetrains([])
    setSelectedColors([])
    setPriceRange({ min: filterOptions?.price_range.min || 0, max: filterOptions?.price_range.max || 70000 })
    setMileageRange({ min: 0, max: filterOptions?.mileage_range.max || 150000 })
    setYearRange({ min: filterOptions?.years.min || 2000, max: filterOptions?.years.max || 2026 })
    onReset()
  }

  const activeFiltersCount = 
    selectedBrands.length + 
    selectedBodyTypes.length + 
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
          w-80 lg:w-72 bg-white dark:bg-slate-800 
          border-r lg:border border-gray-200 dark:border-slate-700
          overflow-y-auto z-50 lg:z-auto
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        data-testid="filters-sidebar"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filtres</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
              data-testid="reset-filters-btn"
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Type de véhicule */}
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
                  value="used"
                  defaultChecked
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Véhicules d'occasion</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="vehicle-type"
                  value="new"
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Véhicules neufs (spéciaux)</span>
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
              {visibleBrands.map((brandData) => (
                <div key={brandData.brand}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brandData.brand)}
                        onChange={() => handleBrandSelect(brandData.brand)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {brandData.brand} <span className="text-gray-400">({brandData.total_count})</span>
                      </span>
                    </label>
                    {brandData.models.length > 0 && (
                      <button
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
              {filterOptions?.body_types.map((bt) => (
                <button
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
                >
                  <span className="text-2xl mb-1">{bodyTypeIcons[bt.body_type] || '🚗'}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{bt.body_type}</span>
                  <span className="text-xs text-gray-400">({bt.count})</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Prix */}
          <Section
            title="Prix"
            isOpen={openSections.price}
            onToggle={() => toggleSection('price')}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{priceRange.min.toLocaleString('fr-CA')} $</span>
                <span>{priceRange.max.toLocaleString('fr-CA')} $</span>
              </div>
              <input
                type="range"
                min={filterOptions?.price_range.min || 0}
                max={filterOptions?.price_range.max || 70000}
                step={500}
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </Section>

          {/* Kilométrage */}
          <Section
            title="Kilométrage"
            isOpen={openSections.mileage}
            onToggle={() => toggleSection('mileage')}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{mileageRange.min.toLocaleString('fr-CA')} km</span>
                <span>{mileageRange.max.toLocaleString('fr-CA')} km</span>
              </div>
              <input
                type="range"
                min={0}
                max={filterOptions?.mileage_range.max || 150000}
                step={5000}
                value={mileageRange.max}
                onChange={(e) => setMileageRange({ ...mileageRange, max: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </Section>

          {/* Année */}
          <Section
            title="Année"
            isOpen={openSections.year}
            onToggle={() => toggleSection('year')}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>{yearRange.min}</span>
                <span>{yearRange.max}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="range"
                  min={filterOptions?.years.min || 2000}
                  max={filterOptions?.years.max || 2026}
                  value={yearRange.min}
                  onChange={(e) => setYearRange({ ...yearRange, min: parseInt(e.target.value) })}
                  className="w-full"
                />
                <input
                  type="range"
                  min={filterOptions?.years.min || 2000}
                  max={filterOptions?.years.max || 2026}
                  value={yearRange.max}
                  onChange={(e) => setYearRange({ ...yearRange, max: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </Section>

          {/* Transmission */}
          <Section
            title="Transmission"
            isOpen={openSections.transmission}
            onToggle={() => toggleSection('transmission')}
          >
            <div className="space-y-2">
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
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {trans.transmission} <span className="text-gray-400">({trans.count})</span>
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
                />
              ))}
            </div>
          </Section>
        </div>

        {/* Submit button (sticky at bottom) */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4">
          <button
            onClick={handleApplyFilters}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            data-testid="apply-filters-btn"
          >
            Voir les {totalResults.toLocaleString('fr-CA')} résultats
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </>
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
