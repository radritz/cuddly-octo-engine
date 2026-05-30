import type { ReactNode } from 'react'

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-outline bg-white p-8 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-indigo-50 text-primary">
        {icon}
      </div>
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p>
    </div>
  )
}
