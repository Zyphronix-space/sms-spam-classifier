import { useEffect, useState } from 'react'
import { analyzePatterns } from '../lib/heuristics'
import FeedbackWidget from './FeedbackWidget'

function interpretation(pct) {
  if (pct < 20) return 'LOW SPAM PROBABILITY'
  if (pct < 50) return 'UNCERTAIN'
  if (pct < 80) return 'ELEVATED'
  return 'HIGH SPAM PROBABILITY'
}

function useAnimatedPercent(target) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const durationMs = 700
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return value
}

export default function ScanResult({ result, message, onCopy, onExport, messageId }) {
  const pct = result.spam_probability * 100
  const animated = useAnimatedPercent(pct)
  const isSpam = result.label === 'spam'
  const indicators = analyzePatterns(message)

  return (
    <section className="panel result" aria-live="polite">
      <p className="panel-title mono">SPAM PROBABILITY</p>

      <div className={`result-figure ${isSpam ? 'result-figure--spam' : 'result-figure--ham'}`}>
        <span className="result-percent mono">{animated.toFixed(2)}%</span>
        <div className="result-bar" role="img" aria-label={`${pct.toFixed(2)} percent spam probability`}>
          <div className="result-bar-fill" style={{ width: `${animated}%` }} />
        </div>
        <p className="result-label mono">{isSpam ? '⚠ SPAM DETECTED' : '✓ HAM DETECTED'}</p>
        <p className="result-interpretation mono">{interpretation(pct)}</p>
      </div>

      <p className="text-faint">This is the model's estimated spam probability, not a guarantee of safety.</p>

      <div className="result-section">
        <p className="panel-subtitle mono">ML CLASSIFICATION</p>
        <p className="mono">
          {result.label.toUpperCase()} · {pct.toFixed(2)}%
        </p>
        <div className="tech-details">
          <div>
            <dt>MODEL</dt>
            <dd className="mono">Multinomial Naive Bayes</dd>
          </div>
          <div>
            <dt>ANALYZED</dt>
            <dd className="mono">{result.created_at ? new Date(result.created_at).toLocaleString() : new Date().toLocaleString()}</dd>
          </div>
        </div>
      </div>

      <div className="divider" />

      <div className="result-section">
        <p className="panel-subtitle mono">HEURISTIC INDICATORS</p>
        {indicators.length === 0 ? (
          <p className="text-muted mono">NO PATTERN INDICATORS DETECTED</p>
        ) : (
          <ul className="indicator-list mono">
            {indicators.map((ind) => (
              <li key={ind.id}>{ind.label}</li>
            ))}
          </ul>
        )}
        <p className="text-faint">
          Transparent pattern checks, computed separately from the ML model. They do not explain or influence its
          prediction — the API only returns a label and a probability.
        </p>
      </div>

      {messageId && (
        <>
          <div className="divider" />
          <FeedbackWidget messageId={messageId} />
        </>
      )}

      <div className="result-actions mono">
        <button type="button" onClick={onCopy}>
          COPY RESULT
        </button>
        <button type="button" onClick={onExport}>
          EXPORT REPORT
        </button>
      </div>
    </section>
  )
}
