import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import GlassCard from '../../components/glass/GlassCard'
import GlassMetric from '../../components/glass/GlassMetric'
import GlassButton from '../../components/glass/GlassButton'

// Every number here comes from ml/evaluation.json via GET /model — no
// invented stats, same discipline as the rest of the app.
export default function Landing() {
  const [evaluation, setEvaluation] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .model()
      .then((m) => !cancelled && setEvaluation(m.evaluation))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section className="hero">
        <p className="hero-eyebrow mono">AI-POWERED MESSAGE SECURITY</p>
        <h1 className="hero-title">Stop spam before it reaches your inbox.</h1>
        <p className="hero-subtitle">
          SpamShield classifies SMS text in real time using a TF-IDF + Multinomial Naive Bayes
          model trained on the UCI SMS Spam Collection — with a searchable history, CSV batch
          scanning, and a feedback loop to track how the model is really doing.
        </p>
        <div className="hero-actions">
          <Link to="/signup">
            <GlassButton variant="primary">GET STARTED — IT'S FREE</GlassButton>
          </Link>
          <Link to="/features">
            <GlassButton variant="ghost">SEE HOW IT WORKS</GlassButton>
          </Link>
        </div>

        {evaluation && (
          <div className="hero-stats">
            <GlassCard>
              <GlassMetric label="TRAINING ACCURACY" value={`${(evaluation.metrics.accuracy * 100).toFixed(1)}%`} />
            </GlassCard>
            <GlassCard>
              <GlassMetric label="SPAM PRECISION" value={`${(evaluation.metrics.precision * 100).toFixed(0)}%`} />
            </GlassCard>
            <GlassCard>
              <GlassMetric label="MESSAGES IN DATASET" value={evaluation.dataset.total.toLocaleString()} />
            </GlassCard>
          </div>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">A real detection pipeline, not a black box</h2>
        <p className="section-subtitle">
          Every classification comes from the same model, end to end — no fabricated confidence
          scores, no invented explanations.
        </p>
        <div className="feature-grid">
          <GlassCard>
            <div className="feature-icon" aria-hidden="true">
              ✎
            </div>
            <p className="panel-title mono">TF-IDF FEATURES</p>
            <p className="text-muted">Message text is converted to term-frequency vectors before it ever reaches the model.</p>
          </GlassCard>
          <GlassCard>
            <div className="feature-icon" aria-hidden="true">
              Σ
            </div>
            <p className="panel-title mono">NAIVE BAYES</p>
            <p className="text-muted">A Multinomial Naive Bayes classifier, evaluated with real accuracy/precision/recall/F1.</p>
          </GlassCard>
          <GlassCard>
            <div className="feature-icon" aria-hidden="true">
              ⇅
            </div>
            <p className="panel-title mono">BATCH ANALYSIS</p>
            <p className="text-muted">Upload a CSV of messages and get spam/ham results for every row, exportable as CSV.</p>
          </GlassCard>
          <GlassCard>
            <div className="feature-icon" aria-hidden="true">
              ⟲
            </div>
            <p className="panel-title mono">FEEDBACK LOOP</p>
            <p className="text-muted">Flag a wrong call and record what it should have been — tracked, never silently auto-applied.</p>
          </GlassCard>
        </div>
      </section>
    </>
  )
}
