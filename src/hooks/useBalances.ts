import { useMemo } from 'react'
import { computeBalances, minimizeSettlements } from '../lib/splits'
import { useAuthStore } from '../stores/authStore'
import { useExpenseStore } from '../stores/expenseStore'

export function useBalances() {
  const members = useAuthStore((state) => state.members)
  const currentMember = useAuthStore((state) => state.member)
  const expenses = useExpenseStore((state) => state.expenses)
  const settlements = useExpenseStore((state) => state.settlements)

  return useMemo(() => {
    const balances = computeBalances(expenses, settlements, members)
    const transfers = minimizeSettlements(expenses, settlements, members)
    const currentBalance =
      balances.find((balance) => balance.memberId === currentMember?.id)?.amount ?? 0

    return {
      balances,
      transfers,
      currentBalance,
    }
  }, [currentMember?.id, expenses, members, settlements])
}
