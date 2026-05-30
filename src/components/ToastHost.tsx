import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useToastStore } from '../stores/toastStore'
import { Button } from './Button'

export function ToastHost() {
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[60] grid gap-3 md:left-auto md:right-6 md:w-96">
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? XCircle : Info
        const color =
          toast.tone === 'success'
            ? 'text-success'
            : toast.tone === 'error'
              ? 'text-danger'
              : 'text-primary'

        return (
          <div
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-card"
            key={toast.id}
          >
            <Icon className={color} size={20} />
            <p className="flex-1 text-sm font-medium text-ink">{toast.title}</p>
            <Button
              aria-label="Dismiss toast"
              className="h-8 w-8 min-h-8 rounded-full px-0"
              icon={<X size={16} />}
              onClick={() => dismissToast(toast.id)}
              variant="ghost"
            />
          </div>
        )
      })}
    </div>
  )
}
