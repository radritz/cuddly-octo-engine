import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button'

type SlidePanelProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}

export function SlidePanel({ open, title, children, onClose }: SlidePanelProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
      <div className="absolute inset-x-0 bottom-0 max-h-[92svh] overflow-y-auto rounded-t-[28px] bg-surface-card p-6 shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:w-[440px] md:rounded-l-2xl md:rounded-tr-none">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-outline md:hidden" />
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-medium text-ink">{title}</h2>
          <Button
            aria-label="Close"
            className="h-11 w-11 rounded-full px-0"
            icon={<X size={22} />}
            onClick={onClose}
            variant="ghost"
          />
        </div>
        {children}
      </div>
    </div>
  )
}
