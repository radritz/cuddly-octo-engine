import { Avatar } from './Avatar'
import { TextInput } from './Form'
import type { Member, SplitMode } from '../lib/types'

type SplitSelectorProps = {
  members: Member[]
  selectedIds: string[]
  mode: SplitMode
  customMap: Record<string, number>
  onSelectedIdsChange: (ids: string[]) => void
  onModeChange: (mode: SplitMode) => void
  onCustomMapChange: (customMap: Record<string, number>) => void
}

export function SplitSelector({
  members,
  selectedIds,
  mode,
  customMap,
  onSelectedIdsChange,
  onModeChange,
  onCustomMapChange,
}: SplitSelectorProps) {
  function toggleMember(memberId: string) {
    const nextIds = selectedIds.includes(memberId)
      ? selectedIds.filter((id) => id !== memberId)
      : [...selectedIds, memberId]

    onSelectedIdsChange(nextIds)
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 rounded-xl bg-surface-muted p-1">
        {(['equal', 'custom'] as const).map((option) => (
          <button
            className={[
              'rounded-lg py-2 text-sm font-medium',
              mode === option ? 'bg-white text-primary shadow-sm' : 'text-ink-muted',
            ].join(' ')}
            key={option}
            onClick={() => onModeChange(option)}
            type="button"
          >
            {option === 'equal' ? 'Equally' : 'Custom %'}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {members
          .filter((member) => member.is_active)
          .map((member) => {
            const checked = selectedIds.includes(member.id)
            return (
              <div
                className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                key={member.id}
              >
                <button
                  className="flex flex-1 items-center gap-3 text-left"
                  onClick={() => toggleMember(member.id)}
                  type="button"
                >
                  <Avatar member={member} size="sm" />
                  <span className="font-medium text-ink">{member.name}</span>
                </button>
                {mode === 'custom' && checked ? (
                  <TextInput
                    className="w-24"
                    min={0}
                    onChange={(event) =>
                      onCustomMapChange({
                        ...customMap,
                        [member.id]: Number(event.target.value),
                      })
                    }
                    type="number"
                    value={customMap[member.id] ?? 0}
                  />
                ) : null}
                <input
                  checked={checked}
                  className="h-5 w-5 accent-primary"
                  onChange={() => toggleMember(member.id)}
                  type="checkbox"
                />
              </div>
            )
          })}
      </div>
    </div>
  )
}
