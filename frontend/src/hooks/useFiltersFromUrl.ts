import { useCallback, useEffect, useMemo, useState } from 'react'
import type { VehicleFilters } from '../types'
import { DEFAULT_FILTERS } from '../types'

/**
 * AMÉLIORATION #4: Hook to sync filters with URL search params
 * 
 * This allows:
 * - Sharing URLs with pre-applied filters
 * - Browser back/forward navigation through filter states
 * - Bookmarking specific filter configurations
 * 
 * Uses native browser APIs (no react-router dependency).
 */
export function useFiltersFromUrl() {
  // Force re-render on URL changes
  const [, forceUpdate] = useState(0)

  // Listen for popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => forceUpdate((n) => n + 1)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Parse filters from current URL
  const filters: VehicleFilters = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search)

    const getString = (key: string): string | undefined => {
      const value = searchParams.get(key)
      return value && value.trim() !== '' ? value : undefined
    }

    const getNumber = (key: string): number | undefined => {
      const value = searchParams.get(key)
      if (!value || value.trim() === '') return undefined
      const num = Number(value)
      return isNaN(num) ? undefined : num
    }

    return {
      make: getString('make'),
      model: getString('model'),
      trim: getString('trim'),
      condition: getString('condition'),
      body_type: getString('body_type'),
      fuel_type: getString('fuel_type'),
      transmission: getString('transmission'),
      drivetrain: getString('drivetrain'),
      city: getString('city'),
      min_price: getNumber('min_price'),
      max_price: getNumber('max_price'),
      year_min: getNumber('year_min'),
      year_max: getNumber('year_max'),
      mileage_max: getNumber('mileage_max'),
      max_monthly_payment: getNumber('max_monthly_payment'),
      payment_frequency: getString('payment_frequency'),
      ingest_source: getString('ingest_source'),
      sort: getString('sort') ?? DEFAULT_FILTERS.sort,
      order: (getString('order') as 'asc' | 'desc') ?? DEFAULT_FILTERS.order,
      page: getNumber('page') ?? DEFAULT_FILTERS.page,
      limit: getNumber('limit') ?? DEFAULT_FILTERS.limit,
    }
  }, [window.location.search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update URL when filters change
  const setFilters = useCallback(
    (updated: Partial<VehicleFilters>) => {
      // Get current filters from URL
      const current = { ...filters }
      const merged = { ...current, ...updated }

      const newParams = new URLSearchParams()

      // Set or delete each filter param
      const setOrDelete = (key: string, value: unknown) => {
        if (value !== undefined && value !== null && value !== '') {
          newParams.set(key, String(value))
        }
      }

      // Only include non-default/non-empty values in URL
      setOrDelete('make', merged.make)
      setOrDelete('model', merged.model)
      setOrDelete('trim', merged.trim)
      setOrDelete('condition', merged.condition)
      setOrDelete('body_type', merged.body_type)
      setOrDelete('fuel_type', merged.fuel_type)
      setOrDelete('transmission', merged.transmission)
      setOrDelete('drivetrain', merged.drivetrain)
      setOrDelete('city', merged.city)
      setOrDelete('min_price', merged.min_price)
      setOrDelete('max_price', merged.max_price)
      setOrDelete('year_min', merged.year_min)
      setOrDelete('year_max', merged.year_max)
      setOrDelete('mileage_max', merged.mileage_max)
      setOrDelete('max_monthly_payment', merged.max_monthly_payment)
      setOrDelete('payment_frequency', merged.payment_frequency)
      setOrDelete('ingest_source', merged.ingest_source)

      // Only include sort/order if different from defaults
      if (merged.sort !== DEFAULT_FILTERS.sort) {
        newParams.set('sort', merged.sort)
      }

      if (merged.order !== DEFAULT_FILTERS.order) {
        newParams.set('order', merged.order)
      }

      // Only include page if not 1
      if (merged.page !== 1) {
        newParams.set('page', String(merged.page))
      }

      // Update URL without page reload
      const newUrl = newParams.toString()
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname

      window.history.pushState({}, '', newUrl)
      forceUpdate((n) => n + 1)
    },
    [filters]
  )

  // Reset filters (clears URL params)
  const resetFilters = useCallback(() => {
    window.history.pushState({}, '', window.location.pathname)
    forceUpdate((n) => n + 1)
  }, [])

  return { filters, setFilters, resetFilters }
}
