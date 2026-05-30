import { ArrowDown, ArrowUp, CalendarClock, Plus } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Avatar, AvatarStack } from '../components/Avatar'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field, SelectInput, TextInput } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { SlidePanel } from '../components/SlidePanel'
import { SplitSelector } from '../components/SplitSelector'
import { billCadences, billTypes } from '../constants/bills'
import { billToneClasses } from '../constants/colors'
import { dueDateForDay, getCurrentPayerId } from '../lib/dates'
import { currency, memberName, prettyDate } from '../lib/format'
import type { Bill, BillCadence, BillType, SplitMode } from '../lib/types'
import { validateCustomSplit } from '../lib/validators'
import { useAuthStore } from '../stores/authStore'
import { useBillStore } from '../stores/billStore'
import { useToastStore } from '../stores/toastStore'

export function BillsPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [payingBill, setPayingBill] = useState<Bill | null>(null)
  const bills = useBillStore((state) => state.bills)
  const members = useAuthStore((state) => state.members)
  const activeBills = bills.filter((bill) => bill.is_active)
  const recurring = activeBills.filter((bill) => bill.cadence !== 'one-time')
  const oneTime = activeBills.filter((bill) => bill.cadence === 'one-time')
  const totalDue = activeBills.reduce((sum, bill) => sum + bill.amount, 0)
  const dueSoon = activeBills.filter((bill) => isDueWithinThreeDays(bill.next_due_date))

  return (
    <>
      <PageHeader
        action={
          <Button icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>
            Add bill
          </Button>
        }
        eyebrow={`Total due ${currency(totalDue)}`}
        title="Bills & Rent"
      />

      {dueSoon.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="font-medium">Due in 3 days</p>
          <p className="mt-1 text-sm">
            {dueSoon.map((bill) => bill.title).join(', ')} need attention.
          </p>
        </Card>
      ) : null}

      <BillSection
        bills={recurring}
        members={members}
        onMarkPaid={setPayingBill}
        title="Recurring bills"
      />
      <BillSection
        bills={oneTime}
        members={members}
        onMarkPaid={setPayingBill}
        title="One-time & maintenance"
      />

      <AddBillPanel onClose={() => setAddOpen(false)} open={addOpen} />
      <MarkBillPaidPanel bill={payingBill} onClose={() => setPayingBill(null)} />
    </>
  )
}

