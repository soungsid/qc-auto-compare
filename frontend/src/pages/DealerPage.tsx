import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import axios from 'axios'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { VehicleTable } from '../components/VehicleTable'
import { DEFAULT_FILTERS, type Dealer, type VehicleFilters, type VehicleListResponse } from '../types'

interface Props {
  slug: string
}

/**
 * Dealer detail page — shows dealer info + their full inventory.
 *
 * In a real app with React Router this would be a route:
 *   <Route path="/dealers/:slug" element={<DealerPage />} />
 */
export function DealerPage({ slug }: Props) {
  const [filters, setFilters] = useState<VehicleFilters>(DEFAULT_FILTERS)

  const { data: dealer, isLoading: dealerLoading } = useQuery({
    queryKey: ['dealer', slug],
    queryFn: async () => {
      const { data } = await axios.get<Dealer>(`/api/dealers/${slug}`)
      return data
    },
  })

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['dealer-vehicles', slug, filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        sort: filters.sort,
        order: filters.order,
        page: filters.page,
        limit: filters.limit,
      }
      if (filters.condition) params.condition = filters.condition
      const { data } = await axios.get<VehicleListResponse>(`/api/dealers/${slug}/vehicles`, { params })
      return data
    },
    enabled: !!slug,
  })

  if (dealerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-brand-400">
        Chargement du concessionnaire…
      </div>
    )
  }

  if (!dealer) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">
        Concessionnaire introuvable.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-50 dark:bg-dark-primary text-brand-900 dark:text-brand-100 flex flex-col">
      <Navbar />

      {/* Dealer Info */}
      <div className="border-b border-surface-border dark:border-brand-800 bg-white dark:bg-brand-900">
        <div className="mx-auto max-w-screen-xl px-6 py-4">
          <a href="/" className="mb-2 inline-block text-xs text-brand-700 dark:text-brand-300 hover:underline">
            ← Retour au listing
          </a>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-100">{dealer.name}</h1>
              <p className="text-sm text-brand-500 dark:text-brand-400">
                {dealer.brand} · {dealer.city}
              </p>
            </div>
            <div className="text-right text-sm text-brand-500 dark:text-brand-400">
              {dealer.phone && (
                <p>
                  <a href={`tel:${dealer.phone}`} className="text-brand-700 dark:text-brand-300 hover:underline">
                    {dealer.phone}
                  </a>
                </p>
              )}
              {dealer.website && (
                <p>
                  <a
                    href={dealer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 dark:text-brand-300 hover:underline"
                  >
                    Site officiel ↗
                  </a>
                </p>
              )}
              {dealer.last_crawled_at && (
                <p className="mt-1 text-xs text-brand-400 dark:text-brand-500">
                  Dernier crawl :{' '}
                  {new Date(dealer.last_crawled_at).toLocaleString('fr-CA', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-screen-xl px-6 py-6 flex-1">
        <VehicleTable
          data={vehicles?.items ?? []}
          total={vehicles?.total ?? 0}
          filters={filters}
          onFiltersChange={(updated) => setFilters((prev) => ({ ...prev, ...updated }))}
          isLoading={vehiclesLoading}
        />
      </main>

      <Footer />
    </div>
  )
}
