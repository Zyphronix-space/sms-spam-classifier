import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../lib/api'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function Dashboard({ refreshKey, onOpenMessage }) {
  const [data, setData] = useState(null)
  const [modelData, setModelData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([api.dashboard(), api.model()])
      .then(([d, m]) => {
        if (cancelled) return
        setData(d)
        setModelData(m)
      })
      .catch(() => !cancelled && setError('Could not load dashboard data.'))
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (error) {
    return (
      <section className="panel empty-state">
        <p className="error-text mono">{error}</p>
      </section>
    )
  }
  if (!data) {
    return (
      <section className="panel">
        <p className="text-muted mono">LOADING DASHBOARD…</p>
      </section>
    )
  }

  if (data.total_messages === 0) {
    return (
      <section className="panel empty-state" aria-labelledby="dashboard-heading">
        <h2 id="dashboard-heading" className="panel-title mono">
          DASHBOARD
        </h2>
        <p className="text-muted mono">NO MESSAGES YET</p>
        <p className="text-faint">Classify a message to start building your dashboard.</p>
      </section>
    )
  }

  const pieData = [
    { name: 'SPAM', value: data.spam_count },
    { name: 'HAM', value: data.ham_count },
  ]
  const metrics = modelData?.evaluation?.metrics
  const metricsBarData = metrics
    ? [
        { name: 'ACCURACY', value: Math.round(metrics.accuracy * 100) },
        { name: 'PRECISION', value: Math.round(metrics.precision * 100) },
        { name: 'RECALL', value: Math.round(metrics.recall * 100) },
        { name: 'F1', value: Math.round(metrics.f1 * 100) },
      ]
    : []

  return (
    <div className="dashboard-grid">
      <section className="panel" aria-labelledby="dashboard-heading">
        <h2 id="dashboard-heading" className="panel-title mono">
          DASHBOARD
        </h2>
        <p className="text-faint mono">YOUR ACTIVITY · LIVE FROM POSTGRESQL</p>
        <div className="stats-grid mono">
          <div>
            <span className="metric-label">TOTAL MESSAGES</span>
            <span className="metric-value">{data.total_messages}</span>
          </div>
          <div>
            <span className="metric-label">SPAM</span>
            <span className="metric-value text-accent">{data.spam_count}</span>
          </div>
          <div>
            <span className="metric-label">LEGITIMATE</span>
            <span className="metric-value text-success">{data.ham_count}</span>
          </div>
        </div>
        <p className="mono">SPAM PERCENTAGE: {data.spam_percentage.toFixed(1)}%</p>
      </section>

      <section className="panel chart-panel" aria-labelledby="spam-split-heading">
        <h2 id="spam-split-heading" className="panel-subtitle mono">
          SPAM VS LEGITIMATE
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              <Cell fill="var(--accent)" />
              <Cell fill="var(--success)" />
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </section>

      <section className="panel chart-panel" aria-labelledby="time-series-heading">
        <h2 id="time-series-heading" className="panel-subtitle mono">
          PREDICTIONS OVER TIME · LAST 30 DAYS
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data.predictions_over_time}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="var(--text-faint)" tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--text-faint)" allowDecimals={false} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }} />
            <Line type="monotone" dataKey="spam" stroke="var(--accent)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ham" stroke="var(--success)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {metricsBarData.length > 0 && (
        <section className="panel chart-panel" aria-labelledby="model-perf-heading">
          <h2 id="model-perf-heading" className="panel-subtitle mono">
            MODEL PERFORMANCE SNAPSHOT
          </h2>
          <p className="text-faint">Training/test metrics from ml/evaluation.json — not this account's live predictions.</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={metricsBarData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--text-faint)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--text-faint)" domain={[0, 100]} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--text)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="panel" aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="panel-subtitle mono">
          RECENT PREDICTIONS
        </h2>
        <ol className="history-list mono">
          {data.recent_predictions.map((r, i) => (
            <li key={r.id}>
              <button type="button" className="history-row" onClick={() => onOpenMessage?.(r.id)}>
                <span className="history-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="history-preview">
                  {r.message} · {formatTime(r.created_at)}
                </span>
                <span className={r.classification === 'spam' ? 'text-accent' : 'text-success'}>
                  {r.classification.toUpperCase()} {(r.spam_probability * 100).toFixed(1)}%
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