function BillSection({
  title,
  bills,
  members,
  onMarkPaid,
}: {
  title: string
  bills: Bill[]
  members: ReturnType<typeof useAuthStore.getState>['members']
  onMarkPaid: (bill: Bill) => void
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {bills.map((bill) => {
          const type = billTypes.find((candidate) => candidate.value === bill.bill_type)
          const Icon = type?.icon ?? CalendarClock
          const payerId = getCurrentPayerId(bill)
          const payer = members.find((member) => member.id === payerId)

          return (
            <Card className="p-5" key={bill.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div
                    className={[
                      'grid h-12 w-12 place-items-center rounded-full',
                      billToneClasses[bill.bill_type],
                    ].join(' ')}
                  >
                    <Icon size={23} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-medium text-ink">{bill.title}</h3>
                    <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium uppercase text-amber-700">
                      {bill.cadence}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-medium text-ink">{currency(bill.amount)}</p>
                  <p className="text-sm text-danger">Due {prettyDate(bill.next_due_date)}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3">
                  <Avatar member={payer} size="sm" />
                  <span className="text-sm text-ink-muted">
                    {payer?.name ?? 'No payer'}'s turn
                  </span>
                </div>
                <Button onClick={() => onMarkPaid(bill)} variant="secondary">
                  Mark as paid
                </Button>
              </div>
              <div className="mt-3">
                <AvatarStack memberIds={bill.split_member_ids} members={members} />
              </div>
            </Card>
          )
        })}
        {bills.length === 0 ? (
          <Card className="p-6 text-sm text-ink-muted">Nothing in this section.</Card>
        ) : null}
      </div>
    </section>
  )
}

function AddBillPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const household = useAuthStore((state) => state.household)
  const members = useAuthStore((state) => state.members)
  const addBill = useBillStore((state) => state.addBill)
  const showToast = useToastStore((state) => state.showToast)
  const [title, setTitle] = useState('')
  const [billType, setBillType] = useState<BillType>('rent')
  const [amount, setAmount] = useState('0')
  const [cadence, setCadence] = useState<BillCadence>('monthly')
  const [dueDay, setDueDay] = useState('1')
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [splitMemberIds, setSplitMemberIds] = useState<string[]>([])
  const [splitCustom, setSplitCustom] = useState<Record<string, number>>({})
  const [payerRotation, setPayerRotation] = useState<string[]>([])

  function togglePayer(memberId: string) {
    setPayerRotation((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    )
  }

  function movePayer(memberId: string, direction: -1 | 1) {
    const index = payerRotation.indexOf(memberId)

    if (index < 0) {
      return
    }

    const next = [...payerRotation]
    const targetIndex = index + direction

    if (targetIndex < 0 || targetIndex >= next.length) {
      return
    }

    const [removed] = next.splice(index, 1)
    next.splice(targetIndex, 0, removed)
    setPayerRotation(next)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!household) {
      return
    }

    if (splitMode === 'custom' && !validateCustomSplit(splitCustom)) {
      showToast({ title: 'Custom split must add up to 100%.', tone: 'error' })
      return
    }

    try {
      await addBill({
        householdId: household.id,
        title,
        billType,
        amount: Number(amount),
        cadence,
        dueDay: Number(dueDay),
        splitMemberIds,
        splitMode,
        splitCustom: splitMode === 'custom' ? splitCustom : null,
        payerRotation,
        nextDueDate: dueDateForDay(Number(dueDay)),
      })
      showToast({ title: 'Bill added.', tone: 'success' })
      onClose()
    } catch (error) {
      showToast({
        title: error instanceof Error ? error.message : 'Could not add bill.',
        tone: 'error',
      })
    }
  }

  return (
    <SlidePanel onClose={onClose} open={open} title="Add bill">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Title">
          <TextInput onChange={(event) => setTitle(event.target.value)} required value={title} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <SelectInput
              onChange={(event) => setBillType(event.target.value as BillType)}
              value={billType}
            >
              {billTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Amount">
            <TextInput
              min={0.01}
              onChange={(event) => setAmount(event.target.value)}
              required
              type="number"
              value={amount}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cadence">
            <SelectInput
              onChange={(event) => setCadence(event.target.value as BillCadence)}
              value={cadence}
            >
              {billCadences.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Due day">
            <TextInput
              max={28}
              min={1}
              onChange={(event) => setDueDay(event.target.value)}
              required
              type="number"
              value={dueDay}
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
        <Field label="Payer rotation">
          <div className="grid gap-2">
            {members
              .filter((member) => member.is_active)
              .map((member) => {
                const selected = payerRotation.includes(member.id)
                return (
                  <div
                    className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                    key={member.id}
                  >
                    <button
                      className="flex flex-1 items-center gap-3 text-left"
                      onClick={() => togglePayer(member.id)}
                      type="button"
                    >
                      <Avatar member={member} size="sm" />
                      <span className="font-medium text-ink">{member.name}</span>
                    </button>
                    {selected ? (
                      <div className="flex gap-1">
                        <Button
                          aria-label={`Move ${member.name} up`}
                          className="h-9 w-9 min-h-9 px-0"
                          icon={<ArrowUp size={16} />}
                          onClick={() => movePayer(member.id, -1)}
                          variant="ghost"
                        />
                        <Button
                          aria-label={`Move ${member.name} down`}
                          className="h-9 w-9 min-h-9 px-0"
                          icon={<ArrowDown size={16} />}
                          onClick={() => movePayer(member.id, 1)}
                          variant="ghost"
                        />
                      </div>
                    ) : null}
                    <input
                      checked={selected}
                      className="h-5 w-5 accent-primary"
                      onChange={() => togglePayer(member.id)}
                      type="checkbox"
                    />
                  </div>
                )
              })}
          </div>
        </Field>
        <Button type="submit">Add bill</Button>
      </form>
    </SlidePanel>
  )
}

function MarkBillPaidPanel({
  bill,
  onClose,
}: {
  bill: Bill | null
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const markPaid = useBillStore((state) => state.markPaid)
  const members = useAuthStore((state) => state.members)
  const showToast = useToastStore((state) => state.showToast)
  const payerId = bill ? getCurrentPayerId(bill) : ''

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!bill) {
      return
    }

    try {
      await markPaid({
        bill,
        amount: amount ? Number(amount) : bill.amount,
        paidBy: payerId,
      })
      showToast({ title: 'Bill marked as paid.', tone: 'success' })
      onClose()
    } catch (error) {
      showToast({
        title: error instanceof Error ? error.message : 'Could not mark bill paid.',
        tone: 'error',
      })
    }
  }

  return (
    <SlidePanel onClose={onClose} open={Boolean(bill)} title="Mark as paid">
      <form className="grid gap-4" onSubmit={submit}>
        <p className="text-sm text-ink-muted">
          The default amount is {bill ? currency(bill.amount) : ''}. Override it for
          variable bills.
        </p>
        <Field label="Amount paid">
          <TextInput
            min={0.01}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={bill ? String(bill.amount) : ''}
            step="0.01"
            type="number"
            value={amount}
          />
        </Field>
        <p className="text-sm text-ink-muted">
          Paid by {memberName(payerId, members)}
        </p>
        <Button type="submit">Log payment</Button>
      </form>
    </SlidePanel>
  )
}

function isDueWithinThreeDays(date: string) {
  const today = new Date()
  const due = new Date(`${date}T00:00:00`)
  const diff = due.getTime() - today.getTime()
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000
}
