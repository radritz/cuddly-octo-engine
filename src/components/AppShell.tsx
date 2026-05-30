import {
  Bell,
  Dumbbell,
  Home,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Search,
  Settings,
  Users,
  WalletCards,
  Archive,
} from 'lucide-react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router'
import { useAuthBootstrap } from '../hooks/useAuthBootstrap'
import { useHouseholdData } from '../hooks/useHouseholdData'
import { useRealtime } from '../hooks/useRealtime'
import { clearAllStores } from '../lib/reset'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useBillStore } from '../stores/billStore'
import { useExpenseStore } from '../stores/expenseStore'
import { useInventoryStore } from '../stores/inventoryStore'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { ToastHost } from './ToastHost'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Archive },
  { to: '/gym', label: 'Gym Pantry', icon: Dumbbell },
  { to: '/bills', label: 'Bills', icon: WalletCards },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const mobileNavItems = navItems.filter((item) =>
  ['/dashboard', '/inventory', '/expenses', '/bills'].includes(item.to),
)

export function AppShell() {
  useAuthBootstrap()
  useHouseholdData()

  const location = useLocation()
  const initialized = useAuthStore((state) => state.initialized)
  const isLoading = useAuthStore((state) => state.isLoading)
  const session = useAuthStore((state) => state.session)
  const household = useAuthStore((state) => state.household)
  const member = useAuthStore((state) => state.member)
  const authSyncing = useAuthStore((state) => state.isSyncing)
  const signOut = useAuthStore((state) => state.signOut)
  const inventorySyncing = useInventoryStore((state) => state.isSyncing)
  const expenseSyncing = useExpenseStore((state) => state.isSyncing)
  const billSyncing = useBillStore((state) => state.isSyncing)

  useRealtime(household?.id)

  if (!isSupabaseConfigured) {
    return (
      <div className="grid min-h-svh place-items-center bg-surface p-6">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-card">
          <h1 className="text-2xl font-medium text-ink">Configure Supabase</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env
            before using HomeOS.
          </p>
        </div>
      </div>
    )
  }

  if (!initialized || isLoading) {
    return (
      <div className="grid min-h-svh place-items-center bg-surface text-primary">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-100 border-t-primary" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!household || !member) {
    return <Navigate to="/join" replace />
  }

  if (!member.is_active) {
    return (
      <div className="grid min-h-svh place-items-center bg-surface p-6">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-card">
          <h1 className="text-2xl font-medium text-ink">Access paused</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Your member profile is inactive. Ask a household admin to restore
            access or settle the open balance manually.
          </p>
          <Button
            className="mt-6"
            icon={<LogOut size={18} />}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  const isSyncing = authSyncing || inventorySyncing || expenseSyncing || billSyncing

  return (
    <div className="min-h-svh bg-surface text-ink">
      <ToastHost />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-outline bg-white py-6 md:flex">
        <div className="mb-8 flex items-center gap-3 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-white">
            <Home size={22} />
          </div>
          <div>
            <p className="text-xl font-medium text-primary">HomeOS</p>
            <p className="text-xs text-ink-muted">Private household</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                [
                  'mx-2 flex min-h-11 items-center gap-3 rounded-full px-4 text-sm font-medium transition',
                  isActive
                    ? 'border-l-[3px] border-primary bg-indigo-50 text-primary'
                    : 'text-ink-muted hover:bg-surface-muted',
                ].join(' ')
              }
              key={item.to}
              to={item.to}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="mx-4 flex items-center gap-3 rounded-full px-4 py-3 text-left transition hover:bg-surface-muted"
          onClick={async () => {
            await signOut()
            clearAllStores()
          }}
          type="button"
        >
          <Avatar member={member} size="sm" />
          <span className="grid">
            <span className="text-sm font-medium text-ink">{member.name}</span>
            <span className="text-xs text-ink-muted">Sign out</span>
          </span>
        </button>
      </aside>

      <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-outline bg-surface/95 px-6 backdrop-blur md:hidden">
        <p className="text-4xl font-medium text-primary">HomeOS</p>
        <div className="flex items-center gap-3 text-primary">
          <Bell size={22} />
          <Search size={24} />
          <Avatar member={member} size="sm" />
        </div>
      </header>

      {isSyncing ? (
        <div className="fixed right-4 top-24 z-40 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-medium text-primary shadow-card md:top-4">
          syncing...
        </div>
      ) : null}

      <main className="min-h-svh pb-24 md:ml-60 md:pb-0">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 p-6">
          <Outlet />
        </div>
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-outline bg-white px-2 pt-2 md:hidden">
        {mobileNavItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              [
                'tap-highlight-none grid place-items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium',
                isActive ? 'text-primary' : 'text-gray-700',
              ].join(' ')
            }
            key={item.to}
            to={item.to}
          >
            {({ isActive }) => (
              <>
                <item.icon size={24} />
                <span>{item.label === 'Dashboard' ? 'Home' : item.label}</span>
                <span
                  className={[
                    'h-1 w-1 rounded-full',
                    isActive ? 'bg-primary' : 'bg-transparent',
                  ].join(' ')}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
