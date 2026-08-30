import { useEffect, useState } from 'react'
import { api } from '../lib/api'

function DistBar({ pct, tone }) {
  return (
    <div className="dist-bar" aria-hidden="true">
      <div className={`dist-bar-fill dist-bar-fill--${tone}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function ModelLab() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    api
      .model()
      .then((res) => !cancelled && setData(res))
      .catch(() => !cancelled && setError('Could not load model information.'))
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <section className="panel">
        <p className="error-text mono">{error}</p>
      </section>
    )
  }
  if (!data || !data.evaluation) {
    return (
      <section className="panel">
        <p className="text-muted mono">LOADING MODEL METRICS…</p>
      </section>
    )
  }

  const { evaluation, comparison } = data
  const { metrics, confusion_matrix: cm, dataset } = evaluation
  const hamPct = (dataset.ham / dataset.total) * 100
  const spamPct = (dataset.spam / dataset.total) * 100
  const modelDisplayName = evaluation.model_name === 'MultinomialNB' ? 'MULTINOMIAL NAIVE BAYES' : evaluation.model_name

  return (
    <section className="panel model-lab" aria-labelledby="model-heading">
      <h2 id="model-heading" className="panel-title mono">
        MODEL LAB
      </h2>

      <p className="panel-subtitle mono">CURRENT MODEL</p>
      <p className="model-name mono">{modelDisplayName}</p>
      <p className="text-muted mono">TF-IDF FEATURES · TRAINED {new Date(evaluation.trained_at).toLocaleDateString()}</p>

      <div className="metric-grid mono">
        <div>
          <span className="metric-label">ACCURACY</span>
          <span className="metric-value">{(metrics.accuracy * 100).toFixed(2)}%</span>
        </div>
        <div>
          <span className="metric-label">PRECISION</span>
          <span className="metric-value">{(metrics.precision * 100).toFixed(2)}%</span>
        </div>
        <div>
          <span className="metric-label">RECALL</span>
          <span className="metric-value">{(metrics.recall * 100).toFixed(2)}%</span>
        </div>
        <div>
          <span className="metric-label">SPAM F1</span>
          <span className="metric-value">{(metrics.f1 * 100).toFixed(2)}%</span>
        </div>
      </div>

      <div className="divider" />

      {comparison && (
        <>
          <p className="panel-subtitle mono">MODEL BENCHMARK</p>
          <div className="table-scroll">
            <table className="benchmark-table mono">
              <thead>
                <tr>
                  <th>MODEL</th>
                  <th>ACCURACY</th>
                  <th>SPAM F1</th>
                </tr>
              </thead>
              <tbody>
                {comparison.results.map((r) => (
                  <tr key={r.model} className={r.model === comparison.selected_model ? 'benchmark-row--selected' : ''}>
                    <td>{r.model.toUpperCase()}</td>
                    <td>{(r.accuracy * 100).toFixed(2)}%</td>
                    <td>{(r.f1_spam * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mono">SELECTED MODEL: {comparison.selected_model.toUpperCase()}</p>
          <p className="text-faint">{comparison.selection_note}</p>
          <p className="text-faint">
            F1 matters here — not just accuracy — because the dataset is imbalanced (~
            {((dataset.ham / dataset.total) * 100).toFixed(0)}% ham / ~{((dataset.spam / dataset.total) * 100).toFixed(0)}% spam):
            a model can score high accuracy while still missing most spam.
          </p>
          <div className="divider" />
        </>
      )}

      <p className="panel-subtitle mono">CONFUSION MATRIX</p>
      <div className="table-scroll">
        <table className="confusion-table mono">
          <thead>
            <tr>
              <th />
              <th colSpan={2}>PREDICTED</th>
            </tr>
            <tr>
              <th />
              <th>HAM</th>
              <th>SPAM</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>ACTUAL HAM</th>
              <td>{cm.matrix[0][0]}</td>
              <td>{cm.matrix[0][1]}</td>
            </tr>
            <tr>
              <th>ACTUAL SPAM</th>
              <td>{cm.matrix[1][0]}</td>
              <td>{cm.matrix[1][1]}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="divider" />

      <p className="panel-subtitle mono">DATASET</p>
      <p className="model-name mono">{dataset.total.toLocaleString()} MESSAGES</p>
      <div className="dist-row mono">
        <span>
          HAM {dataset.ham.toLocaleString()} ({hamPct.toFixed(1)}%)
        </span>
        <DistBar pct={hamPct} tone="ham" />
      </div>
      <div className="dist-row mono">
        <span>
          SPAM {dataset.spam.toLocaleString()} ({spamPct.toFixed(1)}%)
        </span>
        <DistBar pct={spamPct} tone="spam" />
      </div>
      <p className="text-faint">UCI SMS Spam Collection — the full dataset, not just the test split.</p>

      <div className="divider" />

      <button type="button" className="btn-ghost mono" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        {expanded ? 'HIDE TECHNICAL DETAILS' : 'SHOW TECHNICAL DETAILS'}
      </button>
      {expanded && (
        <dl className="tech-details mono">
          <div>
            <dt>DATASET</dt>
            <dd>UCI SMS Spam Collection</dd>
          </div>
          <div>
            <dt>MESSAGES</dt>
            <dd>{dataset.total.toLocaleString()}</dd>
          </div>
          <div>
            <dt>FEATURES</dt>
            <dd>TF-IDF</dd>
          </div>
          <div>
            <dt>MODEL</dt>
            <dd>Multinomial Naive Bayes</dd>
          </div>
          <div>
            <dt>ALTERNATIVE</dt>
            <dd>Logistic Regression</dd>
          </div>
          <div>
            <dt>API</dt>
            <dd>FastAPI</dd>
          </div>
          <div>
            <dt>GATEWAY</dt>
            <dd>Ballerina</dd>
          </div>
          <div>
            <dt>FRONTEND</dt>
            <dd>React + Vite</dd>
          </div>
          <div>
            <dt>PERSISTENCE</dt>
            <dd>PostgreSQL</dd>
          </div>
          <div>
            <dt>INFERENCE</dt>
            <dd>Local model artifacts</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
