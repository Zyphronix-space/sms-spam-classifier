import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useSession } from '../../lib/session'
import { useToast } from '../../components/Toast'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'

export default function Login() {
  const { setUser, refreshData } = useSession()
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const u = await api.login(email, password)
      setUser(u)
      refreshData()
      toast.success('Welcome back.')
      navigate('/app/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message || 'Log in failed.' : 'Log in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <GlassCard className="auth-card" title="LOG IN">
        <form onSubmit={handleSubmit} className="auth-form">
          <GlassInput
            label="EMAIL"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <GlassInput
            label="PASSWORD"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="error-text mono">{error}</p>}
          <GlassButton type="submit" disabled={loading}>
            {loading ? 'PLEASE WAIT…' : 'LOG IN'}
          </GlassButton>
        </form>
        <div className="auth-links mono">
          <Link to="/forgot-password">FORGOT PASSWORD?</Link>
          <Link to="/signup">CREATE ACCOUNT</Link>
        </div>
      </GlassCard>
    </div>
  )
}
