const THEME_LABELS = { system: 'SYSTEM', dark: 'DARK', light: 'LIGHT' }

function StatusDot({ ok }) {
  return <span className={`status-dot ${ok ? 'status-dot--ok' : 'status-dot--down'}`} aria-hidden="true" />
}

// Used only inside the authenticated app shell (AppLayout) — a session is
// always present there, guarded by RequireAuth.
export default function Header({ theme, onCycleTheme, health, user, onLogout, onToggleSidebar }) {
  const online = health?.gateway === 'online'

  return (
    <header className="header">
      <div className="header-top">
        <button
          type="button"
          className="sidebar-toggle mono"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <div className="header-controls">
          <span className="online-indicator mono">
            <StatusDot ok={online} />
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
          <button type="button" className="theme-toggle mono" onClick={onCycleTheme} aria-label="Cycle color theme">
            {THEME_LABELS[theme]}
          </button>
          <div className="account-controls mono">
            <span className="account-email">{user.email}</span>
            <button type="button" onClick={onLogout}>
              LOG OUT
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
