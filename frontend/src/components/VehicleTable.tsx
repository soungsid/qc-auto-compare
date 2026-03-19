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
  crawler: 'bg-blue-100 text-blue-700',
  copilot: 'bg-purple-100 text-purple-700',
  cline: 'bg-indigo-100 text-indigo-700',
  claude: 'bg-violet-100 text-violet-700',
  manual: 'bg-gray-100 text-gray-600',
  csv_import: 'bg-yellow-100 text-yellow-700',
}

function SourceBadge({ source }: { source: string }) {
  const cls = SOURCE_STYLES[source] ?? 'bg-gray-100 text-gray-600'
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
    cell: (i) => <span className="font-semibold">{i.getValue()}</span>,
    size: 70,
  }),
  columnHelper.accessor('make', { header: 'Marque', size: 100 }),
  columnHelper.accessor('model', { header: 'Modèle', size: 110 }),
  columnHelper.accessor('trim', {
    header: 'Version',
    cell: (i) => i.getValue() ?? '—',
    size: 120,
  }),
  columnHelper.accessor('drivetrain', {
    header: 'Traction',
    cell: (i) => (
      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">
        {i.getValue() ?? '—'}
      </span>
    ),
    size: 80,
  }),
  columnHelper.accessor('msrp', {
    header: 'PDSF',
    cell: (i) => <span className="text-gray-500">{fmt(i.getValue())}</span>,
    size: 110,
  }),
  columnHelper.accessor('sale_price', {
    header: 'Prix vente',
    cell: (i) => <span className="font-semibold text-gray-900">{fmt(i.getValue())}</span>,
    size: 115,
  }),
  columnHelper.display({
    id: 'savings',
    header: 'Écon.',
    cell: ({ row }) => {
      const msrp = row.original.msrp
      const sale = row.original.sale_price
      if (!msrp || !sale) return <span className="text-gray-400">—</span>
      const savings = msrp - sale
      return savings > 0 ? (
        <span className="font-semibold text-green-600">{fmt(savings)}</span>
      ) : (
        <span className="text-gray-400">—</span>
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
    cell: (i) => <span className="text-sm">{i.getValue() ?? '—'}</span>,
    size: 160,
  }),
  columnHelper.accessor((row) => row.dealer?.city, {
    id: 'dealer_city',
    header: 'Ville',
    cell: (i) => <span className="text-sm text-gray-600">{i.getValue() ?? '—'}</span>,
    size: 100,
  }),
  columnHelper.accessor((row) => row.dealer?.phone, {
    id: 'dealer_phone',
    header: 'Tél.',
    cell: (i) => {
      const phone = i.getValue()
      return phone ? (
        <a href={`tel:${phone}`} className="text-sm text-blue-600 hover:underline">
          {phone}
        </a>
      ) : (
        <span className="text-gray-400">—</span>
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
          className="text-xs text-blue-600 hover:underline"
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
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {isLoading ? 'Chargement…' : `${total.toLocaleString('fr-CA')} véhicules`}
        </p>
        <button
          onClick={exportCSV}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ⬇ Exporter CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 select-none"
                    style={{ width: header.column.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className={header.column.getCanSort() ? 'cursor-pointer hover:text-gray-800' : ''}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && ' ↑'}
                      {header.column.getIsSorted() === 'desc' && ' ↓'}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-400">
                  Chargement des véhicules…
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-400">
                  Aucun véhicule trouvé avec ces filtres.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isCheapest = cheapestIds.has(row.original.id)
                return (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-gray-50 ${isCheapest ? 'bg-green-50' : ''}`}
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
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {filters.page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => onFiltersChange({ page: filters.page - 1 })}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Précédente
            </button>
            <button
              disabled={filters.page >= totalPages}
              onClick={() => onFiltersChange({ page: filters.page + 1 })}
              className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
            >
              Suivante →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
