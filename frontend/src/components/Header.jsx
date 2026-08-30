const TABS = [
  { id: 'scanner', label: 'SCANNER' },
  { id: 'batch', label: 'BATCH' },
  { id: 'history', label: 'HISTORY' },
  { id: 'stats', label: 'STATS' },
  { id: 'model', label: 'MODEL LAB' },
]

const THEME_LABELS = { system: 'SYSTEM', dark: 'DARK', light: 'LIGHT' }

function StatusDot({ ok }) {
  return <span className={`status-dot ${ok ? 'status-dot--ok' : 'status-dot--down'}`} aria-hidden="true" />
}

export default function Header({ theme, onCycleTheme, health, user, onLogout, onOpenAuth, activeTab, onChangeTab }) {
  const online = health?.gateway === 'online'
  const tabs = user?.is_admin ? [...TABS, { id: 'admin', label: 'ADMIN' }] : TABS

  return (
    <header className="header">
      <div className="header-top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>SMS / CLASSIFIER</h1>
            <p className="brand-subtitle mono">MESSAGE THREAT ANALYSIS</p>
          </div>
        </div>
        <div className="header-controls">
          <span className="online-indicator mono">
            <StatusDot ok={online} />
            {online ? 'ONLINE' : 'OFFLINE'}
          </span>
          <button type="button" className="theme-toggle mono" onClick={onCycleTheme} aria-label="Cycle color theme">
            {THEME_LABELS[theme]}
          </button>
          {user ? (
            <div className="account-controls mono">
              <span className="account-email">{user.email}</span>
              <button type="button" onClick={onLogout}>
                LOG OUT
              </button>
            </div>
          ) : (
            <div className="account-controls mono">
              <button type="button" onClick={() => onOpenAuth('login')}>
                LOG IN
              </button>
              <button type="button" className="btn-primary" onClick={() => onOpenAuth('register')}>
                REGISTER
              </button>
            </div>
          )}
        </div>
      </div>
      <nav className="tabs mono" aria-label="Views">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
            onClick={() => onChangeTab(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
