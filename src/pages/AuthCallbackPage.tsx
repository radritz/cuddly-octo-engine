import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '../stores/authStore'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    async function finishAuth() {
      await initialize()
      const state = useAuthStore.getState()
      navigate(state.household ? '/dashboard' : '/join', { replace: true })
    }

    void finishAuth()
  }, [initialize, navigate])

  return (
    <main className="grid min-h-svh place-items-center bg-surface text-primary">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-primary" />
    </main>
  )
}
