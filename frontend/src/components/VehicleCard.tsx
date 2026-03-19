import type { Vehicle } from '../types'
import { ConditionBadge } from './ConditionBadge'
import { FingerprintBadge } from './FingerprintBadge'
import { LeaseOfferBadge } from './LeaseOfferBadge'

/**
 * FEATURE #2: Vehicle card component for grid view
 */

interface Props {
  vehicle: Vehicle
}

// Source badge colours
const SOURCE_STYLES: Record<string, string> = {
  crawler: 'bg-blue-500',
  copilot: 'bg-purple-500',
  cline: 'bg-indigo-500',
  claude: 'bg-violet-500',
  manual: 'bg-gray-500',
  csv_import: 'bg-yellow-500',
  test: 'bg-orange-500',
}

const fmt = (n?: number | null) =>
  n != null
    ? n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })
    : '—'

export function VehicleCard({ vehicle }: Props) {
  const {
    make,
    model,
    trim,
    year,
    condition,
    sale_price,
    msrp,
    drivetrain,
    transmission,
    color_ext,
    mileage_km,
    dealer,
    listing_url,
    image_url,
    ingest_source,
    fingerprint,
    lease_offers,
  } = vehicle

  const savings = msrp && sale_price ? msrp - sale_price : null
  const sourceColor = SOURCE_STYLES[ingest_source] ?? 'bg-gray-500'

  return (
    <div
      className="relative flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600"
      data-testid={`vehicle-card-${vehicle.id}`}
    >
      {/* Source badge - top right corner */}
      <div
        className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${sourceColor}`}
      >
        {ingest_source}
      </div>

      {/* Image section */}
      <div className="relative aspect-[16/10] bg-gray-100 dark:bg-slate-700 overflow-hidden">
        {image_url ? (
          <img
            src={image_url}
            alt={`${year} ${make} ${model}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
              </svg>
              <span className="text-sm font-medium">{make} {model}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Header: Condition + Year */}
        <div className="flex items-center gap-2">
          <ConditionBadge condition={condition} />
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{year}</span>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
            {make} {model}
          </h3>
          {trim && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Version: {trim}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {fmt(sale_price)}
          </span>
          {msrp && msrp !== sale_price && (
            <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
              {fmt(msrp)}
            </span>
          )}
          {savings && savings > 0 && (
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              -{fmt(savings)}
            </span>
          )}
        </div>

        {/* Lease payment */}
        {lease_offers && lease_offers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Location:</span>
            <LeaseOfferBadge offers={lease_offers} />
          </div>
        )}

        {/* Details */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
          {dealer && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {dealer.name} — {dealer.city}
            </span>
          )}
          {color_ext && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              {color_ext}
            </span>
          )}
          {(drivetrain || transmission) && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {[drivetrain, transmission].filter(Boolean).join(' • ')}
            </span>
          )}
          {mileage_km != null && mileage_km > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {mileage_km.toLocaleString('fr-CA')} km
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        {listing_url ? (
          <a
            href={listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Voir le véhicule
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
        
        {/* Fingerprint */}
        <FingerprintBadge fingerprint={fingerprint} />
      </div>
    </div>
  )
}
