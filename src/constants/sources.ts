import type { ExpenseSource } from '../lib/types'

export const expenseSources: Array<{ value: ExpenseSource; label: string }> = [
  { value: 'grocery', label: 'Grocery' },
  { value: 'gym', label: 'Gym' },
  { value: 'rent', label: 'Rent' },
  { value: 'bill', label: 'Bill' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
]
