import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field, TextInput } from '../components/Form'
import { useAuthBootstrap } from '../hooks/useAuthBootstrap'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

export function JoinPage() {
  useAuthBootstrap()

  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('Flat 4B')
  const [memberName, setMemberName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const initialized = useAuthStore((state) => state.initialized)
  const session = useAuthStore((state) => state.session)
  const user = useAuthStore((state) => state.user)
  const household = useAuthStore((state) => state.household)
  const createHousehold = useAuthStore((state) => state.createHousehold)
  const joinHousehold = useAuthStore((state) => state.joinHousehold)
  const signOut = useAuthStore((state) => state.signOut)
  const showToast = useToastStore((state) => state.showToast)

  const defaultName = useMemo(() => {
    const metadataName = user?.user_metadata?.name
    return typeof metadataName === 'string'
      ? metadataName
      : user?.email?.split('@')[0] ?? ''
  }, [user])

  if (!initialized) {
    return (
      <main className="grid min-h-svh place-items-center bg-surface text-primary">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-primary" />
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (household) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      if (mode === 'create') {
        await createHousehold(householdName, memberName || defaultName)
      } else {
        await joinHousehold(inviteCode.trim().toUpperCase(), memberName || defaultName)
      }

      showToast({ title: 'Household ready.', tone: 'success' })
    } catch (error) {
      showToast({
        title:
          error instanceof Error
            ? error.message
            : 'Could not complete household setup.',
        tone: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-svh place-items-center bg-surface p-6">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Private setup
          </p>
          <h1 className="mt-2 text-3xl font-medium text-ink">
            Create or join your household
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your email must be on the Supabase allowlist before this step works.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface-muted p-1">
          {(['create', 'join'] as const).map((option) => (
            <button
              className={[
                'rounded-lg py-2 text-sm font-medium',
                mode === option ? 'bg-white text-primary shadow-sm' : 'text-ink-muted',
              ].join(' ')}
              key={option}
              onClick={() => setMode(option)}
              type="button"
            >
              {option === 'create' ? 'Create' : 'Join'}
            </button>
          ))}
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="Your name">
            <TextInput
              onChange={(event) => setMemberName(event.target.value)}
              placeholder={defaultName || 'Arjun'}
              value={memberName}
            />
          </Field>
          {mode === 'create' ? (
            <Field label="Household name">
              <TextInput
                onChange={(event) => setHouseholdName(event.target.value)}
                required
                value={householdName}
              />
            </Field>
          ) : (
            <Field label="Invite code">
              <TextInput
                maxLength={6}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                required
                value={inviteCode}
              />
            </Field>
          )}
          <Button disabled={isSubmitting} type="submit">
            {mode === 'create' ? 'Create household' : 'Join household'}
          </Button>
        </form>

        <button
          className="mt-4 text-sm font-medium text-primary"
          onClick={() => void signOut()}
          type="button"
        >
          Use another account
        </button>
      </Card>
    </main>
  )
}
