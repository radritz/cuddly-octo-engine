import { describe, expect, it } from 'vitest'
import { dueDateForDay, nextCycleDate, nextPayerIndex } from './dates'
import type { Bill } from './types'

const baseBill: Pick<Bill, 'cadence' | 'next_due_date' | 'due_day'> = {
  cadence: 'monthly',
  next_due_date: '2026-05-10',
  due_day: 10,
}

describe('date utilities', () => {
  it('returns current month due date when it has not passed', () => {
    expect(dueDateForDay(15, new Date('2026-05-01T00:00:00'))).toBe('2026-05-15')
  })

  it('moves due date to next month when it already passed', () => {
    expect(dueDateForDay(1, new Date('2026-05-30T00:00:00'))).toBe('2026-06-01')
  })

  it('advances monthly cycles', () => {
    expect(nextCycleDate(baseBill)).toBe('2026-06-10')
  })

  it('advances quarterly cycles', () => {
    expect(nextCycleDate({ ...baseBill, cadence: 'quarterly' })).toBe('2026-08-10')
  })

  it('rotates payer index safely', () => {
    expect(nextPayerIndex(2, ['a', 'b', 'c'])).toBe(0)
    expect(nextPayerIndex(0, [])).toBe(0)
  })
})
