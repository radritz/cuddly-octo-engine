import type { Category } from '../lib/types'

export const categories: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'household', label: 'Household' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'gym', label: 'Gym' },
  { value: 'other', label: 'Other' },
]

export const itemCategories = categories.filter(
  (category): category is { value: Category; label: string } =>
    category.value !== 'all',
)
