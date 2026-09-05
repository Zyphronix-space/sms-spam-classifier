import GlassCard from '../../components/glass/GlassCard'

const FEATURES = [
  {
    icon: '⚡',
    title: 'Instant analysis',
    body: 'Paste any message and get a classification back from the same TF-IDF + Multinomial Naive Bayes model every time — one inference path, no duplicated logic.',
  },
  {
    icon: '⇅',
    title: 'CSV batch scanning',
    body: 'Upload up to 500 rows at once. Each row is validated, classified, and saved, then summarized as totals and an exportable CSV.',
  },
  {
    icon: '🕘',
    title: 'Searchable history',
    body: 'Every analyzed message is saved to your account — search, filter by spam/ham, sort, and drill into full prediction history.',
  },
  {
    icon: '⟲',
    title: 'Feedback loop',
    body: "Tell SpamShield when a call was wrong and what it should have been. It's tracked for analysis — never silently used to retrain the production model.",
  },
  {
    icon: '📊',
    title: 'Real analytics',
    body: 'Spam/ham distribution, detection volume over time, and feedback accuracy — computed from your actual usage, never simulated.',
  },
  {
    icon: '🛡',
    title: 'Model transparency',
    body: 'Accuracy, precision, recall, F1, and a full confusion matrix, straight from the evaluation run — plus how the pipeline actually works.',
  },
]

export default function Features() {
  return (
    <section className="section">
      <h1 className="section-title">Everything the platform actually does</h1>
      <p className="section-subtitle">No placeholder features — every card below maps to a real, working page.</p>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <GlassCard key={f.title}>
            <div className="feature-icon" aria-hidden="true">
              {f.icon}
            </div>
            <p className="panel-title mono">{f.title.toUpperCase()}</p>
            <p className="text-muted">{f.body}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  )
}
