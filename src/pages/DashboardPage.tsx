import { AlertTriangle, ArrowRight, CalendarClock, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar, AvatarStack } from '../components/Avatar'
import { SourceBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'
import { useBalances } from '../hooks/useBalances'
import { getCurrentPayerId } from '../lib/dates'
import { currency, memberName, prettyDate, relativeTime } from '../lib/format'
import { useAuthStore } from '../stores/authStore'
import { useBillStore } from '../stores/billStore'
import { useExpenseStore } from '../stores/expenseStore'
import { useInventoryStore } from '../stores/inventoryStore'

export function DashboardPage() {
  const household = useAuthStore((state) => state.household)
  const member = useAuthStore((state) => state.member)
  const members = useAuthStore((state) => state.members)
  const items = useInventoryStore((state) => state.items)
  const bills = useBillStore((state) => state.bills)
  const expenses = useExpenseStore((state) => state.expenses)
  const settlements = useExpenseStore((state) => state.settlements)
  const { balances, transfers, currentBalance } = useBalances()
  const lowStock = items.filter((item) => item.needs_restock)
  const upcomingBills = bills
    .filter((bill) => bill.is_active)
    .slice()
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
    .slice(0, 3)
  const recentExpenses = expenses.slice(0, 10)

  return (
    <>
      <PageHeader
        action={
          <Link to="/expenses">
            <Button icon={<Plus size={18} />}>New Entry</Button>
          </Link>
        }
        eyebrow="Overview of your shared household operations."
        title={household?.name ?? 'HomeOS'}
      />

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-ink-muted">Your net position</p>
          <p
            className={[
              'mt-3 text-3xl font-medium',
              currentBalance >= 0 ? 'text-success' : 'text-danger',
            ].join(' ')}
          >
            {currency(Math.abs(currentBalance))}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {currentBalance >= 0 ? 'owed to you' : 'you owe'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">Pending transfers</p>
          <p className="mt-3 text-3xl font-medium text-ink">{transfers.length}</p>
          <p className="mt-2 text-sm text-ink-muted">minimum settlement plan</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">Active bills</p>
          <p className="mt-3 text-3xl font-medium text-ink">
            {bills.filter((bill) => bill.is_active).length}
          </p>
          <p className="mt-2 text-sm text-danger">
            {upcomingBills.filter((bill) => isDueSoon(bill.next_due_date)).length} due soon
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-ink-muted">Low stock</p>
          <p className="mt-3 text-3xl font-medium text-ink">{lowStock.length}</p>
          <p className="mt-2 text-sm text-ink-muted">items need restocking</p>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {balances.map((balance) => {
          const current = members.find((candidate) => candidate.id === balance.memberId)
          return (
            <Card className="flex items-center gap-4 p-4" key={balance.memberId}>
              <Avatar member={current} />
              <div className="flex-1">
                <p className="font-medium text-ink">{current?.name ?? 'Unknown'}</p>
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
              {balance.isInactive ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                  left
                </span>
              ) : null}
            </Card>
          )
        })}
      </section>

      {lowStock.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <AlertTriangle className="mt-1 text-amber-700" size={24} />
              <div>
                <h2 className="font-medium text-amber-950">Low stock alert</h2>
                <p className="mt-1 text-sm text-amber-900">
                  {lowStock.length} items need restocking: {lowStock.map((item) => item.name).join(', ')}
                </p>
              </div>
            </div>
            <Link className="shrink-0" to="/inventory">
              <Button variant="secondary">View list</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <h2 className="mb-3 text-2xl font-medium text-ink">Recent</h2>
          <Card className="divide-y divide-gray-100 overflow-hidden">
            {recentExpenses.length === 0 ? (
              <div className="p-6 text-sm text-ink-muted">No expenses yet.</div>
            ) : (
              recentExpenses.map((expense) => (
                <div className="flex items-center gap-4 p-4" key={expense.id}>
                  <Avatar member={members.find((candidate) => candidate.id === expense.paid_by)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{expense.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <SourceBadge source={expense.source} />
                      <span className="text-sm text-ink-muted">
                        paid by {memberName(expense.paid_by, members)} - {relativeTime(expense.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="font-medium text-ink">{currency(expense.amount)}</p>
                </div>
              ))
            )}
          </Card>
          {settlements.length > 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              Last settlement {relativeTime(settlements[0].settled_at)}.
            </p>
          ) : null}
        </div>

        <div>
          <h2 className="mb-3 text-2xl font-medium text-ink">Due soon</h2>
          <div className="grid gap-3">
            {upcomingBills.map((bill) => {
              const payerId = getCurrentPayerId(bill)
              return (
                <Card className="p-4" key={bill.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-primary">
                        <CalendarClock size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-ink">{bill.title}</p>
                        <p className="text-sm text-ink-muted">
                          Due {prettyDate(bill.next_due_date)}
                        </p>
                      </div>
                    </div>
                    <p className="font-medium text-ink">{currency(bill.amount)}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <AvatarStack memberIds={bill.split_member_ids} members={members} />
                    <span className="text-sm text-ink-muted">
                      {memberName(payerId, members)} pays
                    </span>
                  </div>
                </Card>
              )
            })}
            {upcomingBills.length === 0 ? (
              <Card className="p-6 text-sm text-ink-muted">
                No upcoming bills.
              </Card>
            ) : null}
          </div>
        </div>
      </section>

      {transfers.length > 0 ? (
        <Card className="p-4">
          <h2 className="text-xl font-medium text-ink">Suggested transfers</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {transfers.map((transfer) => (
              <div
                className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                key={`${transfer.from}-${transfer.to}-${transfer.amount}`}
              >
                <span>{memberName(transfer.from, members)}</span>
                <span className="flex items-center gap-2 text-primary">
                  {currency(transfer.amount)}
                  <ArrowRight size={16} />
                </span>
                <span>
                  {transfer.to === member?.id ? 'You' : memberName(transfer.to, members)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </>
  )
}

function isDueSoon(date: string) {
  const today = new Date()
  const due = new Date(`${date}T00:00:00`)
  const diff = due.getTime() - today.getTime()
  return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000
}
