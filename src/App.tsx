import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { BillsPage } from './pages/BillsPage'
import { DashboardPage } from './pages/DashboardPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { GymPage } from './pages/GymPage'
import { InventoryPage } from './pages/InventoryPage'
import { JoinPage } from './pages/JoinPage'
import { LoginPage } from './pages/LoginPage'
import { MembersPage } from './pages/MembersPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/gym" element={<GymPage />} />
          <Route path="/bills" element={<BillsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
