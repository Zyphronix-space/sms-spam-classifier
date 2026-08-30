import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { loadLocalHistory, computeStats } from '../lib/localHistory'

function Meter({ pct }) {
  const filled = Math.round(pct / 10)
  return (
    <span className="mono meter">
      {'█'.repeat(filled)}
      {'░'.repeat(10 - filled)}
    </span>
  )
}

export default function Statistics({ user, refreshKey }) {
  const [accountStats, setAccountStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    setError(null)
    api
      .stats()
      .then((s) => !cancelled && setAccountStats(s))
      .catch(() => !cancelled && setError('Could not load statistics.'))
    api
      .scans()
      .then((s) => !cancelled && setRecent(s.slice(0, 5)))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user, refreshKey])

  if (user) {
    if (error) {
      return (
        <section className="panel">
          <p className="error-text mono">{error}</p>
        </section>
      )
    }
    if (!accountStats) {
      return (
        <section className="panel">
          <p className="text-muted mono">LOADING…</p>
        </section>
      )
    }
    return (
      <section className="panel stats" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="panel-title mono">
          WELCOME BACK
        </h2>
        <p className="text-faint mono">YOUR ACTIVITY · LIVE FROM POSTGRESQL</p>

        <div className="stats-grid mono">
          <div>
            <span className="metric-label">TOTAL SCANS</span>
            <span className="metric-value">{accountStats.total_scans}</span>
          </div>
          <div>
            <span className="metric-label">SPAM</span>
            <span className="metric-value">{accountStats.spam}</span>
          </div>
          <div>
            <span className="metric-label">HAM</span>
            <span className="metric-value">{accountStats.ham}</span>
          </div>
        </div>

        <div className="stats-row mono">
          <span>SPAM RATE</span>
          <Meter pct={accountStats.spam_rate} />
          <span>{accountStats.spam_rate.toFixed(1)}%</span>
        </div>
        <p className="mono">AVG SPAM SCORE: {accountStats.avg_spam_score.toFixed(1)}%</p>

        <div className="divider" />
        <p className="panel-subtitle mono">RECENT ANALYSIS</p>
        {recent.length === 0 ? (
          <p className="text-muted mono">NO SCANS YET</p>
        ) : (
          <ul className="mono recent-list">
            {recent.map((r) => (
              <li key={r.id} className={r.classification === 'spam' ? 'text-accent' : 'text-success'}>
                {r.classification.toUpperCase()} {(r.spam_probability * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  const local = computeStats(loadLocalHistory())
  return (
    <section className="panel stats" aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="panel-title mono">
        LOCAL SCAN STATISTICS
      </h2>
      <p className="text-faint mono">LOCAL SCANS · STORED ONLY IN THIS BROWSER, NOT DATASET STATISTICS</p>

      <div className="stats-grid mono">
        <div>
          <span className="metric-label">TOTAL SCANS</span>
          <span className="metric-value">{local.total}</span>
        </div>
        <div>
          <span className="metric-label">SPAM</span>
          <span className="metric-value">{local.spam}</span>
        </div>
        <div>
          <span className="metric-label">HAM</span>
          <span className="metric-value">{local.ham}</span>
        </div>
      </div>

      <div className="stats-row mono">
        <span>SPAM RATE</span>
        <Meter pct={local.spamRate} />
        <span>{local.spamRate.toFixed(1)}%</span>
      </div>
      <p className="mono">AVG SPAM SCORE: {local.avgScore.toFixed(1)}%</p>
    </section>
  )
}
