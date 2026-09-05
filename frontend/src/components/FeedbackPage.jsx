import { useEffect, useState } from 'react'
import { api } from '../lib/api'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

// Always rendered behind RequireAuth (see lib/session.jsx).
export default function FeedbackPage({ refreshKey, onOpenMessage }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    api
      .listFeedback()
      .then(setItems)
      .catch(() => setError('Could not load feedback history.'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  const correct = items.filter((f) => f.is_correct).length
  const incorrect = items.length - correct
  const accuracy = items.length ? ((correct / items.length) * 100).toFixed(1) : null

  return (
    <div className="layout-main">
      <section className="panel" aria-labelledby="feedback-analytics-heading">
        <h2 id="feedback-analytics-heading" className="panel-title mono">
          FEEDBACK ANALYTICS
        </h2>
        <p className="text-faint mono">COMPUTED FROM YOUR SUBMITTED FEEDBACK — NOT USED TO RETRAIN THE MODEL</p>
        <div className="stats-grid mono">
          <div>
            <span className="metric-label">TOTAL FEEDBACK</span>
            <span className="metric-value">{items.length}</span>
          </div>
          <div>
            <span className="metric-label">MARKED CORRECT</span>
            <span className="metric-value text-success">{correct}</span>
          </div>
          <div>
            <span className="metric-label">MARKED INCORRECT</span>
            <span className="metric-value text-danger">{incorrect}</span>
          </div>
        </div>
        {accuracy !== null && <p className="mono">SELF-REPORTED ACCURACY: {accuracy}%</p>}
      </section>

      <section className="panel" aria-labelledby="feedback-heading">
        <h2 id="feedback-heading" className="panel-title mono">
          FEEDBACK HISTORY
        </h2>
        <p className="text-faint mono">CORRECTIONS YOU'VE SUBMITTED ON PAST PREDICTIONS</p>

        {error && <p className="error-text mono">{error}</p>}
        {loading && <p className="text-muted mono">LOADING…</p>}

        {!loading && items.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted mono">NO FEEDBACK YET</p>
            <p className="text-faint">Rate a prediction as correct or incorrect from the Analyze or History pages.</p>
          </div>
        ) : (
          <ol className="history-list mono">
            {items.map((f, i) => (
              <li key={f.id}>
                <button type="button" className="history-row" onClick={() => onOpenMessage?.(f.message_id)}>
                  <span className="history-index">{String(i + 1).padStart(2, '0')}</span>
                  <span className="history-preview">{formatTime(f.created_at)}</span>
                  <span className={f.is_correct ? 'text-success' : 'text-danger'}>
                    {f.is_correct ? 'MARKED CORRECT' : `MARKED INCORRECT — ACTUAL: ${f.actual_classification?.toUpperCase()}`}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
