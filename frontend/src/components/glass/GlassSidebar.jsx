import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/app/dashboard', label: 'DASHBOARD' },
  { to: '/app/analyze', label: 'ANALYZE' },
  { to: '/app/history', label: 'HISTORY' },
  { to: '/app/batch', label: 'BATCH ANALYSIS' },
  { to: '/app/analytics', label: 'ANALYTICS' },
  { to: '/app/model-performance', label: 'MODEL PERFORMANCE' },
  { to: '/app/feedback', label: 'FEEDBACK' },
  { to: '/app/settings', label: 'SETTINGS' },
]

export default function GlassSidebar({ isAdmin, open, onClose }) {
  const items = isAdmin ? [...NAV_ITEMS, { to: '/app/admin', label: 'ADMIN' }] : NAV_ITEMS

  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}
      <nav className={`sidebar mono ${open ? 'sidebar--open' : ''}`} aria-label="Views">
        <NavLink to="/app/dashboard" className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="sidebar-brand-title">SPAMSHIELD</p>
            <p className="sidebar-brand-subtitle">AI MESSAGE SECURITY</p>
          </div>
        </NavLink>
        <ul className="sidebar-nav">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
                onClick={onClose}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
