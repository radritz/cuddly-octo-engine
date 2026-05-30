import { useAuthStore } from '../stores/authStore'
import { useBillStore } from '../stores/billStore'
import { useExpenseStore } from '../stores/expenseStore'
import { useInventoryStore } from '../stores/inventoryStore'

export function clearAllStores() {
  useInventoryStore.getState().clear()
  useExpenseStore.getState().clear()
  useBillStore.getState().clear()
  useAuthStore.getState().clearLocalState()
}
