import { describe, expect, it } from 'vitest'
import { calculateSplits, computeBalances, minimizeSettlements } from './splits'
import type { Expense, Member, Settlement } from './types'

const members: Member[] = [
  {
    id: 'alice',
    household_id: 'home',
    email: 'alice@example.com',
    name: 'Alice',
    avatar_color: '#6366f1',
    is_admin: true,
    is_active: true,
    joined_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'bob',
    household_id: 'home',
    email: 'bob@example.com',
    name: 'Bob',
    avatar_color: '#14b8a6',
    is_admin: false,
    is_active: true,
    joined_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'chris',
    household_id: 'home',
    email: 'chris@example.com',
    name: 'Chris',
    avatar_color: '#fb7185',
    is_admin: false,
    is_active: false,
    joined_at: '2026-05-01T00:00:00Z',
  },
]

describe('calculateSplits', () => {
  it('splits equally and keeps rounding on the original amount', () => {
    expect(calculateSplits(100, ['alice', 'bob', 'chris'], 'equal')).toEqual([
      { member_id: 'alice', amount: 33.33, settled: false },
      { member_id: 'bob', amount: 33.33, settled: false },
      { member_id: 'chris', amount: 33.34, settled: false },
    ])
  })

  it('applies custom percentages', () => {
    expect(
      calculateSplits(500, ['alice', 'bob'], 'custom', {
        alice: 70,
        bob: 30,
      }),
    ).toEqual([
      { member_id: 'alice', amount: 350, settled: false },
      { member_id: 'bob', amount: 150, settled: false },
    ])
  })

  it('rejects zero expenses', () => {
    expect(() => calculateSplits(0, ['alice'], 'equal')).toThrow(
      'Expense amount must be greater than 0.',
    )
  })

  it('rejects custom percentages that do not sum to 100', () => {
    expect(() =>
      calculateSplits(100, ['alice', 'bob'], 'custom', {
        alice: 80,
        bob: 30,
      }),
    ).toThrow('Custom split percentages must add up to 100.')
  })
})

describe('balance utilities', () => {
  const expenses: Expense[] = [
    {
      id: 'expense-1',
      household_id: 'home',
      title: 'Groceries',
      amount: 300,
      paid_by: 'alice',
      source: 'grocery',
      splits: calculateSplits(300, ['alice', 'bob', 'chris'], 'equal'),
      item_id: null,
      date: '2026-05-20',
      created_at: '2026-05-20T00:00:00Z',
      notes: null,
    },
    {
      id: 'expense-2',
      household_id: 'home',
      title: 'Wifi',
      amount: 90,
      paid_by: 'bob',
      source: 'bill',
      splits: calculateSplits(90, ['alice', 'bob', 'chris'], 'equal'),
      item_id: null,
      date: '2026-05-21',
      created_at: '2026-05-21T00:00:00Z',
      notes: null,
    },
  ]

  const settlements: Settlement[] = [
    {
      id: 'settlement-1',
      household_id: 'home',
      from_member_id: 'chris',
      to_member_id: 'alice',
      amount: 20,
      settled_at: '2026-05-22T00:00:00Z',
      payment_ref: null,
    },
  ]

  it('computes net balances after settlements', () => {
    expect(computeBalances(expenses, settlements, members)).toEqual([
      { memberId: 'alice', amount: 150, isInactive: false },
      { memberId: 'bob', amount: -40, isInactive: false },
      { memberId: 'chris', amount: -110, isInactive: true },
    ])
  })

  it('returns minimum transfer suggestions', () => {
    expect(minimizeSettlements(expenses, settlements, members)).toEqual([
      { from: 'chris', to: 'alice', amount: 110 },
      { from: 'bob', to: 'alice', amount: 40 },
    ])
  })
})
