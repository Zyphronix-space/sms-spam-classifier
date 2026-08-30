import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { loadLocalHistory, clearLocalHistory } from '../lib/localHistory'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function ScanHistory({ user, refreshKey }) {
  const [scans, setScans] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setSelected(null)
    if (user) {
      setLoading(true)
      setError(null)
      api
        .scans()
        .then((data) => !cancelled && setScans(data))
        .catch(() => !cancelled && setError('Could not load account history.'))
        .finally(() => !cancelled && setLoading(false))
    } else {
      setScans(loadLocalHistory())
    }
    return () => {
      cancelled = true
    }
  }, [user, refreshKey])

  const handleClear = async () => {
    if (user) {
      try {
        await api.clearScans()
        setScans([])
      } catch {
        setError('Could not clear account history.')
      }
    } else {
      clearLocalHistory()
      setScans([])
    }
    setSelected(null)
  }

  return (
    <section className="panel history" aria-labelledby="history-heading">
      <div className="panel-header">
        <h2 id="history-heading" className="panel-title mono">
          {user ? 'ACCOUNT HISTORY' : 'LOCAL HISTORY'}
        </h2>
        <button type="button" className="btn-ghost mono" onClick={handleClear} disabled={scans.length === 0}>
          CLEAR HISTORY
        </button>
      </div>
      <p className="text-faint mono">
        {user ? 'PERSISTED IN POSTGRESQL FOR YOUR ACCOUNT' : 'STORED ONLY IN THIS BROWSER (LOCALSTORAGE)'}
      </p>

      {error && <p className="error-text mono">{error}</p>}
      {loading && <p className="text-muted mono">LOADING…</p>}

      {!loading && scans.length === 0 ? (
        <p className="text-muted mono">NO SCANS YET</p>
      ) : (
        <ol className="history-list mono">
          {scans.map((scan, i) => (
            <li key={scan.id}>
              <button type="button" className="history-row" onClick={() => setSelected(scan)}>
                <span className="history-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="history-preview">{scan.preview || '(message not stored — see privacy notes)'}</span>
                <span className={scan.classification === 'spam' ? 'text-accent' : 'text-success'}>
                  {scan.classification.toUpperCase()} {(scan.spam_probability * 100).toFixed(1)}%
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}

      {selected && (
        <div className="history-detail mono">
          <p className="panel-subtitle mono">SCAN DETAIL</p>
          <p>CLASSIFICATION: {selected.classification.toUpperCase()}</p>
          <p>SPAM PROBABILITY: {(selected.spam_probability * 100).toFixed(2)}%</p>
          <p>TIMESTAMP: {formatTime(selected.created_at)}</p>
          <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
            CLOSE
          </button>
        </div>
      )}
    </section>
  )
}
