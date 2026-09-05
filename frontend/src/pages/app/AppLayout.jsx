import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import GlassSidebar from '../../components/glass/GlassSidebar'
import Header from '../../components/Header'
import CommandPalette from '../../components/CommandPalette'
import { useTheme } from '../../lib/useTheme'
import { useSession } from '../../lib/session'

export default function AppLayout() {
  const [theme, cycleTheme] = useTheme()
  const { user, health, logout } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <GlassSidebar isAdmin={user?.is_admin} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content">
        <Header
          theme={theme}
          onCycleTheme={cycleTheme}
          health={health}
          user={user}
          onLogout={logout}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
