import { Minus, Plus, ShoppingCart } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { AvatarStack } from '../components/Avatar'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Field, SelectInput, TextInput } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { SlidePanel } from '../components/SlidePanel'
import { SplitSelector } from '../components/SplitSelector'
import { categories, itemCategories } from '../constants/categories'
import { clampNumber, currency } from '../lib/format'
import type { Category, Item, SplitMode } from '../lib/types'
import { validateCustomSplit } from '../lib/validators'
import { useAuthStore } from '../stores/authStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useToastStore } from '../stores/toastStore'

type ItemFormState = {
  name: string
  category: Category
  unit: string
  currentQty: string
  minThreshold: string
  photoUrl: string
  splitMemberIds: string[]
  splitMode: SplitMode
  splitCustom: Record<string, number>
}

const defaultItemForm: ItemFormState = {
  name: '',
  category: 'kitchen',
  unit: 'pcs',
  currentQty: '1',
  minThreshold: '1',
  photoUrl: '',
  splitMemberIds: [],
  splitMode: 'equal',
  splitCustom: {},
}

export function InventoryPage() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [buyingItem, setBuyingItem] = useState<Item | null>(null)
  const items = useInventoryStore((state) => state.items)
  const adjustQty = useInventoryStore((state) => state.adjustQty)
  const members = useAuthStore((state) => state.members)
  const shoppingList = items.filter((item) => item.needs_restock)
  const visibleItems = useMemo(
    () =>
      activeCategory === 'all'
        ? items
        : items.filter((item) => item.category === activeCategory),
    [activeCategory, items],
  )

  return (
    <>
      <PageHeader
        action={
          <Button
            icon={<Plus size={18} />}
            onClick={() => {
              setEditingItem(null)
              setPanelOpen(true)
            }}
          >
            Add item
          </Button>
        }
        title="Inventory"
      />

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            className={[
              'min-h-11 shrink-0 rounded-full border px-5 text-base font-medium',
              activeCategory === category.value
                ? 'border-primary bg-primary text-white'
                : 'border-outline bg-white text-ink',
            ].join(' ')}
            key={category.value}
            onClick={() => setActiveCategory(category.value)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <InventoryCard
            item={item}
            key={item.id}
            members={members}
            onAdjust={(delta) => void adjustQty(item, delta)}
            onBuy={() => setBuyingItem(item)}
            onEdit={() => {
              setEditingItem(item)
              setPanelOpen(true)
            }}
          />
        ))}
      </section>

      {visibleItems.length === 0 ? (
        <EmptyState
          body="Add household essentials and choose who splits each restock."
          icon={<ShoppingCart size={22} />}
          title="No inventory items"
        />
      ) : null}

      {shoppingList.length > 0 ? (
        <Card className="bg-primary p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShoppingCart size={28} />
              <div>
                <p className="text-xl font-medium">Shopping list</p>
                <p className="text-sm text-white/80">
                  {shoppingList.length} items grouped by category
                </p>
              </div>
            </div>
            <Button
              className="bg-white text-primary hover:bg-indigo-50"
              onClick={() => setActiveCategory('all')}
            >
              Review
            </Button>
          </div>
        </Card>
      ) : null}

      <ItemPanel
        editingItem={editingItem}
        key={editingItem?.id ?? 'new'}
        onClose={() => setPanelOpen(false)}
        open={panelOpen}
      />
      <MarkBoughtPanel item={buyingItem} onClose={() => setBuyingItem(null)} />
    </>
  )
}

