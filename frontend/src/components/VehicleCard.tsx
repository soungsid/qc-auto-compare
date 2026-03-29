import type { Vehicle } from '../types'
import { LeaseOfferBadge } from './LeaseOfferBadge'

interface Props {
  vehicle: Vehicle
  featured?: boolean
}

const fmt = (n?: number | null) =>
  n != null
    ? n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : '—'

export function VehicleCard({ vehicle, featured = false }: Props) {
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
    mileage_km,
    dealer,
    listing_url,
    image_url,
    fingerprint,
    lease_offers,
  } = vehicle

  const savings = msrp && sale_price ? msrp - sale_price : null
  const conditionLabel = condition?.toLowerCase() === 'new' ? 'Neuf' : 'Occasion'
  const isNew = condition?.toLowerCase() === 'new'

  /* ── Featured card: panoramic 3:1, info on the right ── */
  if (featured) {
    return (
      <div
        className="group relative rounded-xl overflow-hidden bg-white dark:bg-dark-card border border-creme-400 dark:border-charbon-600 hover:shadow-xl transition-all duration-300"
        data-testid={`vehicle-card-${vehicle.id}`}
        data-fingerprint={fingerprint}
      >
        <div className="flex flex-col md:flex-row">
          {/* Image — panoramic */}
          <div className="relative md:w-2/3 aspect-[3/1] md:aspect-auto overflow-hidden bg-creme-200 dark:bg-dark-elevated">
            {image_url ? (
              <img
                src={image_url}
                alt={`${year} ${make} ${model}`}
                className="card-image w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px] skeleton" />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-charbon-900/70 via-transparent to-transparent" />
            {/* Condition badge */}
            <span className={`absolute top-4 left-4 text-[9px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full ${
              isNew
                ? 'bg-ambre-400 text-charbon-900'
                : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'
            }`}>
              {conditionLabel}
            </span>
            {/* Model name overlay */}
            <div className="absolute bottom-4 left-4">
              <p className="text-creme-300 text-[10px] uppercase tracking-[0.12em] font-medium">{make}</p>
              <h3 className="text-white font-display text-2xl font-bold leading-tight">
                {year} {model}
                {trim && <span className="text-creme-300 font-normal text-lg ml-2">{trim}</span>}
              </h3>
            </div>
          </div>

          {/* Info panel */}
          <div className="md:w-1/3 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-ambre-400 tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                  {fmt(sale_price)}
                </span>
                {msrp && msrp !== sale_price && (
                  <span className="text-sm text-acier-400 line-through">{fmt(msrp)}</span>
                )}
              </div>
              {savings != null && savings > 0 && (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-bordeaux-400 dark:text-bordeaux-200 bg-bordeaux-50 dark:bg-bordeaux-700/20 px-2 py-0.5 rounded-full mb-3">
                  Économie {fmt(savings)}
                </span>
              )}
              {lease_offers && lease_offers.length > 0 && (
                <div className="mb-3"><LeaseOfferBadge offers={lease_offers} /></div>
              )}
              <div className="flex flex-wrap gap-2 text-[10px] text-acier-500 dark:text-acier-400 mb-4">
                {mileage_km != null && mileage_km > 0 && (
                  <span className="bg-creme-200 dark:bg-dark-elevated px-2 py-0.5 rounded">{mileage_km.toLocaleString('fr-CA')} km</span>
                )}
                {drivetrain && <span className="bg-creme-200 dark:bg-dark-elevated px-2 py-0.5 rounded">{drivetrain}</span>}
                {transmission && <span className="bg-creme-200 dark:bg-dark-elevated px-2 py-0.5 rounded">{transmission === 'Automatique' ? 'Auto' : transmission}</span>}
              </div>
              {dealer && (
                <p className="text-[10px] text-acier-400 dark:text-acier-500">{dealer.name} — {dealer.city}</p>
              )}
            </div>
            {listing_url && (
              <a
                href={listing_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center bg-charbon-900 dark:bg-ambre-400 text-creme dark:text-charbon-900 font-bold text-sm py-3 rounded-lg hover:bg-charbon-700 dark:hover:bg-ambre-300 transition-colors"
              >
                Voir l'offre →
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  /* ── Standard card: 65% image, gradient overlay, hover elevation ── */
  return (
    <div
      className="group relative flex flex-row sm:flex-col rounded-xl overflow-hidden bg-white dark:bg-dark-card border border-creme-300 dark:border-charbon-600 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer card-hover-zoom"
      data-testid={`vehicle-card-${vehicle.id}`}
      data-fingerprint={fingerprint}
    >
      {/* Image — 65% of card height */}
      <div className="relative w-[110px] sm:w-full h-auto sm:aspect-[16/9] min-h-[80px] bg-creme-200 dark:bg-dark-elevated overflow-hidden flex-shrink-0">
        {image_url ? (
          <img
            src={image_url}
            alt={`${year} ${make} ${model}`}
            className="card-image w-full h-full object-cover transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full skeleton">
            <svg className="w-8 h-8 text-creme-400 dark:text-charbon-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.079-.504 1.005-1.12l-1.035-8.276A2.25 2.25 0 0018.118 7.5H5.882a2.25 2.25 0 00-2.237 2.004L2.61 17.631A1.005 1.005 0 003.62 18.75" />
            </svg>
          </div>
        )}

        {/* Gradient overlay at bottom of image */}
        <div className="hidden sm:block absolute inset-0 bg-gradient-to-t from-charbon-900/60 via-transparent to-transparent" />

        {/* Condition badge — top-left, elegant */}
        <span className={`absolute top-2 left-2 text-[8px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full ${
          isNew
            ? 'bg-ambre-400 text-charbon-900'
            : 'bg-white/20 backdrop-blur-sm text-white border border-white/30'
        }`}>
          {conditionLabel}
        </span>

        {/* Model name overlay on image (desktop) */}
        <div className="hidden sm:block absolute bottom-2 left-3">
          <h3 className="text-white font-display text-sm font-bold leading-tight drop-shadow-lg">
            {year} {make} {model}
          </h3>
        </div>
      </div>

      {/* Body + Footer */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Body */}
        <div className="px-3 pt-2.5 pb-1.5 flex-1 flex flex-col">
          {/* Mobile-only title (hidden on desktop where it's on the image) */}
          <div className="sm:hidden mb-1">
            <p className="text-[9px] text-acier-400 uppercase tracking-[0.1em]">{make}</p>
            <h3 className="text-[13px] font-bold text-charbon-900 dark:text-creme-200 leading-tight">
              {model}
              {trim && <span className="font-normal text-[11px] text-acier-400 ml-1">{trim}</span>}
            </h3>
          </div>

          {/* Trim on desktop (model already on image) */}
          {trim && (
            <span className="hidden sm:inline text-[10px] text-acier-400 dark:text-acier-500 mb-1">{trim}</span>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-lg font-bold text-ambre-400 tabular-nums" style={{ letterSpacing: '-0.02em' }}>
              {fmt(sale_price)}
            </span>
            {msrp && msrp !== sale_price && (
              <span className="text-[11px] text-acier-300 line-through">{fmt(msrp)}</span>
            )}
            {savings != null && savings > 0 && (
              <span className="text-[9px] font-bold text-bordeaux-400 dark:text-bordeaux-200">
                -{fmt(savings)}
              </span>
            )}
          </div>

          {/* Lease */}
          {lease_offers && lease_offers.length > 0 && (
            <div className="mb-1.5"><LeaseOfferBadge offers={lease_offers} /></div>
          )}

          {/* Meta tags */}
          <div className="flex flex-wrap gap-1 mb-1.5">
            {mileage_km != null && mileage_km > 0 && (
              <span className="text-[9px] bg-creme-200 dark:bg-dark-elevated text-acier-500 dark:text-acier-400 px-1.5 py-0.5 rounded">
                {mileage_km.toLocaleString('fr-CA')} km
              </span>
            )}
            {drivetrain && (
              <span className="text-[9px] bg-creme-200 dark:bg-dark-elevated text-acier-500 dark:text-acier-400 px-1.5 py-0.5 rounded">
                {drivetrain}
              </span>
            )}
            {transmission && (
              <span className="text-[9px] bg-creme-200 dark:bg-dark-elevated text-acier-500 dark:text-acier-400 px-1.5 py-0.5 rounded">
                {transmission === 'Automatique' ? 'Auto' : transmission}
              </span>
            )}
          </div>
        </div>

        {/* Footer strip */}
        <div className="border-t border-creme-300 dark:border-charbon-600 px-3 py-1.5 flex items-center justify-between mt-auto">
          {dealer && (
            <span className="text-[9px] text-acier-400 dark:text-acier-500 truncate mr-2">
              {dealer.name} — {dealer.city}
            </span>
          )}
          {listing_url ? (
            <a
              href={listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-ambre-400 hover:text-ambre-300 transition-colors flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              Voir →
            </a>
          ) : (
            <span className="text-[10px] text-acier-300">—</span>
          )}
        </div>
      </div>
    </div>
  )
}
