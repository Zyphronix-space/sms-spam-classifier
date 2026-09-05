// A single stat tile — real values only, never a placeholder number. Pass
// `tone="danger"` for spam-related counts, `tone="success"` for ham/safe
// counts, leave it unset for neutral metrics.
export default function GlassMetric({ label, value, hint, tone }) {
  const toneClass = tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : ''
  return (
    <div className="glass-metric">
      <span className="glass-metric-label mono">{label}</span>
      <span className={`glass-metric-value mono ${toneClass}`}>{value}</span>
      {hint && <span className="glass-metric-hint">{hint}</span>}
    </div>
  )
}
