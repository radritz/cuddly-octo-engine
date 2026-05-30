import type { ReactNode } from 'react'

export function PageHeader({
  title,
  eyebrow,
  action,
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
}) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-medium text-ink md:text-4xl">{title}</h1>
        {eyebrow ? <p className="mt-1 text-sm text-ink-muted">{eyebrow}</p> : null}
      </div>
      {action}
    </header>
  )
}
