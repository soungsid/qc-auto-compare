/**
 * Condition badge — editorial pill style (charbon/crème palette)
 */

interface Props {
  condition: string
}

const CONDITION_STYLES: Record<string, { label: string; className: string }> = {
  new: {
    label: 'Neuf',
    className: 'bg-charbon-900 text-creme dark:bg-creme-200 dark:text-charbon-900',
  },
  used: {
    label: 'Occasion',
    className: 'bg-transparent text-charbon-500 border border-creme-400 dark:text-creme-400 dark:border-charbon-600',
  },
  certified: {
    label: 'Certifié',
    className: 'bg-ambre-50 text-ambre-600 border border-ambre-200 dark:bg-ambre-700/20 dark:text-ambre-300 dark:border-ambre-700',
  },
}

export function ConditionBadge({ condition }: Props) {
  const style = CONDITION_STYLES[condition.toLowerCase()] ?? CONDITION_STYLES.used
  
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold tracking-wide font-display ${style.className}`}
      data-testid={`condition-badge-${condition}`}
    >
      {style.label}
    </span>
  )
}
