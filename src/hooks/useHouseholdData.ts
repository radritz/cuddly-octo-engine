import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useBillStore } from '../stores/billStore'
import { useExpenseStore } from '../stores/expenseStore'
import { useInventoryStore } from '../stores/inventoryStore'

export function useHouseholdData() {
  const householdId = useAuthStore((state) => state.household?.id)
  const fetchItems = useInventoryStore((state) => state.fetchItems)
  const fetchExpenses = useExpenseStore((state) => state.fetchExpenses)
  const fetchSettlements = useExpenseStore((state) => state.fetchSettlements)
  const fetchBills = useBillStore((state) => state.fetchBills)

  useEffect(() => {
    if (!householdId) {
      return
    }

    void fetchItems(householdId)
    void fetchExpenses(householdId)
    void fetchSettlements(householdId)
    void fetchBills(householdId)
  }, [fetchBills, fetchExpenses, fetchItems, fetchSettlements, householdId])
}
