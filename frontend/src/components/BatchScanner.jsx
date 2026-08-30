import { useState } from 'react'
import { api, ApiError } from '../lib/api'

const MAX_BATCH = 20

function parseMessages(raw) {
  const headerRegex = /^MESSAGE\s+\d+\s*$/im
  let parts
  if (headerRegex.test(raw)) {
    parts = raw.split(/^MESSAGE\s+\d+\s*$/im)
  } else {
    const byBlankLine = raw.split(/\n\s*\n/)
    parts = byBlankLine.length > 1 ? byBlankLine : raw.split('\n')
  }
  return parts.map((s) => s.trim()).filter(Boolean)
}

export default function BatchScanner() {
  const [raw, setRaw] = useState('')
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)

  const allMessages = parseMessages(raw)
  const messages = allMessages.slice(0, MAX_BATCH)
  const overflow = allMessages.length > MAX_BATCH

  const handleRun = async () => {
    if (messages.length === 0) return
    setResults([])
    setRunning(true)
    const out = []
    // Sequential on purpose — this hits the same gateway/backend everything
    // else uses, so we don't hammer it with 20 parallel requests.
    for (const message of messages) {
      try {
        const res = await api.predict(message)
        out.push({ message, ...res, ok: true })
      } catch (err) {
        out.push({ message, ok: false, error: err instanceof ApiError ? err.code : 'ERROR' })
      }
      setResults([...out])
    }
    setRunning(false)
  }

  return (
    <section className="panel batch" aria-labelledby="batch-heading">
      <h2 id="batch-heading" className="panel-title mono">
        BATCH SCAN
      </h2>
      <p className="text-faint mono">
        Separate messages with a "MESSAGE 01" style header, or a blank line. Capped at {MAX_BATCH} per batch and
        processed one at a time.
      </p>
      <textarea
        className="scanner-input"
        rows={8}
        placeholder={"MESSAGE 01\nCongratulations! You've won...\n\nMESSAGE 02\nHey, are we meeting at 5?"}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        disabled={running}
      />
      <div className="scanner-meta mono">
        <span>
          {messages.length} MESSAGE{messages.length === 1 ? '' : 'S'} DETECTED
          {overflow ? ` (LIMITED TO ${MAX_BATCH})` : ''}
        </span>
        <button type="button" className="btn-primary" onClick={handleRun} disabled={running || messages.length === 0}>
          {running ? 'SCANNING…' : 'RUN BATCH SCAN'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="batch-results">
          <p className="panel-subtitle mono">BATCH RESULTS</p>
          <ol className="mono batch-list">
            {results.map((r, i) => (
              <li key={i} className="batch-row">
                <span className="history-index">{String(i + 1).padStart(2, '0')}</span>
                {r.ok ? (
                  <>
                    <span className={r.label === 'spam' ? 'text-accent' : 'text-success'}>{r.label.toUpperCase()}</span>
                    <span>{(r.spam_probability * 100).toFixed(1)}%</span>
                  </>
                ) : (
                  <span className="error-text">FAILED — {r.error}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
