import { useRef, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import { useSession } from '../../lib/session'
import MessageScanner, { SCAN_STAGES } from '../../components/MessageScanner'
import ScanResult from '../../components/ScanResult'
import SystemStatus from '../../components/SystemStatus'
import Pipeline from '../../components/Pipeline'

function errorContent(err) {
  if (!(err instanceof ApiError)) {
    return { title: 'UNEXPECTED ERROR', body: 'Something went wrong. Try again.' }
  }
  switch (err.code) {
    case 'CONNECTION_FAILED':
      return { title: 'CONNECTION FAILED', body: 'Unable to reach the gateway.' }
    case 'UNAUTHORIZED':
      return { title: 'GATEWAY AUTHENTICATION FAILED', body: 'Check the configured API key.' }
    case 'BAD_REQUEST':
      return { title: 'INVALID MESSAGE', body: 'Check the message and try again.' }
    case 'RATE_LIMITED':
      return { title: 'TOO MANY REQUESTS', body: 'Slow down and try again in a moment.' }
    case 'BACKEND_OFFLINE':
      return { title: 'INFERENCE ENGINE OFFLINE', body: 'The ML backend is currently unavailable.' }
    default:
      return { title: 'REQUEST FAILED', body: err.message || 'Please try again.' }
  }
}

export default function AnalyzePage() {
  const { health, refreshData } = useSession()
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [resultMessageId, setResultMessageId] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanStage, setScanStage] = useState(0)
  const scannedMessageRef = useRef('')

  const handleAnalyze = async () => {
    setError(null)
    setResult(null)
    setResultMessageId(null)
    setLoading(true)
    setScanStage(0)
    scannedMessageRef.current = message

    const interval = setInterval(() => {
      setScanStage((s) => (s < SCAN_STAGES.length - 2 ? s + 1 : s))
    }, 260)

    try {
      const res = await api.createMessage(message)
      clearInterval(interval)
      setScanStage(SCAN_STAGES.length - 1)
      await new Promise((resolve) => setTimeout(resolve, 250))
      setResult(res)
      setResultMessageId(res.id)
      refreshData()
    } catch (err) {
      clearInterval(interval)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setMessage('')
    setResult(null)
    setResultMessageId(null)
    setError(null)
  }

  const handleCopy = () => {
    if (!result) return
    const text = `${result.classification.toUpperCase()} — ${(result.spam_probability * 100).toFixed(2)}% spam probability`
    navigator.clipboard?.writeText(text)
  }

  const handleExport = () => {
    if (!result) return
    const report = [
      'SPAMSHIELD ANALYSIS REPORT',
      '',
      'Classification:',
      result.classification.toUpperCase(),
      '',
      'Spam probability:',
      `${(result.spam_probability * 100).toFixed(2)}%`,
      '',
      'Model:',
      'Multinomial Naive Bayes',
      '',
      'Feature extraction:',
      'TF-IDF',
      '',
      'Timestamp:',
      new Date().toISOString(),
    ].join('\n')
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spamshield-analysis-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="layout-grid">
      <div className="layout-main">
        <MessageScanner
          message={message}
          onMessageChange={setMessage}
          onAnalyze={handleAnalyze}
          onClear={handleClear}
          loading={loading}
          scanStageIndex={scanStage}
        />

        {error && !loading && (
          <div className="panel error-panel mono" role="alert">
            <p className="error-title">{errorContent(error).title}</p>
            <p>{errorContent(error).body}</p>
          </div>
        )}

        {result && !loading && (
          <ScanResult
            result={{ label: result.classification, spam_probability: result.spam_probability, created_at: result.created_at }}
            message={scannedMessageRef.current}
            onCopy={handleCopy}
            onExport={handleExport}
            messageId={resultMessageId}
          />
        )}
      </div>
      <div className="layout-side">
        <SystemStatus health={health} />
        <Pipeline health={health} />
      </div>
    </div>
  )
}
