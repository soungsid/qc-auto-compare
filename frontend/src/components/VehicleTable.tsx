import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import type { Vehicle, VehicleFilters } from '../types'
import { LeaseOfferBadge } from './LeaseOfferBadge'

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
    ? n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
    : '—'

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
const columnHelper = createColumnHelper<Vehicle>()

const columns = [
  columnHelper.accessor('year', {
    header: 'Année',
    cell: (i) => <span className="font-semibold text-gray-900 dark:text-white">{i.getValue()}</span>,
    size: 70,
  }),
  columnHelper.accessor('make', { 
    header: 'Marque', 
    size: 100,
    cell: (i) => <span className="text-gray-900 dark:text-gray-100">{i.getValue()}</span>,
  }),
  columnHelper.accessor('model', { 
    header: 'Modèle', 
    size: 110,
    cell: (i) => <span className="text-gray-900 dark:text-gray-100">{i.getValue()}</span>,
  }),
  columnHelper.accessor('trim', {
    header: 'Version',
    cell: (i) => <span className="text-gray-700 dark:text-gray-300">{i.getValue() ?? '—'}</span>,
    size: 120,
  }),
  columnHelper.accessor('drivetrain', {
    header: 'Traction',
    cell: (i) => (
      <span className="rounded bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-gray-700 dark:text-gray-300">
        {i.getValue() ?? '—'}
      </span>
    ),
    size: 80,
  }),
  columnHelper.accessor('msrp', {
    header: 'PDSF',
    cell: (i) => <span className="text-gray-500 dark:text-gray-400">{fmt(i.getValue())}</span>,
    size: 110,
  }),
  columnHelper.accessor('sale_price', {
    header: 'Prix vente',
    cell: (i) => <span className="font-semibold text-gray-900 dark:text-white">{fmt(i.getValue())}</span>,
    size: 115,
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
  }),
  columnHelper.display({
    id: 'lease',
    header: 'Pmt/mois',
    cell: ({ row }) => <LeaseOfferBadge offers={row.original.lease_offers} />,
    size: 130,
  }),
  columnHelper.accessor((row) => row.dealer?.name, {
    id: 'dealer_name',
    header: 'Concess.',
    cell: (i) => <span className="text-sm text-gray-700 dark:text-gray-300">{i.getValue() ?? '—'}</span>,
    size: 160,
  }),
  columnHelper.accessor((row) => row.dealer?.city, {
    id: 'dealer_city',
    header: 'Ville',
    cell: (i) => <span className="text-sm text-gray-600 dark:text-gray-400">{i.getValue() ?? '—'}</span>,
    size: 100,
  }),
  columnHelper.accessor((row) => row.dealer?.phone, {
    id: 'dealer_phone',
    header: 'Tél.',
    cell: (i) => {
      const phone = i.getValue()
      return phone ? (
        <a href={`tel:${phone}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          {phone}
        </a>
      ) : (
        <span className="text-gray-400 dark:text-gray-500">—</span>
      )
    },
    size: 120,
  }),
  columnHelper.accessor('ingest_source', {
    header: 'Source',
    cell: (i) => <SourceBadge source={i.getValue()} />,
    size: 90,
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
  }),
]

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
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
      'Année', 'Marque', 'Modèle', 'Version', 'Traction',
      'PDSF', 'Prix vente', 'Concessionnaire', 'Ville', 'Source',
    ]
    const rows = data.map((v) => [
      v.year, v.make, v.model, v.trim ?? '',
      v.drivetrain ?? '', v.msrp ?? '', v.sale_price ?? '',
      v.dealer?.name ?? '', v.dealer?.city ?? '', v.ingest_source,
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="vehicle-count">
          {isLoading ? 'Chargement…' : `${total.toLocaleString('fr-CA')} véhicules`}
        </p>
        <button
          onClick={exportCSV}
          data-testid="export-csv-btn"
          className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exporter CSV
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-800">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 select-none"
                    style={{ width: header.column.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className={header.column.getCanSort() ? 'cursor-pointer hover:text-gray-800 dark:hover:text-gray-200' : ''}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </span>
                  </th>
                ))}
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
              disabled={filters.page <= 1}
              onClick={() => onFiltersChange({ page: filters.page - 1 })}
              data-testid="pagination-prev"
              className="rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              ← Précédente
            </button>
            <button
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
