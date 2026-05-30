import { create } from 'zustand'
import { nextCycleDate, nextPayerIndex } from '../lib/dates'
import { calculateSplits } from '../lib/splits'
import { supabase } from '../lib/supabase'
import type { Bill, BillCadence, BillType, SplitMode } from '../lib/types'

type BillInput = {
  householdId: string
  title: string
  billType: BillType
  amount: number
  cadence: BillCadence
  dueDay: number
  splitMemberIds: string[]
  splitMode: SplitMode
  splitCustom: Record<string, number> | null
  payerRotation: string[]
  nextDueDate: string
}

type BillState = {
  bills: Bill[]
  isLoading: boolean
  isSyncing: boolean
  fetchBills: (householdId: string) => Promise<void>
  addBill: (input: BillInput) => Promise<void>
  markPaid: (params: { bill: Bill; amount: number; paidBy: string }) => Promise<void>
  clear: () => void
}

export const useBillStore = create<BillState>((set, get) => ({
  bills: [],
  isLoading: false,
  isSyncing: false,

  fetchBills: async (householdId) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('household_id', householdId)
        .order('next_due_date')

      if (error) {
        throw error
      }

      set({ bills: data ?? [] })
    } finally {
      set({ isLoading: false })
    }
  },

  addBill: async (input) => {
    set({ isSyncing: true })
    try {
      const { error } = await supabase.from('bills').insert({
        household_id: input.householdId,
        title: input.title,
        bill_type: input.billType,
        amount: input.amount,
        due_day: input.dueDay,
        cadence: input.cadence,
        split_member_ids: input.splitMemberIds,
        split_mode: input.splitMode,
        split_custom: input.splitCustom,
        payer_rotation: input.payerRotation,
        next_due_date: input.nextDueDate,
      })

      if (error) {
        throw error
      }

      await get().fetchBills(input.householdId)
    } finally {
      set({ isSyncing: false })
    }
  },

  markPaid: async ({ bill, amount, paidBy }) => {
    const source = bill.bill_type === 'rent' ? 'rent' : 'bill'
    const splits = calculateSplits(
      amount,
      bill.split_member_ids,
      bill.split_mode,
      bill.split_custom ?? {},
    )

    set({ isSyncing: true })
    try {
      const { error: expenseError } = await supabase.from('expenses').insert({
        household_id: bill.household_id,
        title: bill.title,
        amount,
        paid_by: paidBy,
        source,
        splits,
        date: new Date().toISOString().slice(0, 10),
      })

      if (expenseError) {
        throw expenseError
      }

      const nextIndex = nextPayerIndex(
        bill.current_payer_index,
        bill.payer_rotation,
      )
      const patch =
        bill.cadence === 'one-time'
          ? { is_active: false }
          : {
              current_payer_index: nextIndex,
              next_due_date: nextCycleDate(bill),
            }

      const { data, error: billError } = await supabase
        .from('bills')
        .update(patch)
        .eq('id', bill.id)
        .select()
        .single()

      if (billError) {
        throw billError
      }

      set((state) => ({
        bills: state.bills.map((current) => (current.id === bill.id ? data : current)),
      }))
    } finally {
      set({ isSyncing: false })
    }
  },

  clear: () => set({ bills: [], isLoading: false, isSyncing: false }),
}))
