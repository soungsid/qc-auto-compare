import { useState, useEffect } from 'react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { SEO, getDealerSchema, getBreadcrumbSchema } from '../components/SEO'
import { baseUrl, backendUrl } from '../config'
import type { Dealer } from '../types'

/**
 * Page de listing des concessionnaires avec filtres
 */
export function DealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [filterBrand, setFilterBrand] = useState<string>('')
  const [filterCity, setFilterCity] = useState<string>('')

  // Fetch dealers from API
  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const params = new URLSearchParams()
        if (filterBrand) params.append('brand', filterBrand)
        if (filterCity) params.append('city', filterCity)
        
        const response = await fetch(`${backendUrl}/api/dealers?${params}`)
        const data = await response.json()
        setDealers(data)
      } catch (error) {
        console.error('Error fetching dealers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDealers()
  }, [filterBrand, filterCity])

  // Get unique brands and cities for filters
  const brands = Array.from(new Set(dealers.map(d => d.brand))).sort()
  const cities = Array.from(new Set(dealers.map(d => d.city).filter(Boolean))).sort()

  const breadcrumbs = getBreadcrumbSchema([
    { name: 'Accueil', url: baseUrl },
    { name: 'Concessionnaires', url: `${baseUrl}/dealers` }
  ])

  const dealersSchema = dealers.length > 0 ? {
    "@context": "https://schema.org",
    "@graph": [
      ...dealers.slice(0, 10).map(dealer => getDealerSchema(dealer)),
      breadcrumbs
    ]
  } : breadcrumbs

  return (
    <div className="min-h-screen bg-brand-50 dark:bg-dark-primary text-brand-900 dark:text-brand-100 transition-colors flex flex-col">
      <SEO
        title="Concessionnaires automobiles au Québec"
        description="Trouvez un concessionnaire automobile près de chez vous à Montréal, Québec, Laval et partout au Québec. Coordonnées, inventaire et site web."
        keywords={['concessionnaires', 'dealers', 'Montréal', 'Québec', 'Laval', 'auto', 'véhicules', ...brands]}
        structuredData={dealersSchema}
      />
      <Navbar />

      {/* Main Content */}
      <main className="mx-auto w-full max-w-screen-2xl px-6 py-8 flex-1">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-brand-900 dark:text-brand-100 mb-2">
            Concessionnaires
          </h2>
          <p className="text-brand-500 dark:text-brand-400">
            Trouvez un concessionnaire près de chez vous
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="px-4 py-2 border border-brand-300 dark:border-brand-700 rounded-lg bg-white dark:bg-brand-900 text-brand-900 dark:text-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            data-testid="filter-brand"
          >
            <option value="">Toutes les marques</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="px-4 py-2 border border-brand-300 dark:border-brand-700 rounded-lg bg-white dark:bg-brand-900 text-brand-900 dark:text-brand-100 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            data-testid="filter-city"
          >
            <option value="">Toutes les villes</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          {(filterBrand || filterCity) && (
            <button
              onClick={() => {
                setFilterBrand('')
                setFilterCity('')
              }}
              className="px-4 py-2 text-sm text-brand-700 dark:text-brand-300 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Dealers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-brand-500 dark:text-brand-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Chargement...
            </div>
          </div>
        ) : dealers.length === 0 ? (
          <div className="text-center py-12 text-brand-500 dark:text-brand-400">
            Aucun concessionnaire trouvé
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="dealers-grid">
            {dealers.map(dealer => (
              <div
                key={dealer.id}
                className="bg-white dark:bg-brand-900 rounded-xl border border-surface-border dark:border-brand-800 p-6 shadow-sm hover:shadow-md transition-all"
                data-testid={`dealer-card-${dealer.slug}`}
              >
                {/* Brand badge */}
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-accent-100 dark:bg-brand-900/40 text-accent-600 dark:text-accent-300">
                    {dealer.brand}
                  </span>
                </div>

                {/* Dealer name */}
                <h3 className="text-lg font-bold text-brand-900 dark:text-brand-100 mb-2">
                  {dealer.name}
                </h3>

                {/* Details */}
                <div className="space-y-2 text-sm text-brand-500 dark:text-brand-400 mb-4">
                  {dealer.city && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{dealer.city}</span>
                    </div>
                  )}
                  {dealer.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${dealer.phone}`} className="hover:text-accent-500 dark:hover:text-accent-400">
                        {dealer.phone}
                      </a>
                    </div>
                  )}
                  {dealer.address && (
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="flex-1">{dealer.address}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {dealer.inventory_url && (
                    <a
                      href={dealer.inventory_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium text-accent-500 dark:text-accent-400 bg-accent-50 dark:bg-brand-900/20 rounded-lg hover:bg-accent-100 dark:hover:bg-brand-900/30 transition-colors"
                    >
                      Voir l'inventaire
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  {dealer.website && (
                    <a
                      href={dealer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-800 transition-colors"
                      title="Site web"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