function InventoryCard({
  item,
  members,
  onAdjust,
  onBuy,
  onEdit,
}: {
  item: Item
  members: ReturnType<typeof useAuthStore.getState>['members']
  onAdjust: (delta: number) => void
  onBuy: () => void
  onEdit: () => void
}) {
  const progress =
    item.min_threshold <= 0
      ? 100
      : clampNumber((item.current_qty / item.min_threshold) * 100, 0, 100)
  const barColor = item.needs_restock ? 'bg-danger' : 'bg-success'

  return (
    <Card className="grid min-h-60 gap-5 p-4">
      <div className="flex items-start justify-between gap-4">
        <button className="min-w-0 text-left" onClick={onEdit} type="button">
          <h2 className="truncate text-2xl font-medium text-ink">{item.name}</h2>
          <p className="mt-1 text-sm capitalize text-ink-muted">
            {item.category} - {item.unit}
          </p>
        </button>
        {item.needs_restock ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-danger">
            Restock
          </span>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xl font-medium text-ink">
            {item.current_qty} {item.unit}
          </p>
          <AvatarStack memberIds={item.split_member_ids} members={members} />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
          <div className={`${barColor} h-full rounded-full`} style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Minimum threshold: {item.min_threshold} {item.unit}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            aria-label={`Decrease ${item.name}`}
            className="h-11 w-11 px-0"
            icon={<Minus size={18} />}
            onClick={() => onAdjust(-1)}
            variant="secondary"
          />
          <Button
            aria-label={`Increase ${item.name}`}
            className="h-11 w-11 px-0"
            icon={<Plus size={18} />}
            onClick={() => onAdjust(1)}
            variant="secondary"
          />
        </div>
        <Button onClick={onBuy} variant={item.needs_restock ? 'primary' : 'secondary'}>
          Mark bought
        </Button>
      </div>
    </Card>
  )
}

function ItemPanel({
  open,
  editingItem,
  onClose,
}: {
  open: boolean
  editingItem: Item | null
  onClose: () => void
}) {
  const household = useAuthStore((state) => state.household)
  const member = useAuthStore((state) => state.member)
  const members = useAuthStore((state) => state.members)
  const addItem = useInventoryStore((state) => state.addItem)
  const updateItem = useInventoryStore((state) => state.updateItem)
  const showToast = useToastStore((state) => state.showToast)
  const [form, setForm] = useState<ItemFormState>(() =>
    editingItem ? formFromItem(editingItem) : defaultItemForm,
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!household || !member) {
      return
    }

    if (form.splitMode === 'custom' && !validateCustomSplit(form.splitCustom)) {
      showToast({ title: 'Custom split must add up to 100%.', tone: 'error' })
      return
    }

    try {
      const payload = {
        householdId: household.id,
        createdBy: member.id,
        name: form.name,
        category: form.category,
        unit: form.unit,
        currentQty: Number(form.currentQty),
        minThreshold: Number(form.minThreshold),
        splitMemberIds: form.splitMemberIds,
        splitMode: form.splitMode,
        splitCustom: form.splitMode === 'custom' ? form.splitCustom : null,
        photoUrl: form.photoUrl || null,
      }

      if (editingItem) {
        await updateItem(editingItem.id, payload)
        showToast({ title: 'Item updated.', tone: 'success' })
      } else {
        await addItem(payload)
        showToast({ title: 'Item added.', tone: 'success' })
      }

      onClose()
    } catch (error) {
      showToast({
        title: error instanceof Error ? error.message : 'Could not save item.',
        tone: 'error',
      })
    }
  }

  return (
    <SlidePanel
      onClose={onClose}
      open={open}
      title={editingItem ? 'Edit item' : 'Add item'}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Name">
          <TextInput
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
            value={form.name}
          />
        </Field>
        <Field label="Category">
          <SelectInput
            onChange={(event) =>
              setForm({ ...form, category: event.target.value as Category })
            }
            value={form.category}
          >
            {itemCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <TextInput
              min={0}
              onChange={(event) => setForm({ ...form, currentQty: event.target.value })}
              required
              type="number"
              value={form.currentQty}
            />
          </Field>
          <Field label="Minimum">
            <TextInput
              min={0}
              onChange={(event) => setForm({ ...form, minThreshold: event.target.value })}
              required
              type="number"
              value={form.minThreshold}
            />
          </Field>
        </div>
        <Field label="Unit">
          <TextInput
            onChange={(event) => setForm({ ...form, unit: event.target.value })}
            required
            value={form.unit}
          />
        </Field>
        <Field label="Photo URL optional">
          <TextInput
            onChange={(event) => setForm({ ...form, photoUrl: event.target.value })}
            type="url"
            value={form.photoUrl}
          />
        </Field>
        <Field label="Split between">
          <SplitSelector
            customMap={form.splitCustom}
            members={members}
            mode={form.splitMode}
            onCustomMapChange={(splitCustom) => setForm({ ...form, splitCustom })}
            onModeChange={(splitMode) => setForm({ ...form, splitMode })}
            onSelectedIdsChange={(splitMemberIds) =>
              setForm({ ...form, splitMemberIds })
            }
            selectedIds={form.splitMemberIds}
          />
        </Field>
        <Button type="submit">{editingItem ? 'Save item' : 'Add item'}</Button>
      </form>
    </SlidePanel>
  )
}

function MarkBoughtPanel({
  item,
  onClose,
}: {
  item: Item | null
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [restockedQty, setRestockedQty] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const members = useAuthStore((state) => state.members)
  const currentMember = useAuthStore((state) => state.member)
  const markBought = useInventoryStore((state) => state.markBought)
  const showToast = useToastStore((state) => state.showToast)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!item) {
      return
    }

    try {
      await markBought({
        item,
        amount: Number(amount),
        paidBy: paidBy || currentMember?.id || '',
        restockedQty: Number(restockedQty),
      })
      showToast({ title: 'Restock logged.', tone: 'success' })
      onClose()
    } catch (error) {
      showToast({
        title: error instanceof Error ? error.message : 'Could not mark as bought.',
        tone: 'error',
      })
    }
  }

  return (
    <SlidePanel onClose={onClose} open={Boolean(item)} title="Mark as bought">
      <form className="grid gap-4" onSubmit={submit}>
        <p className="text-sm text-ink-muted">
          This creates an immutable expense linked to {item?.name}.
        </p>
        <Field label="Amount paid">
          <TextInput
            min={0.01}
            onChange={(event) => setAmount(event.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </Field>
        <Field label="Paid by">
          <SelectInput
            onChange={(event) => setPaidBy(event.target.value)}
            value={paidBy || currentMember?.id || ''}
          >
            {members
              .filter((member) => member.is_active)
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </SelectInput>
        </Field>
        <Field label="Restocked quantity">
          <TextInput
            min={0}
            onChange={(event) => setRestockedQty(event.target.value)}
            required
            type="number"
            value={restockedQty}
          />
        </Field>
        <Button type="submit">Confirm restock for {amount ? currency(Number(amount)) : ''}</Button>
      </form>
    </SlidePanel>
  )
}

function formFromItem(item: Item): ItemFormState {
  return {
    name: item.name,
    category: item.category,
    unit: item.unit,
    currentQty: String(item.current_qty),
    minThreshold: String(item.min_threshold),
    photoUrl: item.photo_url ?? '',
    splitMemberIds: item.split_member_ids,
    splitMode: item.split_mode,
    splitCustom: item.split_custom ?? {},
  }
}
