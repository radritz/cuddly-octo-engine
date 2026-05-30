import { Dumbbell, Plus } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { AvatarStack } from '../components/Avatar'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Field, TextInput } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { SlidePanel } from '../components/SlidePanel'
import { SplitSelector } from '../components/SplitSelector'
import { clampNumber } from '../lib/format'
import type { SplitMode } from '../lib/types'
import { validateCustomSplit } from '../lib/validators'
import { useAuthStore } from '../stores/authStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useToastStore } from '../stores/toastStore'

export function GymPage() {
  const [panelOpen, setPanelOpen] = useState(false)
  const items = useInventoryStore((state) =>
    state.items.filter((item) => item.category === 'gym'),
  )
  const adjustQty = useInventoryStore((state) => state.adjustQty)
  const members = useAuthStore((state) => state.members)

  return (
    <>
      <PageHeader
        action={
          <Button icon={<Plus size={18} />} onClick={() => setPanelOpen(true)}>
            Add gym item
          </Button>
        }
        eyebrow="Supplements, proteins, and shared gym pantry stock."
        title="Gym Pantry"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const servingSize = item.serving_size ?? 1
          const dailyServings = item.daily_servings ?? 1
          const servingsRemaining = Math.floor(item.current_qty / servingSize)
          const daysRemaining = Math.floor(servingsRemaining / dailyServings)
          const progress = clampNumber(
            (item.current_qty / Math.max(item.min_threshold, 1)) * 100,
            0,
            100,
          )

          return (
            <Card className="grid gap-5 p-4" key={item.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-medium text-ink">{item.name}</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {item.serving_size ?? '-'} {item.serving_unit ?? item.unit} serving
                  </p>
                </div>
                {item.needs_restock ? (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-danger">
                    Restock
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-muted p-3">
                  <p className="text-xs text-ink-muted">Servings</p>
                  <p className="mt-1 text-xl font-medium text-ink">
                    {servingsRemaining}
                  </p>
                </div>
                <div className="rounded-lg bg-surface-muted p-3">
                  <p className="text-xs text-ink-muted">Days left</p>
                  <p className="mt-1 text-xl font-medium text-ink">{daysRemaining}</p>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-ink">
                    {item.current_qty} {item.unit}
                  </p>
                  <AvatarStack memberIds={item.split_member_ids} members={members} />
                </div>
                <div className="h-2 rounded-full bg-indigo-100">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => void adjustQty(item, -1)} variant="secondary">
                  -1
                </Button>
                <Button onClick={() => void adjustQty(item, 1)} variant="secondary">
                  +1
                </Button>
              </div>
            </Card>
          )
        })}
      </section>

      {items.length === 0 ? (
        <EmptyState
          body="Add protein, creatine, or other shared gym supplies."
          icon={<Dumbbell size={22} />}
          title="No gym pantry items"
        />
      ) : null}

      <GymItemPanel onClose={() => setPanelOpen(false)} open={panelOpen} />
    </>
  )
}

function GymItemPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const household = useAuthStore((state) => state.household)
  const member = useAuthStore((state) => state.member)
  const members = useAuthStore((state) => state.members)
  const addItem = useInventoryStore((state) => state.addItem)
  const showToast = useToastStore((state) => state.showToast)
  const [name, setName] = useState('')
  const [currentQty, setCurrentQty] = useState('1000')
  const [unit, setUnit] = useState('g')
  const [minThreshold, setMinThreshold] = useState('300')
  const [servingSize, setServingSize] = useState('30')
  const [servingUnit, setServingUnit] = useState('g')
  const [dailyServings, setDailyServings] = useState('1')
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([])
  const [splitCustom, setSplitCustom] = useState<Record<string, number>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!household || !member) {
      return
    }

    if (splitMode === 'custom' && !validateCustomSplit(splitCustom)) {
      showToast({ title: 'Custom split must add up to 100%.', tone: 'error' })
      return
    }

    try {
      await addItem({
        householdId: household.id,
        createdBy: member.id,
        name,
        category: 'gym',
        unit,
        currentQty: Number(currentQty),
        minThreshold: Number(minThreshold),
        splitMemberIds,
        splitMode,
        splitCustom: splitMode === 'custom' ? splitCustom : null,
        servingSize: Number(servingSize),
        servingUnit,
        totalWeight: Number(currentQty),
        dailyServings: Number(dailyServings),
      })
      showToast({ title: 'Gym item added.', tone: 'success' })
      onClose()
    } catch (error) {
      showToast({
        title: error instanceof Error ? error.message : 'Could not add gym item.',
        tone: 'error',
      })
    }
  }

  return (
    <SlidePanel onClose={onClose} open={open} title="Add gym item">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Name">
          <TextInput onChange={(event) => setName(event.target.value)} required value={name} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current weight">
            <TextInput
              min={0}
              onChange={(event) => setCurrentQty(event.target.value)}
              required
              type="number"
              value={currentQty}
            />
          </Field>
          <Field label="Unit">
            <TextInput onChange={(event) => setUnit(event.target.value)} required value={unit} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Serving size">
            <TextInput
              min={0}
              onChange={(event) => setServingSize(event.target.value)}
              required
              type="number"
              value={servingSize}
            />
          </Field>
          <Field label="Serving unit">
            <TextInput
              onChange={(event) => setServingUnit(event.target.value)}
              required
              value={servingUnit}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum">
            <TextInput
              min={0}
              onChange={(event) => setMinThreshold(event.target.value)}
              required
              type="number"
              value={minThreshold}
            />
          </Field>
          <Field label="Daily servings">
            <TextInput
              min={1}
              onChange={(event) => setDailyServings(event.target.value)}
              required
              type="number"
              value={dailyServings}
            />
          </Field>
        </div>
        <Field label="Split between">
          <SplitSelector
            customMap={splitCustom}
            members={members}
            mode={splitMode}
            onCustomMapChange={setSplitCustom}
            onModeChange={setSplitMode}
            onSelectedIdsChange={setSplitMemberIds}
            selectedIds={splitMemberIds}
          />
        </Field>
        <Button type="submit">Add gym item</Button>
      </form>
    </SlidePanel>
  )
}
