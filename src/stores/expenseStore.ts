import { create } from 'zustand'
import { calculateSplits } from '../lib/splits'
import { supabase } from '../lib/supabase'
import type { Expense, ExpenseSource, Settlement, SplitMode } from '../lib/types'

type ExpenseInput = {
  householdId: string
  title: string
  amount: number
  paidBy: string
  source: ExpenseSource
  date: string
  memberIds: string[]
  splitMode: SplitMode
  splitCustom: Record<string, number>
  notes?: string | null
}

type ExpenseState = {
  expenses: Expense[]
  settlements: Settlement[]
  isLoading: boolean
  isSyncing: boolean
  fetchExpenses: (householdId: string) => Promise<void>
  fetchSettlements: (householdId: string) => Promise<void>
  addExpense: (input: ExpenseInput) => Promise<void>
  settle: (params: {
    householdId: string
    fromMemberId: string
    toMemberId: string
    amount: number
    paymentRef?: string
  }) => Promise<void>
  clear: () => void
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  settlements: [],
  isLoading: false,
  isSyncing: false,

  fetchExpenses: async (householdId) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', householdId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      set({ expenses: data ?? [] })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchSettlements: async (householdId) => {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('household_id', householdId)
      .order('settled_at', { ascending: false })

    if (error) {
      throw error
    }

    set({ settlements: data ?? [] })
  },

  addExpense: async (input) => {
    const splits = calculateSplits(
      input.amount,
      input.memberIds,
      input.splitMode,
      input.splitCustom,
    )

    set({ isSyncing: true })
    try {
      const { error } = await supabase.from('expenses').insert({
        household_id: input.householdId,
        title: input.title,
        amount: input.amount,
        paid_by: input.paidBy,
        source: input.source,
        splits,
        date: input.date,
        notes: input.notes ?? null,
      })

      if (error) {
        throw error
      }

      await get().fetchExpenses(input.householdId)
    } finally {
      set({ isSyncing: false })
    }
  },

  settle: async ({ householdId, fromMemberId, toMemberId, amount, paymentRef }) => {
    if (amount <= 0) {
      throw new Error('Settlement amount must be greater than 0.')
    }

    set({ isSyncing: true })
    try {
      const { error } = await supabase.from('settlements').insert({
        household_id: householdId,
        from_member_id: fromMemberId,
        to_member_id: toMemberId,
        amount,
        payment_ref: paymentRef || null,
      })

      if (error) {
        throw error
      }

      await get().fetchSettlements(householdId)
    } finally {
      set({ isSyncing: false })
    }
  },

  clear: () =>
    set({
      expenses: [],
      settlements: [],
      isLoading: false,
      isSyncing: false,
    }),
}))
