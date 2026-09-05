import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useSession } from '../../lib/session'
import { useToast } from '../../components/Toast'
import ConfirmDialog from '../../components/ConfirmDialog'
import GlassCard from '../../components/glass/GlassCard'
import GlassInput from '../../components/glass/GlassInput'
import GlassButton from '../../components/glass/GlassButton'

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

function ProfileTab({ user }) {
  return (
    <div className="settings-section">
      <div>
        <p className="metric-label mono">EMAIL</p>
        <p className="mono">{user.email}</p>
      </div>
      <div>
        <p className="metric-label mono">ACCOUNT CREATED</p>
        <p className="mono">{formatDate(user.created_at)}</p>
      </div>
      <div>
        <p className="metric-label mono">ROLE</p>
        <p className="mono">{user.is_admin ? 'ADMIN' : 'STANDARD'}</p>
      </div>
    </div>
  )
}

function SecurityTab() {
  const { logout } = useSession()
  const toast = useToast()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Password changed.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message || 'Could not change password.' : 'Could not change password.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setConfirmingDelete(false)
    setDeleting(true)
    try {
      await api.deleteAccount()
      toast.success('Account deleted.')
      await logout()
      navigate('/')
    } catch {
      toast.error('Could not delete account.')
      setDeleting(false)
    }
  }

  return (
    <div className="settings-section">
      <form onSubmit={handleChangePassword} className="auth-form">
        <p className="panel-subtitle mono">CHANGE PASSWORD</p>
        <GlassInput
          label="CURRENT PASSWORD"
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <GlassInput
          label="NEW PASSWORD"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          hint="MIN. 8 CHARACTERS"
        />
        {error && <p className="error-text mono">{error}</p>}
        <GlassButton type="submit" disabled={saving}>
          {saving ? 'SAVING…' : 'CHANGE PASSWORD'}
        </GlassButton>
      </form>

      <div className="danger-zone">
        <p className="panel-subtitle mono">DANGER ZONE</p>
        <p className="text-muted">Deleting your account permanently removes your messages, predictions, and feedback.</p>
        <GlassButton variant="danger" onClick={() => setConfirmingDelete(true)} disabled={deleting}>
          {deleting ? 'DELETING…' : 'DELETE ACCOUNT'}
        </GlassButton>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="DELETE ACCOUNT?"
          body="This permanently removes your account, message history, predictions, and feedback. This cannot be undone."
          confirmLabel="DELETE ACCOUNT"
          onConfirm={handleDeleteAccount}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useSession()
  const [tab, setTab] = useState('profile')

  return (
    <GlassCard title="SETTINGS">
      <div className="settings-tabs">
        <button
          type="button"
          className={`settings-tab mono ${tab === 'profile' ? 'settings-tab--active' : ''}`}
          onClick={() => setTab('profile')}
        >
          PROFILE
        </button>
        <button
          type="button"
          className={`settings-tab mono ${tab === 'security' ? 'settings-tab--active' : ''}`}
          onClick={() => setTab('security')}
        >
          SECURITY
        </button>
      </div>
      {tab === 'profile' ? <ProfileTab user={user} /> : <SecurityTab />}
    </GlassCard>
  )
}
