import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: ReactNode
}

export function Button({
  className,
  variant = 'primary',
  icon,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-white shadow-sm hover:bg-primary-strong',
    secondary:
      'border border-primary text-primary bg-white hover:bg-indigo-50',
    ghost: 'text-primary hover:bg-indigo-50',
    danger: 'bg-danger text-white hover:bg-red-700',
  }

  return (
    <button
      className={clsx(
        'tap-highlight-none inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      type="button"
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}
