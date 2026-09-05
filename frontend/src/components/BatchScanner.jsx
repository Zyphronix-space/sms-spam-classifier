import { useRef, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from './Toast'

// Always rendered behind RequireAuth (see lib/session.jsx).
export default function BatchScanner({ onSaved }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const runUpload = async (file) => {
    if (!file) return
    setFileName(file.name)
    setResult(null)
    setError(null)
    setRunning(true)
    try {
      const res = await api.uploadBatch(file)
      setResult(res)
      onSaved?.()
    } catch (err) {
      const message = err instanceof ApiError ? err.message || 'Batch upload failed.' : 'Batch upload failed.'
      setError(message)
      toast.error(message)
    } finally {
      setRunning(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    runUpload(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) runUpload(file)
  }

  const handleExport = async () => {
    if (!result) return
    try {
      const blob = await api.exportBatch(result.batch_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-${result.batch_id}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not export batch results.')
    }
  }

  return (
    <section className="panel batch" aria-labelledby="batch-heading">
      <h2 id="batch-heading" className="panel-title mono">
        BATCH ANALYSIS
      </h2>
      <p className="text-faint mono">UPLOAD A CSV WITH A "message" COLUMN (OR "text"/"sms") — UP TO 500 ROWS, 1MB</p>

      <div
        className={`csv-dropzone ${dragOver ? 'csv-dropzone--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={running}
          className="sr-only"
          aria-label="Upload CSV file"
        />
        <p className="mono">{running ? 'PROCESSING…' : fileName || 'DROP CSV HERE OR CLICK TO BROWSE'}</p>
      </div>

      {error && (
        <p className="error-text mono" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="batch-results">
          <div className="stats-grid mono">
            <div>
              <span className="metric-label">TOTAL ROWS</span>
              <span className="metric-value">{result.total}</span>
            </div>
            <div>
              <span className="metric-label">SPAM</span>
              <span className="metric-value text-danger">{result.spam_count}</span>
            </div>
            <div>
              <span className="metric-label">LEGITIMATE</span>
              <span className="metric-value text-success">{result.ham_count}</span>
            </div>
          </div>
          <p className="mono">
            SPAM PERCENTAGE: {result.spam_percentage.toFixed(1)}% · {result.invalid} INVALID ROW{result.invalid === 1 ? '' : 'S'}
          </p>
          <button type="button" className="btn-primary" onClick={handleExport}>
            EXPORT RESULTS AS CSV
          </button>

          <p className="panel-subtitle mono" style={{ marginTop: 16 }}>
            ROW RESULTS
          </p>
          <ol className="mono batch-list">
            {result.results.map((r) => (
              <li key={r.row} className="batch-row">
                <span className="history-index">{String(r.row).padStart(2, '0')}</span>
                {r.error ? (
                  <span className="error-text">SKIPPED — {r.error}</span>
                ) : (
                  <>
                    <span className="history-preview">{r.message}</span>
                    <span className={r.classification === 'spam' ? 'text-danger' : 'text-success'}>
                      {r.classification.toUpperCase()} {(r.spam_probability * 100).toFixed(1)}%
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
