import { create } from 'zustand'
import type { Toast } from '../lib/types'

type ToastState = {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (toast) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    window.setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((current) => current.id !== id),
      }))
    }, 4500)
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}))
