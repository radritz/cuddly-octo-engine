import { CheckCircle2, ChevronDown, Plus, ReceiptText } from 'lucide-react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Avatar } from '../components/Avatar'
import { SourceBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Field, SelectInput, TextInput } from '../components/Form'
import { PageHeader } from '../components/PageHeader'
import { SlidePanel } from '../components/SlidePanel'
import { SplitSelector } from '../components/SplitSelector'
import { expenseSources } from '../constants/sources'
import { useBalances } from '../hooks/useBalances'
import { todayIso } from '../lib/dates'
import { currency, memberName, prettyDate } from '../lib/format'
import type { Expense, ExpenseSource, SplitMode } from '../lib/types'
import { validateCustomSplit } from '../lib/validators'
import { useAuthStore } from '../stores/authStore'
import { useExpenseStore } from '../stores/expenseStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { useToastStore } from '../stores/toastStore'

export function ExpensesPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [settleTransfer, setSettleTransfer] = useState<{
    from: string
    to: string
    amount: number
  } | null>(null)
  const [sourceFilter, setSourceFilter] = useState<ExpenseSource | 'all'>('all')
  const [memberFilter, setMemberFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const members = useAuthStore((state) => state.members)
  const expenses = useExpenseStore((state) => state.expenses)
  const { balances, transfers } = useBalances()
  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const matchesSource = sourceFilter === 'all' || expense.source === sourceFilter
        const matchesMember = memberFilter === 'all' || expense.paid_by === memberFilter
        return matchesSource && matchesMember
      }),
    [expenses, memberFilter, sourceFilter],
  )

  return (
    <>
      <PageHeader
        action={
          <Button icon={<Plus size={18} />} onClick={() => setAddOpen(true)}>
            Add expense
          </Button>
        }
        eyebrow="Review who owes what and settle up."
        title="Expenses"
      />

      <section className="grid gap-3 md:grid-cols-3">
        {balances.map((balance) => {
          const member = members.find((candidate) => candidate.id === balance.memberId)
          return (
            <Card className="flex items-center gap-4 p-4" key={balance.memberId}>
              <Avatar member={member} />
              <div className="flex-1">
                <p className="font-medium text-ink">{member?.name ?? 'Unknown'}</p>
                <p
                  className={[
                    'text-sm',
                    balance.amount >= 0 ? 'text-success' : 'text-danger',
                  ].join(' ')}
                >
                  {balance.amount === 0
                    ? 'Settled up'
                    : balance.amount > 0
                      ? `${currency(balance.amount)} owed to them`
                      : `owes ${currency(Math.abs(balance.amount))}`}
                </p>
              </div>
            </Card>
          )
        })}
      </section>

      {transfers.length > 0 ? (
        <Card className="p-4">
          <h2 className="text-xl font-medium text-ink">Suggested transfers</h2>
          <div className="mt-3 grid gap-3">
            {transfers.map((transfer) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3"
                key={`${transfer.from}-${transfer.to}-${transfer.amount}`}
              >
                <span>{memberName(transfer.from, members)}</span>
                <span className="text-primary">{currency(transfer.amount)}</span>
                <span>{memberName(transfer.to, members)}</span>
                <Button
                  onClick={() => setSettleTransfer(transfer)}
                  variant="secondary"
                >
                  Settle up
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="grid gap-3 p-4 md:grid-cols-2">
        <Field label="Source">
          <SelectInput
            onChange={(event) => setSourceFilter(event.target.value as ExpenseSource | 'all')}
            value={sourceFilter}
          >
            <option value="all">All sources</option>
            {expenseSources.map((source) => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Paid by">
          <SelectInput
            onChange={(event) => setMemberFilter(event.target.value)}
            value={memberFilter}
          >
            <option value="all">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </Card>

      <section className="grid gap-3">
        {filteredExpenses.map((expense) => (
          <ExpenseCard
            expanded={expandedId === expense.id}
            expense={expense}
            key={expense.id}
            onToggle={() =>
              setExpandedId(expandedId === expense.id ? null : expense.id)
            }
          />
        ))}
      </section>

      {filteredExpenses.length === 0 ? (
        <EmptyState
          body="Add groceries, rent, bills, maintenance, or other household costs."
          icon={<ReceiptText size={22} />}
          title="No expenses found"
        />
      ) : null}

      <AddExpensePanel onClose={() => setAddOpen(false)} open={addOpen} />
      <SettlePanel
        onClose={() => setSettleTransfer(null)}
        transfer={settleTransfer}
      />
    </>
  )
}

function ExpenseCard({
  expense,
  expanded,
  onToggle,
}: {
  expense: Expense
  expanded: boolean
  onToggle: () => void
}) {
  const members = useAuthStore((state) => state.members)
  const items = useInventoryStore((state) => state.items)
  const linkedItem = items.find((item) => item.id === expense.item_id)
  const paidBy = members.find((member) => member.id === expense.paid_by)

  return (
    <Card className="overflow-hidden">
      <button
        className="flex w-full items-center gap-4 p-4 text-left"
        onClick={onToggle}
        type="button"
      >
        <Avatar member={paidBy} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-medium text-ink">{expense.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <SourceBadge source={expense.source} />
            <span className="text-sm text-ink-muted">
              {prettyDate(expense.date)} - paid by {paidBy?.name ?? 'Unknown'}
            </span>
          </div>
        </div>
        <p className="font-medium text-ink">{currency(expense.amount)}</p>
        <ChevronDown
          className={expanded ? 'rotate-180 transition' : 'transition'}
          size={18}
        />
      </button>
      {expanded ? (
        <div className="border-t border-gray-100 p-4">
          <div className="grid gap-2">
            {expense.splits.map((split) => (
              <div
                className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2"
                key={split.member_id}
              >
                <span>{memberName(split.member_id, members)}</span>
                <span>{currency(split.amount)}</span>
              </div>
            ))}
          </div>
          {expense.notes ? (
            <p className="mt-3 text-sm text-ink-muted">{expense.notes}</p>
          ) : null}
          {linkedItem ? (
            <p className="mt-3 text-sm text-primary">Linked item: {linkedItem.name}</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

function AddExpensePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const household = useAuthStore((state) => state.household)
  const currentMember = useAuthStore((state) => state.member)
  const members = useAuthStore((state) => state.members)
  const addExpense = useExpenseStore((state) => state.addExpense)
  const showToast = useToastStore((state) => state.showToast)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [source, setSource] = useState<ExpenseSource>('grocery')
  const [date, setDate] = useState(todayIso())
  const [notes, setNotes] = useState('')
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [splitCustom, setSplitCustom] = useState<Record<string, number>>({})

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
      await addExpense({
        householdId: household.id,
        title,
        amount: Number(amount),
        paidBy: paidBy || currentMember?.id || '',
        source,
        date,
        memberIds,
        splitMode,
        splitCustom,
        notes,
      })
      showToast({ title: 'Expense added.', tone: 'success' })
      onClose()
    } catch (error) {
      showToast({
        title: error instanceof Error ? error.message : 'Could not add expense.',
        tone: 'error',
      })
    }
  }

  return (
    <SlidePanel onClose={onClose} open={open} title="Add expense">
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Amount">
          <TextInput
            min={0.01}
            onChange={(event) => setAmount(event.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </Field>
        <Field label="What was it for?">
          <TextInput
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Weekly groceries"
            required
            value={title}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Source">
            <SelectInput
              onChange={(event) => setSource(event.target.value as ExpenseSource)}
              value={source}
            >
              {expenseSources.map((sourceOption) => (
                <option key={sourceOption.value} value={sourceOption.value}>
                  {sourceOption.label}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
        <Field label="Date">
          <TextInput
            onChange={(event) => setDate(event.target.value)}
            required
            type="date"
            value={date}
          />
        </Field>
        <Field label="Split between">
          <SplitSelector
            customMap={splitCustom}
            members={members}
            mode={splitMode}
            onCustomMapChange={setSplitCustom}
            onModeChange={setSplitMode}
            onSelectedIdsChange={setMemberIds}
            selectedIds={memberIds}
          />
        </Field>
        <Field label="Notes">
          <TextInput onChange={(event) => setNotes(event.target.value)} value={notes} />
        </Field>
        <Button type="submit">Add expense</Button>
      </form>
    </SlidePanel>
  )
}

function SettlePanel({
  transfer,
  onClose,
}: {
  transfer: { from: string; to: string; amount: number } | null
  onClose: () => void
}) {
  const [amount, setAmount] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const household = useAuthStore((state) => state.household)
  const members = useAuthStore((state) => state.members)
  const settle = useExpenseStore((state) => state.settle)
  const showToast = useToastStore((state) => state.showToast)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!household || !transfer) {
      return
    }

    try {
      await settle({
        householdId: household.id,
        fromMemberId: transfer.from,
        toMemberId: transfer.to,
        amount: Number(amount || transfer.amount),
        paymentRef,
      })
      showToast({ title: 'Settlement recorded.', tone: 'success' })
      onClose()
    } catch (error) {
      showToast({
        title:
          error instanceof Error ? error.message : 'Could not record settlement.',
        tone: 'error',
      })
    }
  }

  return (
    <SlidePanel onClose={onClose} open={Boolean(transfer)} title="Settle up">
      <form className="grid gap-4" onSubmit={submit}>
        <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
          <CheckCircle2 className="text-success" size={20} />
          <p className="text-sm text-ink-muted">
            {transfer
              ? `${memberName(transfer.from, members)} pays ${memberName(
                  transfer.to,
                  members,
                )}`
              : ''}
          </p>
        </div>
        <Field label="Amount">
          <TextInput
            min={0.01}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={transfer ? String(transfer.amount) : ''}
            step="0.01"
            type="number"
            value={amount}
          />
        </Field>
        <Field label="UPI ref or note">
          <TextInput
            onChange={(event) => setPaymentRef(event.target.value)}
            value={paymentRef}
          />
        </Field>
        <Button type="submit">Record settlement</Button>
      </form>
    </SlidePanel>
  )
}
