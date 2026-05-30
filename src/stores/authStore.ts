import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { avatarColors } from '../constants/colors'
import { requireSupabaseConfig, supabase } from '../lib/supabase'
import type { Household, Member } from '../lib/types'

type AuthState = {
  initialized: boolean
  isLoading: boolean
  isSyncing: boolean
  session: Session | null
  user: User | null
  household: Household | null
  member: Member | null
  members: Member[]
  initialize: () => Promise<void>
  loadProfile: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  createHousehold: (householdName: string, memberName: string) => Promise<void>
  joinHousehold: (inviteCode: string, memberName: string) => Promise<void>
  updateHouseholdName: (name: string) => Promise<void>
  regenerateInviteCode: () => Promise<void>
  updateProfile: (name: string, avatarColor: string) => Promise<void>
  refreshMembers: () => Promise<void>
  clearLocalState: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  isLoading: true,
  isSyncing: false,
  session: null,
  user: null,
  household: null,
  member: null,
  members: [],

  initialize: async () => {
    set({ isLoading: true })
    const {
      data: { session },
    } = await supabase.auth.getSession()

    set({
      session,
      user: session?.user ?? null,
      initialized: true,
      isLoading: false,
    })

    if (session) {
      await get().loadProfile()
    }

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
      })

      if (nextSession) {
        void get().loadProfile()
      } else {
        get().clearLocalState()
      }
    })
  },

  loadProfile: async () => {
    const userId = get().user?.id

    if (!userId) {
      set({ household: null, member: null, members: [] })
      return
    }

    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (memberError) {
      throw memberError
    }

    if (!member || !member.is_active) {
      set({ member: member ?? null, household: null, members: [] })
      return
    }

    const [{ data: household, error: householdError }, { data: members, error: membersError }] =
      await Promise.all([
        supabase
          .from('households')
          .select('*')
          .eq('id', member.household_id)
          .single(),
        supabase
          .from('members')
          .select('*')
          .eq('household_id', member.household_id)
          .order('joined_at'),
      ])

    if (householdError) {
      throw householdError
    }

    if (membersError) {
      throw membersError
    }

    set({
      household,
      member,
      members: members ?? [],
    })
  },

  signInWithGoogle: async () => {
    requireSupabaseConfig()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      throw error
    }
  },

  signInWithPassword: async (email, password) => {
    requireSupabaseConfig()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      throw error
    }
  },

  signUpWithPassword: async (email, password) => {
    requireSupabaseConfig()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      throw error
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    get().clearLocalState()
  },

  createHousehold: async (householdName, memberName) => {
    set({ isSyncing: true })
    try {
      const { error } = await supabase.rpc('create_household', {
        p_name: householdName,
        p_member_name: memberName,
      })

      if (error) {
        throw error
      }

      await get().loadProfile()
    } finally {
      set({ isSyncing: false })
    }
  },

  joinHousehold: async (inviteCode, memberName) => {
    set({ isSyncing: true })
    try {
      const { error } = await supabase.rpc('join_household', {
        p_invite_code: inviteCode,
        p_member_name: memberName,
      })

      if (error) {
        throw error
      }

      await get().loadProfile()
    } finally {
      set({ isSyncing: false })
    }
  },

  updateHouseholdName: async (name) => {
    const household = get().household

    if (!household) {
      return
    }

    set({ isSyncing: true })
    try {
      const { data, error } = await supabase
        .from('households')
        .update({ name })
        .eq('id', household.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      set({ household: data })
    } finally {
      set({ isSyncing: false })
    }
  },

  regenerateInviteCode: async () => {
    const household = get().household

    if (!household) {
      return
    }

    set({ isSyncing: true })
    try {
      const { data, error } = await supabase.rpc('regenerate_invite_code', {
        p_household_id: household.id,
      })

      if (error) {
        throw error
      }

      set({ household: { ...household, invite_code: data } })
    } finally {
      set({ isSyncing: false })
    }
  },

  updateProfile: async (name, avatarColor) => {
    set({ isSyncing: true })
    try {
      const { data, error } = await supabase.rpc('update_member_profile', {
        p_name: name,
        p_avatar_color: avatarColor || avatarColors[0],
      })

      if (error) {
        throw error
      }

      set({ member: data })
      await get().refreshMembers()
    } finally {
      set({ isSyncing: false })
    }
  },

  refreshMembers: async () => {
    const householdId = get().household?.id

    if (!householdId) {
      return
    }

    const { data, error } = await supabase
      .from('members')
      .select('*')
      .eq('household_id', householdId)
      .order('joined_at')

    if (error) {
      throw error
    }

    set({ members: data ?? [] })
  },

  clearLocalState: () => {
    set({
      session: null,
      user: null,
      household: null,
      member: null,
      members: [],
      isLoading: false,
      isSyncing: false,
    })
  },
}))
