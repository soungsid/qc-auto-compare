/**
 * Condition badge — dark pill style per redesign spec
 */

interface Props {
  condition: string
}

const CONDITION_STYLES: Record<string, { label: string; className: string }> = {
  new: {
    label: 'Neuf',
    className: 'bg-emerald-700 text-white dark:bg-emerald-600',
  },
  used: {
    label: 'Occasion',
    className: 'bg-brand-700 text-white dark:bg-brand-600',
  },
  certified: {
    label: 'Certifié',
    className: 'bg-sky-700 text-white dark:bg-sky-600',
  },
}

export function ConditionBadge({ condition }: Props) {
  const style = CONDITION_STYLES[condition.toLowerCase()] ?? CONDITION_STYLES.used
  
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wide ${style.className}`}
      data-testid={`condition-badge-${condition}`}
    >
      {style.label}
    </span>
  )
}
