import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

export function useAuthBootstrap() {
  const initialized = useAuthStore((state) => state.initialized)
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    if (!initialized) {
      void initialize()
    }
  }, [initialize, initialized])
}
