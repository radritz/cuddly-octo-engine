import { clsx } from 'clsx'
import { sourceBadgeClasses } from '../constants/colors'
import type { ExpenseSource } from '../lib/types'

export function SourceBadge({ source }: { source: ExpenseSource }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
        sourceBadgeClasses[source],
      )}
    >
      {source}
    </span>
  )
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: string
  tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'primary'
}) {
  const tones = {
    neutral: 'bg-gray-100 text-gray-700',
    danger: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    primary: 'bg-indigo-100 text-primary',
  }

  return (
    <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  )
}
