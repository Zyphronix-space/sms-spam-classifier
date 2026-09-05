import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useSession } from '../../lib/session'
import { useToast } from '../../components/Toast'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'

export default function Signup() {
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
      const u = await api.register(email, password)
      setUser(u)
      refreshData()
      toast.success('Account created.')
      navigate('/app/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message || 'Could not create account.' : 'Could not create account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <GlassCard className="auth-card" title="CREATE ACCOUNT">
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            hint="MIN. 8 CHARACTERS"
          />
          {error && <p className="error-text mono">{error}</p>}
          <GlassButton type="submit" disabled={loading}>
            {loading ? 'PLEASE WAIT…' : 'CREATE ACCOUNT'}
          </GlassButton>
        </form>
        <div className="auth-links mono">
          <span />
          <Link to="/login">ALREADY HAVE AN ACCOUNT?</Link>
        </div>
      </GlassCard>
    </div>
  )
}
