import { useEffect, useRef, useState } from 'react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MessageScanner, { SCAN_STAGES } from './components/MessageScanner'
import ScanResult from './components/ScanResult'
import SystemStatus from './components/SystemStatus'
import Pipeline from './components/Pipeline'
import MessageHistory from './components/MessageHistory'
import BatchScanner from './components/BatchScanner'
import ModelLab from './components/ModelLab'
import Dashboard from './components/Dashboard'
import FeedbackPage from './components/FeedbackPage'
import AdminPanel from './components/AdminPanel'
import Auth from './components/Auth'
import { ToastProvider, useToast } from './components/Toast'
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

function AppInner() {
  const toast = useToast()
  const [theme, cycleTheme] = useTheme()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [health, setHealth] = useState(null)

  const [user, setUser] = useState(null)
  const [authView, setAuthView] = useState(null)
  const [authError, setAuthError] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [dataRefreshKey, setDataRefreshKey] = useState(0)
  const [openMessageId, setOpenMessageId] = useState(null)

  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [resultMessageId, setResultMessageId] = useState(null)
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
    setResultMessageId(null)
    setLoading(true)
    setScanStage(0)
    scannedMessageRef.current = message

    const interval = setInterval(() => {
      setScanStage((s) => (s < SCAN_STAGES.length - 2 ? s + 1 : s))
    }, 260)

    try {
      if (user) {
        const res = await api.createMessage(message)
        clearInterval(interval)
        setScanStage(SCAN_STAGES.length - 1)
        await new Promise((resolve) => setTimeout(resolve, 250))
        setResult(res)
        setResultMessageId(res.id)
        setDataRefreshKey((k) => k + 1)
      } else {
        const res = await api.predict(message)
        clearInterval(interval)
        setScanStage(SCAN_STAGES.length - 1)
        await new Promise((resolve) => setTimeout(resolve, 250))
        setResult(res)
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
    setResultMessageId(null)
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
      setDataRefreshKey((k) => k + 1)
      toast.success(authView === 'login' ? 'Welcome back.' : 'Account created.')
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
    setDataRefreshKey((k) => k + 1)
  }

  const openMessageInHistory = (id) => {
    setOpenMessageId(id)
    setActiveTab('history')
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        isAdmin={user?.is_admin}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="app-content">
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
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <main className="app-main">
          {activeTab === 'dashboard' && (
            user ? (
              <Dashboard refreshKey={dataRefreshKey} onOpenMessage={openMessageInHistory} />
            ) : (
              <section className="panel empty-state">
                <p className="panel-title mono">DASHBOARD</p>
                <p className="text-muted mono">SIGN IN TO SEE YOUR DASHBOARD</p>
                <p className="text-faint">Register or log in to track messages, spam rate, and trends over time.</p>
              </section>
            )
          )}

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
                  <ScanResult
                    result={result}
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
          )}

          {activeTab === 'batch' && <BatchScanner user={user} onSaved={() => setDataRefreshKey((k) => k + 1)} />}
          {activeTab === 'history' && (
            <MessageHistory
              user={user}
              refreshKey={dataRefreshKey}
              openMessageId={openMessageId}
              onOpenedMessage={() => setOpenMessageId(null)}
            />
          )}
          {activeTab === 'model' && <ModelLab />}
          {activeTab === 'feedback' && (
            <FeedbackPage user={user} refreshKey={dataRefreshKey} onOpenMessage={openMessageInHistory} />
          )}
          {activeTab === 'admin' && user?.is_admin && <AdminPanel />}
        </main>
      </div>

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

function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}

export default App
