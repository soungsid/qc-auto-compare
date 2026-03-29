import type { LeaseOffer } from '../types'

interface Props {
  offers: LeaseOffer[]
}

/**
 * Displays the best monthly lease offer as a compact badge.
 * "Best" = lowest monthly payment among all offers for this vehicle.
 */
export function LeaseOfferBadge({ offers }: Props) {
  if (!offers || offers.length === 0) return <span className="text-brand-300 dark:text-brand-500 text-xs">—</span>

  // Find the best monthly offer
  const monthly = offers.filter(
    (o) => o.payment_frequency === 'monthly' && o.payment_amount != null,
  )
  if (monthly.length === 0) return <span className="text-brand-300 dark:text-brand-500 text-xs">—</span>

  const best = monthly.reduce((prev, curr) =>
    (curr.payment_amount ?? Infinity) < (prev.payment_amount ?? Infinity) ? curr : prev,
  )

  const amount = best.payment_amount?.toLocaleString('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-900/40 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-600/20 dark:ring-brand-500/30"
      title={`${best.term_months} mois${best.annual_km ? ` · ${best.annual_km.toLocaleString()} km/an` : ''}${best.interest_rate_pct != null ? ` · ${best.interest_rate_pct}%` : ''}`}
    >
      {amount}
      <span className="font-normal text-brand-500 dark:text-brand-400">/mois</span>
      {best.term_months && (
        <span className="font-normal text-brand-400 dark:text-brand-500">{best.term_months}m</span>
      )}
    </span>
  )
}
