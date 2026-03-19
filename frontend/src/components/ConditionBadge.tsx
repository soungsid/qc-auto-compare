/**
 * AMÉLIORATION #3: Condition badge with French labels and colors
 */

interface Props {
  condition: string
}

const CONDITION_STYLES: Record<string, { label: string; className: string }> = {
  new: {
    label: 'Neuf',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 ring-green-600/20',
  },
  used: {
    label: 'Occasion',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 ring-gray-500/20',
  },
  certified: {
    label: 'Certifié',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 ring-blue-600/20',
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
