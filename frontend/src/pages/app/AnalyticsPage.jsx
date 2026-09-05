import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import GlassCard from '../../components/glass/GlassCard'
import GlassMetric from '../../components/glass/GlassMetric'
import { ResponsiveContainer, glassTooltipStyle, glassAxisTick, glassAxisColor, glassGridColor } from '../../components/glass/GlassChart'

// Everything here is derived from GET /dashboard (spam/ham counts, 30-day
// daily series) and GET /feedback (correct/incorrect) — no separate
// backend endpoint, and no invented numbers.
function toWeeklyBuckets(daily) {
  const weeks = []
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7)
    const spam = chunk.reduce((sum, d) => sum + d.spam, 0)
    const ham = chunk.reduce((sum, d) => sum + d.ham, 0)
    weeks.push({ label: `WK OF ${chunk[0].date.slice(5)}`, spam, ham })
  }
  return weeks
}

export default function AnalyticsPage() {
  const { dataRefreshKey } = useSession()
  const [dashboard, setDashboard] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    Promise.all([api.dashboard(), api.listFeedback()])
      .then(([d, f]) => {
        if (cancelled) return
        setDashboard(d)
        setFeedback(f)
      })
      .catch(() => !cancelled && setError('Could not load analytics.'))
    return () => {
      cancelled = true
    }
  }, [dataRefreshKey])

  const weekly = useMemo(() => (dashboard ? toWeeklyBuckets(dashboard.predictions_over_time) : []), [dashboard])

  if (error) {
    return (
      <section className="panel">
        <p className="error-text mono">{error}</p>
      </section>
    )
  }
  if (!dashboard || !feedback) {
    return (
      <section className="panel">
        <p className="text-muted mono">LOADING ANALYTICS…</p>
      </section>
    )
  }
  if (dashboard.total_messages === 0) {
    return (
      <section className="panel empty-state">
        <p className="panel-title mono">ANALYTICS</p>
        <p className="text-muted mono">NO DATA YET</p>
        <p className="text-faint">Analyze a few messages to start building analytics.</p>
      </section>
    )
  }

  const correct = feedback.filter((f) => f.is_correct).length
  const feedbackAccuracy = feedback.length ? (correct / feedback.length) * 100 : null
  const pieData = [
    { name: 'SPAM', value: dashboard.spam_count },
    { name: 'HAM', value: dashboard.ham_count },
  ]

  return (
    <div className="dashboard-grid">
      <GlassCard title="ANALYTICS" subtitle="YOUR DETECTION ACTIVITY">
        <div className="stats-grid mono">
          <GlassMetric label="TOTAL ANALYZED" value={dashboard.total_messages} />
          <GlassMetric label="SPAM RATE" value={`${dashboard.spam_percentage.toFixed(1)}%`} tone="danger" />
          <GlassMetric
            label="FEEDBACK ACCURACY"
            value={feedbackAccuracy === null ? '—' : `${feedbackAccuracy.toFixed(1)}%`}
            hint={feedbackAccuracy === null ? 'no feedback submitted yet' : `${feedback.length} feedback entries`}
          />
        </div>
      </GlassCard>

      <GlassCard title="SPAM VS HAM DISTRIBUTION" className="chart-panel">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              <Cell fill="var(--danger)" />
              <Cell fill="var(--success)" />
            </Pie>
            <Tooltip contentStyle={glassTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard title="DETECTION VOLUME · LAST 30 DAYS" className="chart-panel">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dashboard.predictions_over_time}>
            <CartesianGrid stroke={glassGridColor} strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={glassAxisTick} stroke={glassAxisColor} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={glassAxisTick} stroke={glassAxisColor} allowDecimals={false} />
            <Tooltip contentStyle={glassTooltipStyle} />
            <Bar dataKey="spam" stackId="a" fill="var(--danger)" />
            <Bar dataKey="ham" stackId="a" fill="var(--success)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard title="WEEKLY ACTIVITY" className="chart-panel">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekly}>
            <CartesianGrid stroke={glassGridColor} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={glassAxisTick} stroke={glassAxisColor} />
            <YAxis tick={glassAxisTick} stroke={glassAxisColor} allowDecimals={false} />
            <Tooltip contentStyle={glassTooltipStyle} />
            <Bar dataKey="spam" stackId="a" fill="var(--danger)" />
            <Bar dataKey="ham" stackId="a" fill="var(--success)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  )
}
