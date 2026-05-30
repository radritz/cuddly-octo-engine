import { clsx } from 'clsx'
import { initials } from '../lib/format'
import type { Member } from '../lib/types'

type AvatarProps = {
  member?: Pick<Member, 'name' | 'email' | 'avatar_color' | 'is_active'> | null
  label?: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ member, label, color, size = 'md', className }: AvatarProps) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
  }
  const fallback = label ?? member?.name ?? member?.email ?? 'Member'

  return (
    <div
      aria-label={fallback}
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white',
        sizes[size],
        !member?.is_active && 'opacity-60',
        className,
      )}
      style={{ backgroundColor: color ?? member?.avatar_color ?? '#6366f1' }}
      title={fallback}
    >
      {initials(fallback)}
    </div>
  )
}

export function AvatarStack({ memberIds, members }: { memberIds: string[]; members: Member[] }) {
  return (
    <div className="flex items-center">
      {memberIds.slice(0, 4).map((memberId) => {
        const member = members.find((current) => current.id === memberId)
        return (
          <Avatar
            className="-ml-2 first:ml-0 ring-2 ring-white"
            key={memberId}
            member={member}
            size="sm"
          />
        )
      })}
      {memberIds.length > 4 ? (
        <div className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 ring-2 ring-white">
          +{memberIds.length - 4}
        </div>
      ) : null}
    </div>
  )
}
