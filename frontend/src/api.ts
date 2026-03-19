import axios from 'axios'
import type { StatsResponse, VehicleFilters, VehicleListResponse } from './types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

export async function fetchVehicles(filters: VehicleFilters): Promise<VehicleListResponse> {
  // Remove undefined/empty values before sending
  const params: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params[key] = value as string | number
    }
  }
  const { data } = await api.get<VehicleListResponse>('/api/vehicles', { params })
  return data
}

export async function fetchStats(): Promise<StatsResponse> {
  const { data } = await api.get<StatsResponse>('/api/crawl/stats')
  return data
}
