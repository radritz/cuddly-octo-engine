import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useBillStore } from '../stores/billStore'
import { useExpenseStore } from '../stores/expenseStore'
import { useInventoryStore } from '../stores/inventoryStore'

export function useRealtime(householdId?: string) {
  const refreshMembers = useAuthStore((state) => state.refreshMembers)
  const fetchItems = useInventoryStore((state) => state.fetchItems)
  const fetchExpenses = useExpenseStore((state) => state.fetchExpenses)
  const fetchSettlements = useExpenseStore((state) => state.fetchSettlements)
  const fetchBills = useBillStore((state) => state.fetchBills)

  useEffect(() => {
    if (!householdId) {
      return undefined
    }

    const channel = supabase
      .channel(`homeos-household-${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `household_id=eq.${householdId}`,
        },
        () => void fetchItems(householdId),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `household_id=eq.${householdId}`,
        },
        () => void fetchExpenses(householdId),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `household_id=eq.${householdId}`,
        },
        () => void fetchBills(householdId),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `household_id=eq.${householdId}`,
        },
        () => void fetchSettlements(householdId),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `household_id=eq.${householdId}`,
        },
        () => void refreshMembers(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [
    fetchBills,
    fetchExpenses,
    fetchItems,
    fetchSettlements,
    householdId,
    refreshMembers,
  ])
}
