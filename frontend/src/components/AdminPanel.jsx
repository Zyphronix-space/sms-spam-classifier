import { useEffect, useState } from 'react'
import { api } from '../lib/api'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [scans, setScans] = useState([])
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([api.adminStats(), api.adminUsers(), api.adminScans()])
      .then(([s, u, sc]) => {
        if (cancelled) return
        setStats(s)
        setUsers(u)
        setScans(sc)
      })
      .catch(() => !cancelled && setError('Could not load admin data.'))
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleDeleteUser = async (id, email) => {
    if (!window.confirm(`Delete account ${email}? This removes their scan history too.`)) return
    try {
      await api.adminDeleteUser(id)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err.message || 'Could not delete user.')
    }
  }

  if (error) {
    return (
      <section className="panel">
        <p className="error-text mono">{error}</p>
      </section>
    )
  }
  if (!stats) {
    return (
      <section className="panel">
        <p className="text-muted mono">LOADING ADMIN DATA…</p>
      </section>
    )
  }

  return (
    <div className="layout-main">
      <section className="panel" aria-labelledby="admin-stats-heading">
        <h2 id="admin-stats-heading" className="panel-title mono">
          SYSTEM-WIDE STATISTICS
        </h2>
        <p className="text-faint mono">ACROSS ALL ACCOUNTS · LIVE FROM POSTGRESQL</p>
        <div className="stats-grid mono">
          <div>
            <span className="metric-label">USERS</span>
            <span className="metric-value">{stats.total_users}</span>
          </div>
          <div>
            <span className="metric-label">TOTAL SCANS</span>
            <span className="metric-value">{stats.total_scans}</span>
          </div>
          <div>
            <span className="metric-label">SPAM RATE</span>
            <span className="metric-value">{stats.spam_rate.toFixed(1)}%</span>
          </div>
        </div>
        <p className="mono">
          SPAM {stats.spam} · HAM {stats.ham}
        </p>
      </section>

      <section className="panel" aria-labelledby="admin-users-heading">
        <h2 id="admin-users-heading" className="panel-title mono">
          USERS
        </h2>
        {users.length === 0 ? (
          <p className="text-muted mono">NO USERS YET</p>
        ) : (
          <ol className="admin-user-list mono">
            {users.map((u) => (
              <li key={u.id} className="admin-user-row">
                <span className="admin-user-email">
                  {u.email}
                  {u.is_admin ? ' · ADMIN' : ''}
                </span>
                <span className="text-muted">{u.scan_count} SCANS</span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleDeleteUser(u.id, u.email)}
                  disabled={u.is_admin}
                  title={u.is_admin ? 'Admin accounts cannot be deleted here' : 'Delete account'}
                >
                  DELETE
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel" aria-labelledby="admin-scans-heading">
        <h2 id="admin-scans-heading" className="panel-title mono">
          RECENT SCANS (ALL USERS)
        </h2>
        {scans.length === 0 ? (
          <p className="text-muted mono">NO SCANS YET</p>
        ) : (
          <ol className="history-list mono">
            {scans.slice(0, 30).map((s, i) => (
              <li key={s.id}>
                <div className="history-row" style={{ cursor: 'default' }}>
                  <span className="history-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="history-preview">
                    {s.user_email} · {formatTime(s.created_at)}
                  </span>
                  <span className={s.classification === 'spam' ? 'text-accent' : 'text-success'}>
                    {s.classification.toUpperCase()} {(s.spam_probability * 100).toFixed(1)}%
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
