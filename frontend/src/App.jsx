import { useEffect, useRef, useState } from 'react'
import './App.css'
import Header from './components/Header'
import MessageScanner, { SCAN_STAGES } from './components/MessageScanner'
import ScanResult from './components/ScanResult'
import SystemStatus from './components/SystemStatus'
import Pipeline from './components/Pipeline'
import ScanHistory from './components/ScanHistory'
import BatchScanner from './components/BatchScanner'
import ModelLab from './components/ModelLab'
import Statistics from './components/Statistics'
import Auth from './components/Auth'
import { api, ApiError } from './lib/api'
import { addLocalScan } from './lib/localHistory'
import { useTheme } from './lib/useTheme'

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
    case 'BACKEND_OFFLINE':
      return { title: 'INFERENCE ENGINE OFFLINE', body: 'The ML backend is currently unavailable.' }
    default:
      return { title: 'REQUEST FAILED', body: err.message || 'Please try again.' }
  }
}

function App() {
  const [theme, cycleTheme] = useTheme()
  const [activeTab, setActiveTab] = useState('scanner')
  const [health, setHealth] = useState(null)

  const [user, setUser] = useState(null)
  const [authView, setAuthView] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanStage, setScanStage] = useState(0)
  const scannedMessageRef = useRef('')

  // System status: polled, not faked. If the gateway is unreachable this
  // reflects that instead of pretending everything is fine.
  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const h = await api.health()
        if (!cancelled) setHealth(h)
      } catch {
        if (!cancelled) setHealth({ gateway: 'unreachable', backend: 'unknown', database: 'unknown' })
      }
    }
    poll()
    const id = setInterval(poll, 20000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Restore login state on load. The session cookie is HttpOnly, so this is
  // the only way the UI can know whether it's still valid.
  useEffect(() => {
    let cancelled = false
    api
      .me()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null))
    return () => {
      cancelled = true
    }
  }, [])

  const handleAnalyze = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    setScanStage(0)
    scannedMessageRef.current = message

    const interval = setInterval(() => {
      setScanStage((s) => (s < SCAN_STAGES.length - 2 ? s + 1 : s))
    }, 260)

    try {
      const res = await api.predict(message)
      clearInterval(interval)
      setScanStage(SCAN_STAGES.length - 1)
      await new Promise((resolve) => setTimeout(resolve, 250))
      setResult(res)
      if (user) {
        setHistoryRefreshKey((k) => k + 1)
      } else {
        addLocalScan({ message, classification: res.label, spam_probability: res.spam_probability })
      }
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
    setError(null)
  }

  const handleCopy = () => {
    if (!result) return
    const text = `${result.label.toUpperCase()} — ${(result.spam_probability * 100).toFixed(2)}% spam probability`
    navigator.clipboard?.writeText(text)
  }

  const handleExport = () => {
    if (!result) return
    const report = [
      'SMS CLASSIFICATION REPORT',
      '',
      'Classification:',
      result.label.toUpperCase(),
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
    a.download = `sms-classification-report-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleAuthSubmit = async (email, password) => {
    setAuthError(null)
    setAuthLoading(true)
    try {
      const fn = authView === 'login' ? api.login : api.register
      const u = await fn(email, password)
      setUser(u)
      setAuthView(null)
      setHistoryRefreshKey((k) => k + 1)
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message || 'Authentication failed.' : 'Authentication failed.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch {
      // clear local state regardless — the cookie is gone or invalid either way
    }
    setUser(null)
    setHistoryRefreshKey((k) => k + 1)
  }

  return (
    <div className="app">
      <Header
        theme={theme}
        onCycleTheme={cycleTheme}
        health={health}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={(mode) => {
          setAuthView(mode)
          setAuthError(null)
        }}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      <main className="app-main">
        {activeTab === 'scanner' && (
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
                <ScanResult result={result} message={scannedMessageRef.current} onCopy={handleCopy} onExport={handleExport} />
              )}
            </div>
            <div className="layout-side">
              <SystemStatus health={health} />
              <Pipeline health={health} />
            </div>
          </div>
        )}

        {activeTab === 'batch' && <BatchScanner />}
        {activeTab === 'history' && <ScanHistory user={user} refreshKey={historyRefreshKey} />}
        {activeTab === 'stats' && <Statistics user={user} refreshKey={historyRefreshKey} />}
        {activeTab === 'model' && <ModelLab />}
      </main>

      {authView && (
        <Auth
          mode={authView}
          onSubmit={handleAuthSubmit}
          onSwitchMode={() => setAuthView((v) => (v === 'login' ? 'register' : 'login'))}
          onClose={() => setAuthView(null)}
          error={authError}
          loading={authLoading}
        />
      )}
    </div>
  )
}

export default App
