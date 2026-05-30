import { clsx } from 'clsx'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Field({
  label,
  children,
  error,
}: {
  label: string
  children: ReactNode
  error?: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-gray-700">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'min-h-12 rounded-lg border border-gray-200 bg-white px-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-indigo-100',
        className,
      )}
      {...props}
    />
  )
}

export function SelectInput({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        'min-h-12 rounded-lg border border-gray-200 bg-white px-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-indigo-100',
        className,
      )}
      {...props}
    />
  )
}
