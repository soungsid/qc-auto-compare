import type { Vehicle } from '../types'
import { LeaseOfferBadge } from './LeaseOfferBadge'

interface Props {
  vehicle: Vehicle
}

const fmt = (n?: number | null) =>
  n != null
    ? n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
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
    fingerprint,
    lease_offers,
  } = vehicle

  const savings = msrp && sale_price ? msrp - sale_price : null
  const conditionLabel = condition?.toLowerCase() === 'new' ? 'Neuf' : 'Occasion'

  return (
    <div
      className="relative flex flex-row sm:flex-col rounded-lg border border-surface-border dark:border-brand-700 bg-white dark:bg-dark-secondary overflow-hidden transition-all hover:border-brand-200 dark:hover:border-brand-600"
      data-testid={`vehicle-card-${vehicle.id}`}
      data-fingerprint={fingerprint}
    >
      {/* Image with badges */}
      <div className="relative w-[100px] sm:w-full h-auto sm:h-[90px] min-h-[80px] bg-brand-50 dark:bg-dark-tertiary overflow-hidden flex-shrink-0">
        {image_url ? (
          <img
            src={image_url}
            alt={`${year} ${make} ${model}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <svg className="w-8 h-8 text-brand-200 dark:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.079-.504 1.005-1.12l-1.035-8.276A2.25 2.25 0 0018.118 7.5H5.882a2.25 2.25 0 00-2.237 2.004L2.61 17.631A1.005 1.005 0 003.62 18.75" />
            </svg>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-[7px] left-[7px] flex gap-1">
          <span className="bg-brand-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wide">
            {conditionLabel}
          </span>
          <span className="hidden sm:inline bg-surface-muted text-brand-500 dark:bg-dark-tertiary dark:text-brand-300 text-[8px] font-semibold px-1.5 py-0.5 rounded border border-surface-border dark:border-brand-600">
            {year}
          </span>
        </div>
      </div>

      {/* Body + Footer wrapper for mobile horizontal layout */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Body */}
        <div className="px-3 pt-2 sm:pt-2.5 pb-1 sm:pb-1.5 flex-1 flex flex-col">
        {/* Brand */}
        <span className="text-[9px] text-brand-400 dark:text-brand-500 uppercase tracking-wider">{make}</span>

        {/* Name */}
        <h3 className="text-[13px] font-bold text-brand-700 dark:text-brand-100 leading-tight mt-0.5 mb-1.5">
          {model}
          {trim && <span className="font-normal text-[11px] text-brand-400 dark:text-brand-500 ml-1">{trim}</span>}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[15px] font-extrabold text-accent-400" style={{ letterSpacing: '-0.03em' }}>
            {fmt(sale_price)}
          </span>
          {msrp && msrp !== sale_price && (
            <span className="text-[11px] text-brand-300 line-through">{fmt(msrp)}</span>
          )}
          {savings != null && savings > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              -{fmt(savings)}
            </span>
          )}
        </div>

        {/* Lease */}
        {lease_offers && lease_offers.length > 0 && (
          <div className="mb-2">
            <LeaseOfferBadge offers={lease_offers} />
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-col gap-0.5 mb-2">
          {dealer && (
            <div className="text-[9px] text-brand-400 dark:text-brand-500 flex items-center gap-1">
              <span>📍</span>
              <span>{dealer.name} — {dealer.city}</span>
            </div>
          )}
          <div className="text-[9px] text-brand-400 dark:text-brand-500 flex items-center gap-1">
            {mileage_km != null && mileage_km > 0 && (
              <span>{mileage_km.toLocaleString('fr-CA')} km</span>
            )}
            {drivetrain && (
              <>
                <span className="w-[3px] h-[3px] rounded-full bg-brand-300 dark:bg-brand-600" />
                <span>{drivetrain}</span>
              </>
            )}
            {transmission && (
              <>
                <span className="w-[3px] h-[3px] rounded-full bg-brand-300 dark:bg-brand-600" />
                <span>{transmission === 'Automatique' ? 'Auto' : transmission}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t sm:border-t border-surface-border-light dark:border-brand-700 px-3 py-1.5 flex items-center justify-between mt-auto">
        <div className="flex gap-1.5 flex-wrap">
          {color_ext && (
            <span className="text-[9px] bg-surface-muted dark:bg-dark-tertiary text-brand-400 dark:text-brand-400 px-1.5 py-0.5 rounded">
              {color_ext}
            </span>
          )}
        </div>
        {listing_url ? (
          <a
            href={listing_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-accent-400 hover:text-accent-500 transition-colors"
          >
            Voir →
          </a>
        ) : (
          <span className="text-[10px] text-brand-300">—</span>
        )}
      </div>
      </div>{/* end body+footer wrapper */}
    </div>
  )
}
