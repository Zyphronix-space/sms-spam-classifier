const NAV_ITEMS = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'scanner', label: 'CLASSIFIER' },
  { id: 'history', label: 'MESSAGE HISTORY' },
  { id: 'batch', label: 'BATCH SCAN' },
  { id: 'model', label: 'ANALYTICS' },
  { id: 'feedback', label: 'FEEDBACK' },
]

export default function Sidebar({ activeTab, onChangeTab, isAdmin, open, onClose }) {
  const items = isAdmin ? [...NAV_ITEMS, { id: 'admin', label: 'ADMIN' }] : NAV_ITEMS

  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}
      <nav className={`sidebar mono ${open ? 'sidebar--open' : ''}`} aria-label="Views">
        <div className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="sidebar-brand-title">SMS / CLASSIFIER</p>
            <p className="sidebar-brand-subtitle">THREAT DETECTION PLATFORM</p>
          </div>
        </div>
        <ul className="sidebar-nav">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`sidebar-link ${activeTab === item.id ? 'sidebar-link--active' : ''}`}
                onClick={() => {
                  onChangeTab(item.id)
                  onClose?.()
                }}
                aria-current={activeTab === item.id ? 'page' : undefined}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
