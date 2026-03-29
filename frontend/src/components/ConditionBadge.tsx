/**
 * AMÉLIORATION #3: Condition badge with French labels and colors
 */

interface Props {
  condition: string
}

const CONDITION_STYLES: Record<string, { label: string; className: string }> = {
  new: {
    label: 'Neuf',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-600/20',
  },
  used: {
    label: 'Occasion',
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 ring-zinc-500/20',
  },
  certified: {
    label: 'Certifié',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-sky-600/20',
  },
}

export function ConditionBadge({ condition }: Props) {
  const style = CONDITION_STYLES[condition.toLowerCase()] ?? CONDITION_STYLES.used
  
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}
      data-testid={`condition-badge-${condition}`}
    >
      {style.label}
    </span>
  )
}
