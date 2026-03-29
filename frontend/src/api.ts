import axios from 'axios'
import type { StatsResponse, VehicleFilters, VehicleListResponse, CrawlHistoryResponse, CrawlStatusResponse } from './types'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

export async function fetchVehicles(filters: VehicleFilters): Promise<VehicleListResponse> {
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

export async function fetchCrawlHistory(days = 30, source?: string): Promise<CrawlHistoryResponse> {
  const params: Record<string, string | number> = { days }
  if (source) params.source = source
  const { data } = await api.get<CrawlHistoryResponse>('/api/crawl/history', { params })
  return data
}

export async function fetchCrawlStatus(): Promise<CrawlStatusResponse> {
  const { data } = await api.get<CrawlStatusResponse>('/api/crawl/status')
  return data
}

export async function triggerCrawlRun(spiders: string[] = []): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/api/crawl/run', { spiders })
  return data
}
