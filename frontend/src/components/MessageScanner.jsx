export const SCAN_STAGES = [
  { id: 'request', label: 'REQUEST RECEIVED' },
  { id: 'auth', label: 'AUTHENTICATION' },
  { id: 'validation', label: 'BODY VALIDATION' },
  { id: 'vectorize', label: 'MESSAGE VECTORIZATION' },
  { id: 'inference', label: 'MODEL INFERENCE' },
  { id: 'result', label: 'RESULT' },
]

// Purely a visual scanning animation — the backend does not expose these as
// discrete stages. The real path is React -> Ballerina -> FastAPI -> TF-IDF
// -> Naive Bayes, in one request.
function ScanningAnimation({ activeIndex }) {
  const complete = activeIndex >= SCAN_STAGES.length - 1
  return (
    <div className="scanning mono" role="status" aria-live="polite">
      <p className="scanning-title">{complete ? 'ANALYSIS COMPLETE' : 'ANALYZING MESSAGE'}</p>
      <ul className="scanning-stages">
        {SCAN_STAGES.map((stage, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'pending'
          const marker = state === 'done' ? '✓' : state === 'active' ? '●' : '○'
          return (
            <li key={stage.id} className={`scanning-stage scanning-stage--${state}`}>
              <span>{stage.label}</span>
              <span aria-hidden="true">{marker}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function MessageScanner({ message, onMessageChange, onAnalyze, onClear, loading, scanStageIndex }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    onAnalyze()
  }

  return (
    <section className="panel scanner" aria-labelledby="scanner-heading">
      <h2 id="scanner-heading" className="panel-title mono">
        MESSAGE INPUT
      </h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="sms-input" className="sr-only">
          SMS message to analyze
        </label>
        <textarea
          id="sms-input"
          className="scanner-input"
          rows={6}
          placeholder="Paste SMS message here..."
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          disabled={loading}
        />
        <div className="scanner-meta mono">
          <span>{message.length} CHARACTERS</span>
          <div className="scanner-actions">
            <button type="button" className="btn-ghost" onClick={onClear} disabled={loading || !message}>
              CLEAR
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !message.trim()}>
              {loading ? 'ANALYZING…' : 'ANALYZE MESSAGE'}
            </button>
          </div>
        </div>
      </form>
      {loading && <ScanningAnimation activeIndex={scanStageIndex} />}
    </section>
  )
}
