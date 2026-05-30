import { LogIn, Mail } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field, TextInput } from '../components/Form'
import { useAuthBootstrap } from '../hooks/useAuthBootstrap'
import { isSupabaseConfigured } from '../lib/supabase'
import { normalizeEmail } from '../lib/validators'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

export function LoginPage() {
  useAuthBootstrap()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const session = useAuthStore((state) => state.session)
  const household = useAuthStore((state) => state.household)
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle)
  const signInWithPassword = useAuthStore((state) => state.signInWithPassword)
  const signUpWithPassword = useAuthStore((state) => state.signUpWithPassword)
  const showToast = useToastStore((state) => state.showToast)

  if (session && household) {
    return <Navigate to="/dashboard" replace />
  }

  if (session) {
    return <Navigate to="/join" replace />
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      if (mode === 'signin') {
        await signInWithPassword(normalizeEmail(email), password)
      } else {
        await signUpWithPassword(normalizeEmail(email), password)
        showToast({
          title: 'Check your email to confirm the account.',
          tone: 'info',
        })
      }
    } catch (error) {
      showToast({
        title: error instanceof Error ? error.message : 'Authentication failed.',
        tone: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-surface p-6">
      <Card className="w-full max-w-md p-6">
        <div className="mb-8">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary text-white">
            <LogIn size={24} />
          </div>
          <h1 className="text-3xl font-medium text-primary">HomeOS</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in with an allowlisted roommate account.
          </p>
        </div>

        {!isSupabaseConfigured ? (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            Add Supabase environment variables before using auth.
          </div>
        ) : null}

        <Button
          className="mt-4 w-full"
          disabled={!isSupabaseConfigured || isSubmitting}
          icon={<Mail size={18} />}
          onClick={async () => {
            setIsSubmitting(true)
            try {
              await signInWithGoogle()
            } catch (error) {
              showToast({
                title:
                  error instanceof Error
                    ? error.message
                    : 'Google sign-in failed.',
                tone: 'error',
              })
              setIsSubmitting(false)
            }
          }}
        >
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          Optional password auth
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <form className="grid gap-4" onSubmit={handlePasswordSubmit}>
          <Field label="Email">
            <TextInput
              autoComplete="email"
              disabled={!isSupabaseConfigured || isSubmitting}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Field>
          <Field label="Password">
            <TextInput
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              disabled={!isSupabaseConfigured || isSubmitting}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>
          <Button disabled={!isSupabaseConfigured || isSubmitting} type="submit">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <button
          className="mt-4 text-sm font-medium text-primary"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          type="button"
        >
          {mode === 'signin'
            ? 'Need password signup?'
            : 'Already have password auth?'}
        </button>
      </Card>
    </main>
  )
}
