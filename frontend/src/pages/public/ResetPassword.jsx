import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useToast } from '../../components/Toast'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.resetPassword(token, password)
      toast.success('Password reset. Log in with your new password.')
      navigate('/login')
    } catch (err) {
      setError(err instanceof ApiError ? err.message || 'Could not reset password.' : 'Could not reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <GlassCard className="auth-card" title="RESET PASSWORD">
        {!token ? (
          <p className="error-text mono">Missing reset token. Use the link from Forgot Password.</p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <GlassInput
              label="NEW PASSWORD"
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
              {loading ? 'PLEASE WAIT…' : 'RESET PASSWORD'}
            </GlassButton>
          </form>
        )}
        <div className="auth-links mono">
          <Link to="/login">BACK TO LOG IN</Link>
        </div>
      </GlassCard>
    </div>
  )
}
