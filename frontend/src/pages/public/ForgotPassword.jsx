import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await api.forgotPassword(email)
      setResult(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message || 'Could not process request.' : 'Could not process request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <GlassCard className="auth-card" title="FORGOT PASSWORD">
        {!result ? (
          <>
            <p className="text-muted">Enter your account email and we'll generate a reset link.</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <GlassInput
                label="EMAIL"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {error && <p className="error-text mono">{error}</p>}
              <GlassButton type="submit" disabled={loading}>
                {loading ? 'PLEASE WAIT…' : 'SEND RESET LINK'}
              </GlassButton>
            </form>
          </>
        ) : (
          <>
            <p className="text-muted">{result.message}</p>
            {result.demo_reset_link ? (
              <div className="demo-reset-banner">
                <p className="mono text-accent">
                  DEMO MODE — no email provider is configured for this project, so the reset link is
                  shown here instead of being emailed. It expires in {result.expires_in_minutes} minutes
                  and can only be used once.
                </p>
                <Link to={result.demo_reset_link.replace(window.location.origin, '')} className="demo-reset-link">
                  {result.demo_reset_link}
                </Link>
              </div>
            ) : (
              <p className="text-faint">If that email is registered, check the link it was generated for.</p>
            )}
          </>
        )}
        <div className="auth-links mono">
          <Link to="/login">BACK TO LOG IN</Link>
        </div>
      </GlassCard>
    </div>
  )
}
