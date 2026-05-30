export function validatePositiveAmount(amount: number) {
  return Number.isFinite(amount) && amount > 0
}

export function validateCustomSplit(customMap: Record<string, number>) {
  const total = Object.values(customMap).reduce((sum, value) => sum + value, 0)
  return Math.abs(total - 100) < 0.001
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
