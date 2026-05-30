export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Category = 'kitchen' | 'household' | 'gym' | 'bathroom' | 'other'

export type SplitMode = 'equal' | 'custom'

export type ExpenseSource =
  | 'grocery'
  | 'gym'
  | 'rent'
  | 'bill'
  | 'maintenance'
  | 'other'

export type BillType =
  | 'rent'
  | 'electricity'
  | 'wifi'
  | 'water'
  | 'gas'
  | 'maid'
  | 'society'
  | 'other'

export type BillCadence = 'monthly' | 'quarterly' | 'weekly' | 'one-time'

export type Household = {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export type Member = {
  id: string
  household_id: string
  email: string
  name: string
  avatar_color: string
  is_admin: boolean
  is_active: boolean
  joined_at: string
}

export type Item = {
  id: string
  household_id: string
  name: string
  category: Category
  unit: string
  current_qty: number
  min_threshold: number
  split_member_ids: string[]
  split_mode: SplitMode
  split_custom: Record<string, number> | null
  needs_restock: boolean
  photo_url: string | null
  serving_size: number | null
  serving_unit: string | null
  total_weight: number | null
  daily_servings: number | null
  created_by: string
  created_at: string
}

export type ExpenseSplit = {
  member_id: string
  amount: number
  settled: boolean
}

export type Expense = {
  id: string
  household_id: string
  title: string
  amount: number
  paid_by: string
  source: ExpenseSource
  splits: ExpenseSplit[]
  item_id: string | null
  date: string
  created_at: string
  notes: string | null
}

export type Bill = {
  id: string
  household_id: string
  title: string
  bill_type: BillType
  amount: number
  due_day: number
  cadence: BillCadence
  split_member_ids: string[]
  split_mode: SplitMode
  split_custom: Record<string, number> | null
  payer_rotation: string[]
  current_payer_index: number
  is_active: boolean
  next_due_date: string
  created_at: string
}

export type Settlement = {
  id: string
  household_id: string
  from_member_id: string
  to_member_id: string
  amount: number
  settled_at: string
  payment_ref: string | null
}

export type AllowedEmail = {
  id: string
  household_id: string | null
  email: string
  created_by: string | null
  accepted_at: string | null
  created_at: string
}

export type Balance = {
  memberId: string
  amount: number
  isInactive: boolean
}

export type SettlementTransfer = {
  from: string
  to: string
  amount: number
}

export type Toast = {
  id: string
  title: string
  tone: 'success' | 'error' | 'info'
}

export type Database = {
  public: {
    Tables: {
      households: {
        Row: Household
        Insert: Partial<Household> & Pick<Household, 'name'>
        Update: Partial<Household>
        Relationships: []
      }
      members: {
        Row: Member
        Insert: Partial<Member> &
          Pick<Member, 'id' | 'household_id' | 'email' | 'name'>
        Update: Partial<Member>
        Relationships: []
      }
      items: {
        Row: Item
        Insert: Partial<Item> &
          Pick<
            Item,
            | 'household_id'
            | 'name'
            | 'category'
            | 'unit'
            | 'split_member_ids'
            | 'split_mode'
            | 'created_by'
          >
        Update: Partial<Item>
        Relationships: []
      }
      expenses: {
        Row: Expense
        Insert: Partial<Expense> &
          Pick<
            Expense,
            'household_id' | 'title' | 'amount' | 'paid_by' | 'source' | 'splits'
          >
        Update: Partial<Expense>
        Relationships: []
      }
      bills: {
        Row: Bill
        Insert: Partial<Bill> &
          Pick<
            Bill,
            | 'household_id'
            | 'title'
            | 'bill_type'
            | 'amount'
            | 'due_day'
            | 'cadence'
            | 'split_member_ids'
            | 'split_mode'
            | 'payer_rotation'
            | 'next_due_date'
          >
        Update: Partial<Bill>
        Relationships: []
      }
      settlements: {
        Row: Settlement
        Insert: Partial<Settlement> &
          Pick<
            Settlement,
            'household_id' | 'from_member_id' | 'to_member_id' | 'amount'
          >
        Update: Partial<Settlement>
        Relationships: []
      }
      allowed_emails: {
        Row: AllowedEmail
        Insert: Partial<AllowedEmail> & Pick<AllowedEmail, 'email'>
        Update: Partial<AllowedEmail>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_household: {
        Args: { p_name: string; p_member_name: string }
        Returns: Household
      }
      join_household: {
        Args: { p_invite_code: string; p_member_name: string }
        Returns: Household
      }
      regenerate_invite_code: {
        Args: { p_household_id: string }
        Returns: string
      }
      update_member_profile: {
        Args: { p_name: string; p_avatar_color: string }
        Returns: Member
      }
      deactivate_member: {
        Args: { p_member_id: string }
        Returns: void
      }
    }
  }
}
