import { useEffect, useState } from 'react'
import { api } from '../lib/api'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function FeedbackPage({ user, refreshKey, onOpenMessage }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    api
      .listFeedback()
      .then(setItems)
      .catch(() => setError('Could not load feedback history.'))
      .finally(() => setLoading(false))
  }, [user, refreshKey])

  if (!user) {
    return (
      <section className="panel empty-state" aria-labelledby="feedback-heading">
        <h2 id="feedback-heading" className="panel-title mono">
          FEEDBACK
        </h2>
        <p className="text-muted mono">SIGN IN REQUIRED</p>
        <p className="text-faint">Log in to see feedback you've given on past predictions.</p>
      </section>
    )
  }

  return (
    <section className="panel" aria-labelledby="feedback-heading">
      <h2 id="feedback-heading" className="panel-title mono">
        FEEDBACK
      </h2>
      <p className="text-faint mono">CORRECTIONS YOU'VE SUBMITTED ON PAST PREDICTIONS</p>

      {error && <p className="error-text mono">{error}</p>}
      {loading && <p className="text-muted mono">LOADING…</p>}

      {!loading && items.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted mono">NO FEEDBACK YET</p>
          <p className="text-faint">Rate a prediction as correct or incorrect from the Classifier or Message History pages.</p>
        </div>
      ) : (
        <ol className="history-list mono">
          {items.map((f, i) => (
            <li key={f.id}>
              <button type="button" className="history-row" onClick={() => onOpenMessage?.(f.message_id)}>
                <span className="history-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="history-preview">{formatTime(f.created_at)}</span>
                <span className={f.is_correct ? 'text-success' : 'text-accent'}>
                  {f.is_correct ? 'MARKED CORRECT' : `MARKED INCORRECT — ACTUAL: ${f.actual_classification?.toUpperCase()}`}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
