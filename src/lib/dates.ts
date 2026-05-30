import { addMonths, addWeeks, format, isBefore, parseISO } from 'date-fns'
import type { Bill } from './types'

export function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function dueDateForDay(day: number, from = new Date()) {
  const safeDay = Math.min(28, Math.max(1, day))
  const candidate = new Date(from.getFullYear(), from.getMonth(), safeDay)
  const resolved = isBefore(candidate, from)
    ? new Date(from.getFullYear(), from.getMonth() + 1, safeDay)
    : candidate

  return format(resolved, 'yyyy-MM-dd')
}

export function nextCycleDate(bill: Pick<Bill, 'cadence' | 'next_due_date' | 'due_day'>) {
  const current = parseISO(bill.next_due_date)

  if (bill.cadence === 'weekly') {
    return format(addWeeks(current, 1), 'yyyy-MM-dd')
  }

  if (bill.cadence === 'quarterly') {
    return format(addMonths(current, 3), 'yyyy-MM-dd')
  }

  if (bill.cadence === 'one-time') {
    return bill.next_due_date
  }

  return format(addMonths(current, 1), 'yyyy-MM-dd')
}

export function nextPayerIndex(currentIndex: number, rotation: string[]) {
  if (rotation.length === 0) {
    return 0
  }

  return (currentIndex + 1) % rotation.length
}

export function getCurrentPayerId(bill: Pick<Bill, 'payer_rotation' | 'current_payer_index'>) {
  return bill.payer_rotation[bill.current_payer_index] ?? bill.payer_rotation[0] ?? ''
}
