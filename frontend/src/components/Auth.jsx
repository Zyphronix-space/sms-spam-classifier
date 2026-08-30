import { useState } from 'react'

export default function Auth({ mode, onSubmit, onSwitchMode, onClose, error, loading }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(email, password)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-heading"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 id="auth-heading" className="panel-title mono">
          {mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
        </h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="mono">
            EMAIL
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="mono">
            PASSWORD
            <input
              type="password"
              required
              minLength={mode === 'register' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {mode === 'register' && <p className="text-faint mono">MIN. 8 CHARACTERS</p>}
          {error && <p className="error-text mono">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'PLEASE WAIT…' : mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
          </button>
        </form>
        <button type="button" className="btn-ghost mono auth-switch" onClick={onSwitchMode}>
          {mode === 'login' ? "DON'T HAVE AN ACCOUNT? REGISTER" : 'ALREADY HAVE AN ACCOUNT? LOG IN'}
        </button>
      </div>
    </div>
  )
}
