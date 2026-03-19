import { useQuery } from '@tanstack/react-query'
import { fetchStats, fetchVehicles } from '../api'
import type { VehicleFilters } from '../types'

/**
 * Fetches paginated + filtered vehicle listings from the FastAPI backend.
 *
 * - Caches for 5 minutes (staleTime)
 * - Automatically refetches every 10 minutes (refetchInterval)
 * - Query key includes all filter params so changing filters triggers a new fetch
 */
export function useVehicles(filters: VehicleFilters) {
  return useQuery({
    queryKey: ['vehicles', filters],
    queryFn: () => fetchVehicles(filters),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    placeholderData: (prev) => prev, // Keep previous data while fetching next page
  })
}

/**
 * Fetches global platform statistics.
 * Refreshes every 5 minutes.
 */
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}
