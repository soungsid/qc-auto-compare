import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import type { Vehicle, VehicleFilters } from '../types'
import { LeaseOfferBadge } from './LeaseOfferBadge'
import { ConditionBadge } from './ConditionBadge'
import { FingerprintBadge } from './FingerprintBadge'

// ---------------------------------------------------------------------------
// Source badge colours
// ---------------------------------------------------------------------------
const SOURCE_STYLES: Record<string, string> = {
  crawler: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  copilot: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  cline: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  claude: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  manual: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  csv_import: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
}

function SourceBadge({ source }: { source: string }) {
  const cls = SOURCE_STYLES[source] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {source}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Price formatter
// ---------------------------------------------------------------------------
const fmt = (n?: number | null) =>
  n != null
    ? n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : '—'

// ---------------------------------------------------------------------------
// Sortable columns mapping (must match backend SORTABLE_COLUMNS)
// ---------------------------------------------------------------------------
const SORTABLE_COLUMNS: Record<string, string> = {
  year: 'year',
  make: 'make',
  model: 'model',
  msrp: 'msrp',
  sale_price: 'sale_price',
  mileage_km: 'mileage_km',
  created_at: 'created_at',
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const columnHelper = createColumnHelper<Vehicle>()

const createColumns = (showAdvanced: boolean) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseColumns: ColumnDef<Vehicle, any>[] = [
    columnHelper.accessor('year', {
      id: 'year',
      header: 'Année',
      cell: (i) => <span className="font-semibold text-gray-900 dark:text-white">{i.getValue()}</span>,
      size: 70,
      enableSorting: true,
    }),
    columnHelper.accessor('make', {
      id: 'make',
      header: 'Marque',
      size: 100,
      cell: (i) => <span className="text-gray-900 dark:text-gray-100">{i.getValue()}</span>,
      enableSorting: true,
    }),
    columnHelper.accessor('model', {
      id: 'model',
      header: 'Modèle',
      size: 110,
      cell: (i) => <span className="text-gray-900 dark:text-gray-100">{i.getValue()}</span>,
      enableSorting: true,
    }),
    columnHelper.accessor('trim', {
      header: 'Version',
      cell: (i) => <span className="text-gray-700 dark:text-gray-300">{i.getValue() ?? '—'}</span>,
      size: 120,
      enableSorting: false,
    }),
    columnHelper.accessor('condition', {
      header: 'État',
      cell: (i) => <ConditionBadge condition={i.getValue()} />,
      size: 80,
      enableSorting: false,
    }),
    columnHelper.accessor('drivetrain', {
      header: 'Traction',
      cell: (i) => (
        <span className="rounded bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">
          {i.getValue() ?? '—'}
        </span>
      ),
      size: 80,
      enableSorting: false,
    }),
    columnHelper.accessor('msrp', {
      id: 'msrp',
      header: 'PDSF',
      cell: (i) => <span className="text-gray-500 dark:text-gray-400">{fmt(i.getValue())}</span>,
      size: 110,
      enableSorting: true,
    }),
    columnHelper.accessor('sale_price', {
      id: 'sale_price',
      header: 'Prix vente',
      cell: (i) => <span className="font-semibold text-gray-900 dark:text-white">{fmt(i.getValue())}</span>,
      size: 115,
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'savings',
      header: 'Écon.',
      cell: ({ row }) => {
        const msrp = row.original.msrp
        const sale = row.original.sale_price
        if (!msrp || !sale) return <span className="text-gray-400 dark:text-gray-500">—</span>
        const savings = msrp - sale
        return savings > 0 ? (
          <span className="font-semibold text-green-600 dark:text-green-400">{fmt(savings)}</span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">—</span>
        )
      },
      size: 100,
      enableSorting: false,
    }),
    columnHelper.display({
      id: 'lease',
      header: 'Pmt/mois',
      cell: ({ row }) => <LeaseOfferBadge offers={row.original.lease_offers} />,
      size: 130,
      enableSorting: false,
    }),
    columnHelper.accessor((row) => row.dealer?.name, {
      id: 'dealer_name',
      header: 'Concess.',
      cell: (i) => <span className="text-sm text-gray-700 dark:text-gray-300">{i.getValue() ?? '—'}</span>,
      size: 160,
      enableSorting: false,
    }),
    columnHelper.accessor((row) => row.dealer?.city, {
      id: 'dealer_city',
      header: 'Ville',
      cell: (i) => <span className="text-sm text-gray-600 dark:text-gray-400">{i.getValue() ?? '—'}</span>,
      size: 100,
      enableSorting: false,
    }),
    columnHelper.accessor('ingest_source', {
      header: 'Source',
      cell: (i) => <SourceBadge source={i.getValue()} />,
      size: 90,
      enableSorting: false,
    }),
    columnHelper.display({
      id: 'link',
      header: '',
      cell: ({ row }) =>
        row.original.listing_url ? (
          <a
            href={row.original.listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Voir →
          </a>
        ) : null,
      size: 60,
      enableSorting: false,
    }),
  ]

  // Add advanced columns if enabled (FEATURE #1)
  if (showAdvanced) {
    baseColumns.push(
      columnHelper.accessor('fingerprint', {
        id: 'fingerprint',
        header: 'ID',
        cell: (i) => <FingerprintBadge fingerprint={i.getValue()} />,
        size: 100,
        enableSorting: false,
      }),
      columnHelper.accessor('mileage_km', {
        id: 'mileage_km',
        header: 'Km',
        cell: (i) => {
          const km = i.getValue()
          return km ? (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {km.toLocaleString('fr-CA')} km
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">—</span>
          )
        },
        size: 90,
        enableSorting: true,
      }),
      columnHelper.accessor('color_ext', {
        header: 'Couleur',
        cell: (i) => <span className="text-sm text-gray-600 dark:text-gray-400">{i.getValue() ?? '—'}</span>,
        size: 120,
        enableSorting: false,
      })
    )
  }

  return baseColumns
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  data: Vehicle[]
  total: number
  filters: VehicleFilters
  onFiltersChange: (updated: Partial<VehicleFilters>) => void
  isLoading?: boolean
}

export function VehicleTable({ data, total, filters, onFiltersChange, isLoading }: Props) {
  // Advanced columns toggle state (persisted in localStorage)
  const [showAdvanced, setShowAdvanced] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('qc-auto-show-advanced') === 'true'
    }
    return false
  })

  // Toggle advanced columns
  const toggleAdvanced = () => {
    const newValue = !showAdvanced
    setShowAdvanced(newValue)
    localStorage.setItem('qc-auto-show-advanced', String(newValue))
  }

  // Memoize columns based on showAdvanced state
  const columns = useMemo(() => createColumns(showAdvanced), [showAdvanced])

  // BUG #1 FIX: Convert filters.sort/order to SortingState for React Table display
  const sorting: SortingState = useMemo(() => {
    if (filters.sort && SORTABLE_COLUMNS[filters.sort]) {
      return [{ id: filters.sort, desc: filters.order === 'desc' }]
    }
    return []
  }, [filters.sort, filters.order])

  // BUG #1 FIX: Handle sorting change - update filters to trigger server-side sort
  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const newSorting = typeof updater === 'function' ? updater(sorting) : updater
    
    if (newSorting.length > 0) {
      const { id, desc } = newSorting[0]
      // Only update if this is a sortable column
      if (SORTABLE_COLUMNS[id]) {
        onFiltersChange({
          sort: id,
          order: desc ? 'desc' : 'asc',
          page: 1, // Reset to page 1 when sorting changes
        })
      }
    } else {
      // Reset to default sort
      onFiltersChange({
        sort: 'sale_price',
        order: 'asc',
        page: 1,
      })
    }
  }

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    // BUG #1 FIX: Remove getSortedRowModel - sorting is now server-side
    manualSorting: true,  // Tell React Table that sorting is handled externally
    manualPagination: true,
    rowCount: total,
  })

  // Top 5 cheapest row IDs for highlight
  const cheapestIds = new Set(
    [...data]
      .filter((v) => v.sale_price != null)
      .sort((a, b) => (a.sale_price ?? 0) - (b.sale_price ?? 0))
      .slice(0, 5)
      .map((v) => v.id),
  )

  const totalPages = Math.ceil(total / filters.limit)

  // Export CSV
  const exportCSV = () => {
    const headers = [
      'Année', 'Marque', 'Modèle', 'Version', 'État', 'Traction',
      'PDSF', 'Prix vente', 'Kilométrage', 'Concessionnaire', 'Ville', 'Source', 'Fingerprint',
    ]
    const rows = data.map((v) => [
      v.year, v.make, v.model, v.trim ?? '',
      v.condition, v.drivetrain ?? '', v.msrp ?? '', v.sale_price ?? '',
      v.mileage_km ?? '', v.dealer?.name ?? '', v.dealer?.city ?? '', v.ingest_source, v.fingerprint,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qc-auto-compare-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-3" data-testid="vehicle-table">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="vehicle-count">
          {isLoading ? 'Chargement…' : `${total.toLocaleString('fr-CA')} véhicules`}
        </p>
        <div className="flex items-center gap-2">
          {/* Advanced columns toggle */}
          <button
            type="button"
            onClick={toggleAdvanced}
            data-testid="toggle-advanced-btn"
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${
              showAdvanced
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600'
                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            {showAdvanced ? '− Colonnes avancées' : '+ Colonnes avancées'}
          </button>
          {/* Export CSV */}
          <button
            type="button"
            onClick={exportCSV}
            data-testid="export-csv-btn"
            className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const isSorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={`whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 select-none ${
                        canSort ? 'cursor-pointer hover:text-gray-800 dark:hover:text-gray-200' : ''
                      }`}
                      style={{ width: header.column.getSize() }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-gray-400">
                            {isSorted === 'asc' ? '↑' : isSorted === 'desc' ? '↓' : '⇅'}
                          </span>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Chargement des véhicules…
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  Aucun véhicule trouvé avec ces filtres.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isCheapest = cheapestIds.has(row.original.id)
                return (
                  <tr
                    key={row.id}
                    data-testid={`vehicle-row-${row.original.id}`}
                    className={`transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 ${isCheapest ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400" data-testid="pagination">
          <span>
            Page {filters.page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => onFiltersChange({ page: filters.page - 1 })}
              data-testid="pagination-prev"
              className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              ← Précédente
            </button>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => onFiltersChange({ page: filters.page + 1 })}
              data-testid="pagination-next"
              className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Suivante →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Need React import for useState
import React from 'react'
