import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns'
import type { Member } from './types'

export function currency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

export function initials(nameOrEmail: string) {
  const source = nameOrEmail.trim() || 'Member'
  const parts = source.includes('@')
    ? [source.split('@')[0]]
    : source.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function memberName(memberId: string, members: Member[]) {
  return members.find((member) => member.id === memberId)?.name ?? 'Unknown'
}

export function prettyDate(date: string) {
  const parsed = parseISO(date)
  return isValid(parsed) ? format(parsed, 'MMM d') : date
}

export function relativeTime(date: string) {
  const parsed = parseISO(date)
  return isValid(parsed)
    ? `${formatDistanceToNowStrict(parsed, { addSuffix: true })}`
    : date
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
