import type { FormEvent } from 'react'
import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field, TextInput } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { avatarColors } from '../constants/colors'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

export function SettingsPage() {
  const household = useAuthStore((state) => state.household)
  const member = useAuthStore((state) => state.member)
  const updateHouseholdName = useAuthStore((state) => state.updateHouseholdName)
  const regenerateInviteCode = useAuthStore((state) => state.regenerateInviteCode)
  const updateProfile = useAuthStore((state) => state.updateProfile)
  const showToast = useToastStore((state) => state.showToast)
  const [householdName, setHouseholdName] = useState(household?.name ?? '')
  const [name, setName] = useState(member?.name ?? '')
  const [avatarColor, setAvatarColor] = useState(member?.avatar_color ?? avatarColors[0])
  const [notificationState, setNotificationState] = useState(Notification.permission)

  async function saveHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await updateHouseholdName(householdName)
      showToast({ title: 'Household updated.', tone: 'success' })
    } catch (error) {
      showToast({
        title:
          error instanceof Error ? error.message : 'Could not update household.',
        tone: 'error',
      })
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      await updateProfile(name, avatarColor)
      showToast({ title: 'Profile updated.', tone: 'success' })
    } catch (error) {
      showToast({
        title: error instanceof Error ? error.message : 'Could not update profile.',
        tone: 'error',
      })
    }
  }

  async function enableNotifications() {
    const result = await Notification.requestPermission()
    setNotificationState(result)
    showToast({
      title:
        result === 'granted'
          ? 'Browser notifications enabled.'
          : 'Notifications are not enabled.',
      tone: result === 'granted' ? 'success' : 'info',
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Household, invite, profile, and browser notification settings."
        title="Settings"
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-xl font-medium text-ink">Household</h2>
          <form className="mt-4 grid gap-4" onSubmit={saveHousehold}>
            <Field label="Household name">
              <TextInput
                disabled={!member?.is_admin}
                onChange={(event) => setHouseholdName(event.target.value)}
                value={householdName}
              />
            </Field>
            <Button disabled={!member?.is_admin} type="submit">
              Save household
            </Button>
          </form>
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-sm text-ink-muted">Invite code</p>
            <p className="mt-1 text-2xl font-medium tracking-[0.3em] text-ink">
              {household?.invite_code}
            </p>
            <Button
              className="mt-3"
              disabled={!member?.is_admin}
              onClick={async () => {
                try {
                  await regenerateInviteCode()
                  showToast({ title: 'Invite code regenerated.', tone: 'success' })
                } catch (error) {
                  showToast({
                    title:
                      error instanceof Error
                        ? error.message
                        : 'Could not regenerate invite code.',
                    tone: 'error',
                  })
                }
              }}
              variant="secondary"
            >
              Regenerate code
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-medium text-ink">Profile</h2>
          <form className="mt-4 grid gap-4" onSubmit={saveProfile}>
            <div className="flex items-center gap-4">
              <Avatar
                color={avatarColor}
                label={name || member?.email || 'Member'}
                size="lg"
              />
              <Field label="Name">
                <TextInput
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              {avatarColors.map((color) => (
                <button
                  aria-label={`Choose avatar color ${color}`}
                  className={[
                    'h-10 w-10 rounded-full ring-offset-2',
                    avatarColor === color ? 'ring-2 ring-primary' : '',
                  ].join(' ')}
                  key={color}
                  onClick={() => setAvatarColor(color)}
                  style={{ backgroundColor: color }}
                  type="button"
                />
              ))}
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </Card>
      </section>

      <Card className="p-5">
        <h2 className="text-xl font-medium text-ink">Notifications</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Current browser permission: {notificationState}
        </p>
        <Button className="mt-4" onClick={() => void enableNotifications()}>
          Enable notifications
        </Button>
      </Card>
    </>
  )
}
