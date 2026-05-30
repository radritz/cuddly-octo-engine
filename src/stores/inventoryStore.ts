import { create } from 'zustand'
import { calculateSplits } from '../lib/splits'
import { supabase } from '../lib/supabase'
import type { Category, Item, SplitMode } from '../lib/types'
import { validateCustomSplit } from '../lib/validators'

type ItemInput = {
  householdId: string
  createdBy: string
  name: string
  category: Category
  unit: string
  currentQty: number
  minThreshold: number
  splitMemberIds: string[]
  splitMode: SplitMode
  splitCustom: Record<string, number> | null
  photoUrl?: string | null
  servingSize?: number | null
  servingUnit?: string | null
  totalWeight?: number | null
  dailyServings?: number | null
}

type InventoryState = {
  items: Item[]
  isLoading: boolean
  isSyncing: boolean
  fetchItems: (householdId: string) => Promise<void>
  addItem: (input: ItemInput) => Promise<void>
  updateItem: (itemId: string, input: Partial<ItemInput>) => Promise<void>
  adjustQty: (item: Item, delta: number) => Promise<void>
  markBought: (params: {
    item: Item
    amount: number
    paidBy: string
    restockedQty: number
  }) => Promise<void>
  clear: () => void
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  isLoading: false,
  isSyncing: false,

  fetchItems: async (householdId) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      set({ items: data ?? [] })
    } finally {
      set({ isLoading: false })
    }
  },

  addItem: async (input) => {
    if (input.splitMode === 'custom' && !validateCustomSplit(input.splitCustom ?? {})) {
      throw new Error('Custom split percentages must add up to 100.')
    }

    set({ isSyncing: true })
    try {
      const { error } = await supabase.from('items').insert({
        household_id: input.householdId,
        name: input.name,
        category: input.category,
        unit: input.unit,
        current_qty: input.currentQty,
        min_threshold: input.minThreshold,
        split_member_ids: input.splitMemberIds,
        split_mode: input.splitMode,
        split_custom: input.splitCustom,
        photo_url: input.photoUrl ?? null,
        serving_size: input.servingSize ?? null,
        serving_unit: input.servingUnit ?? null,
        total_weight: input.totalWeight ?? null,
        daily_servings: input.dailyServings ?? null,
        created_by: input.createdBy,
      })

      if (error) {
        throw error
      }

      await get().fetchItems(input.householdId)
    } finally {
      set({ isSyncing: false })
    }
  },

  updateItem: async (itemId, input) => {
    if (input.splitMode === 'custom' && !validateCustomSplit(input.splitCustom ?? {})) {
      throw new Error('Custom split percentages must add up to 100.')
    }

    const patch = {
      name: input.name,
      category: input.category,
      unit: input.unit,
      current_qty: input.currentQty,
      min_threshold: input.minThreshold,
      split_member_ids: input.splitMemberIds,
      split_mode: input.splitMode,
      split_custom: input.splitCustom,
      photo_url: input.photoUrl,
      serving_size: input.servingSize,
      serving_unit: input.servingUnit,
      total_weight: input.totalWeight,
      daily_servings: input.dailyServings,
    }

    set({ isSyncing: true })
    try {
      const { data, error } = await supabase
        .from('items')
        .update(patch)
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        throw error
      }

      set((state) => ({
        items: state.items.map((item) => (item.id === itemId ? data : item)),
      }))
    } finally {
      set({ isSyncing: false })
    }
  },

  adjustQty: async (item, delta) => {
    set({ isSyncing: true })
    try {
      const { data, error } = await supabase
        .from('items')
        .update({ current_qty: Math.max(0, item.current_qty + delta) })
        .eq('id', item.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      set((state) => ({
        items: state.items.map((current) => (current.id === item.id ? data : current)),
      }))
    } finally {
      set({ isSyncing: false })
    }
  },

  markBought: async ({ item, amount, paidBy, restockedQty }) => {
    const splits = calculateSplits(
      amount,
      item.split_member_ids,
      item.split_mode,
      item.split_custom ?? {},
    )

    set({ isSyncing: true })
    try {
      const { error: expenseError } = await supabase.from('expenses').insert({
        household_id: item.household_id,
        title: `${item.name} restock`,
        amount,
        paid_by: paidBy,
        source: item.category === 'gym' ? 'gym' : 'grocery',
        splits,
        item_id: item.id,
        date: new Date().toISOString().slice(0, 10),
      })

      if (expenseError) {
        throw expenseError
      }

      const { data, error: itemError } = await supabase
        .from('items')
        .update({ current_qty: restockedQty })
        .eq('id', item.id)
        .select()
        .single()

      if (itemError) {
        throw itemError
      }

      set((state) => ({
        items: state.items.map((current) => (current.id === item.id ? data : current)),
      }))
    } finally {
      set({ isSyncing: false })
    }
  },

  clear: () => set({ items: [], isLoading: false, isSyncing: false }),
}))
