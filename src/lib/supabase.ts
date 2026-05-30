import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabasePublishableKey ?? 'placeholder-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
)

export function requireSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY first.',
    )
  }
}
