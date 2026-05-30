import { Copy, ShieldAlert, UserPlus } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field, TextInput } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { useBalances } from '../hooks/useBalances'
import { currency, prettyDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { AllowedEmail } from '../lib/types'
import { normalizeEmail } from '../lib/validators'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

export function MembersPage() {
  const household = useAuthStore((state) => state.household)
  const currentMember = useAuthStore((state) => state.member)
  const members = useAuthStore((state) => state.members)
  const refreshMembers = useAuthStore((state) => state.refreshMembers)
  const showToast = useToastStore((state) => state.showToast)
  const { balances } = useBalances()
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([])
  const [email, setEmail] = useState('')
  const inviteUrl = useMemo(
    () =>
      household
        ? `${window.location.origin}/join?code=${household.invite_code}`
        : '',
    [household],
  )

  useEffect(() => {
    async function fetchAllowedEmails() {
      if (!household || !currentMember?.is_admin) {
        return
      }

      const { data, error } = await supabase
        .from('allowed_emails')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })

      if (!error) {
        setAllowedEmails(data ?? [])
      }
    }

    void fetchAllowedEmails()
  }, [currentMember?.is_admin, household])

  if (!currentMember?.is_admin) {
    return (
      <Card className="p-6">
        <ShieldAlert className="mb-3 text-warning" size={28} />
        <h1 className="text-2xl font-medium text-ink">Admin only</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Household member management is restricted to admins.
        </p>
      </Card>
    )
  }

  async function addAllowedEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!household || !currentMember) {
      return
    }

    const { error } = await supabase.from('allowed_emails').insert({
      household_id: household.id,
      email: normalizeEmail(email),
      created_by: currentMember.id,
    })

    if (error) {
      showToast({ title: error.message, tone: 'error' })
      return
    }

    setEmail('')
    const { data } = await supabase
      .from('allowed_emails')
      .select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
    setAllowedEmails(data ?? [])
    showToast({ title: 'Email allowlisted.', tone: 'success' })
  }

  async function deactivate(memberId: string) {
    const { error } = await supabase.rpc('deactivate_member', {
      p_member_id: memberId,
    })

    if (error) {
      showToast({ title: error.message, tone: 'error' })
      return
    }

    await refreshMembers()
    showToast({ title: 'Member deactivated.', tone: 'success' })
  }

  return (
    <>
      <PageHeader
        eyebrow="Manage active roommates and secure invites."
        title="Members"
      />

      <section className="grid gap-4 md:grid-cols-2">
        {members.map((member) => {
          const balance =
            balances.find((candidate) => candidate.memberId === member.id)?.amount ?? 0
          return (
            <Card className="flex items-center gap-4 p-4" key={member.id}>
              <Avatar member={member} />
              <div className="flex-1">
                <p className="font-medium text-ink">{member.name}</p>
                <p className="text-sm text-ink-muted">
                  Joined {prettyDate(member.joined_at)}
                </p>
                <p
                  className={[
                    'mt-1 text-sm',
                    balance >= 0 ? 'text-success' : 'text-danger',
                  ].join(' ')}
                >
                  {balance === 0
                    ? 'Settled up'
                    : balance > 0
                      ? `${currency(balance)} owed to them`
                      : `owes ${currency(Math.abs(balance))}`}
                </p>
                {!member.is_active ? (
                  <p className="mt-1 text-xs text-warning">
                    Member left - settle manually.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2 text-right">
                {member.is_admin ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-primary">
                    admin
                  </span>
                ) : null}
                {member.is_active && member.id !== currentMember.id ? (
                  <Button onClick={() => void deactivate(member.id)} variant="secondary">
                    Deactivate
                  </Button>
                ) : null}
              </div>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5">
          <h2 className="text-xl font-medium text-ink">Invite</h2>
          <div className="mt-4 grid place-items-center rounded-xl bg-surface-muted p-5">
            {inviteUrl ? <QRCodeSVG size={180} value={inviteUrl} /> : null}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-gray-200 p-3">
            <code className="flex-1 text-lg font-medium tracking-[0.3em] text-ink">
              {household?.invite_code}
            </code>
            <Button
              aria-label="Copy invite code"
              className="h-10 w-10 min-h-10 px-0"
              icon={<Copy size={18} />}
              onClick={async () => {
                await navigator.clipboard.writeText(household?.invite_code ?? '')
                showToast({ title: 'Invite code copied.', tone: 'success' })
              }}
              variant="ghost"
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-medium text-ink">Allowed emails</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Add a roommate email before they sign in with Google.
          </p>
          <form className="mt-4 flex gap-2" onSubmit={addAllowedEmail}>
            <Field label="Email">
              <TextInput
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </Field>
            <Button className="self-end" icon={<UserPlus size={18} />} type="submit">
              Add
            </Button>
          </form>
          <div className="mt-4 grid gap-2">
            {allowedEmails.map((allowedEmail) => (
              <div
                className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-sm"
                key={allowedEmail.id}
              >
                <span>{allowedEmail.email}</span>
                <span className="text-ink-muted">
                  {allowedEmail.accepted_at ? 'joined' : 'pending'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  )
}
