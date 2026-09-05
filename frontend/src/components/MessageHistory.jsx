import { useEffect, useMemo, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { analyzePatterns } from '../lib/heuristics'
import ConfirmDialog from './ConfirmDialog'
import FeedbackWidget from './FeedbackWidget'
import { useToast } from './Toast'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

// Always rendered behind RequireAuth (see lib/session.jsx) — there is no
// anonymous/local-only variant of this page.
export default function MessageHistory({ refreshKey, openMessageId, onOpenedMessage }) {
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [classification, setClassification] = useState('')
  const [sort, setSort] = useState('created_at_desc')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    api
      .listMessages({ q: q || undefined, classification: classification || undefined, sort })
      .then(setMessages)
      .catch(() => setError('Could not load message history.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, q, classification, sort])

  // Deep-link from Dashboard's "recent predictions" list.
  useEffect(() => {
    if (!openMessageId) return
    api
      .getMessage(openMessageId)
      .then((m) => setSelected(m))
      .catch(() => {})
      .finally(() => onOpenedMessage?.())
  }, [openMessageId, onOpenedMessage])

  const openDetail = async (row) => {
    try {
      const detail = await api.getMessage(row.id)
      setSelected(detail)
      setEditing(false)
    } catch {
      toast.error('Could not load message detail.')
    }
  }

  const confirmDelete = async () => {
    const id = pendingDelete
    setPendingDelete(null)
    try {
      await api.deleteMessage(id)
      setMessages((m) => m.filter((x) => x.id !== id))
      if (selected?.id === id) setSelected(null)
      toast.success('Message deleted.')
    } catch {
      toast.error('Could not delete message.')
    }
  }

  const startEdit = () => {
    setEditText(selected.message)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!editText.trim()) return
    setSaving(true)
    try {
      await api.updateMessage(selected.id, editText.trim())
      const detail = await api.getMessage(selected.id)
      setSelected(detail)
      setEditing(false)
      load()
      toast.success('Message updated and re-classified.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message || 'Could not update message.' : 'Could not update message.')
    } finally {
      setSaving(false)
    }
  }

  const indicators = useMemo(() => (selected ? analyzePatterns(selected.message) : []), [selected])

  return (
    <section className="panel history" aria-labelledby="history-heading">
      <div className="panel-header">
        <h2 id="history-heading" className="panel-title mono">
          MESSAGE HISTORY
        </h2>
      </div>
      <p className="text-faint mono">PERSISTED IN POSTGRESQL FOR YOUR ACCOUNT</p>

      <div className="history-filters mono">
        <input
          type="search"
          className="history-search"
          placeholder="SEARCH MESSAGES…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search messages"
        />
        <select value={classification} onChange={(e) => setClassification(e.target.value)} aria-label="Filter by classification">
          <option value="">ALL</option>
          <option value="spam">SPAM ONLY</option>
          <option value="ham">HAM ONLY</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort order">
          <option value="created_at_desc">NEWEST FIRST</option>
          <option value="created_at_asc">OLDEST FIRST</option>
          <option value="probability_desc">HIGHEST SPAM SCORE</option>
          <option value="probability_asc">LOWEST SPAM SCORE</option>
        </select>
      </div>

      {error && <p className="error-text mono">{error}</p>}
      {loading && <p className="text-muted mono">LOADING…</p>}

      {!loading && messages.length === 0 ? (
        <div className="empty-state">
          <p className="text-muted mono">NO MESSAGES YET</p>
          <p className="text-faint">Analyze a message from the Analyze page to see it here.</p>
        </div>
      ) : (
        <ol className="history-list mono">
          {messages.map((m, i) => (
            <li key={m.id}>
              <div
                className="history-row"
                role="button"
                tabIndex={0}
                onClick={() => openDetail(m)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(m)
                  }
                }}
              >
                <span className="history-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="history-preview">{m.message}</span>
                <span className={m.classification === 'spam' ? 'text-danger' : 'text-success'}>
                  {m.classification.toUpperCase()} {(m.spam_probability * 100).toFixed(1)}%
                </span>
                <button
                  type="button"
                  className="btn-ghost history-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPendingDelete(m.id)
                  }}
                >
                  DELETE
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {selected && (
        <div className="history-detail mono">
          <p className="panel-subtitle mono">MESSAGE DETAIL</p>
          {editing ? (
            <>
              <textarea className="scanner-input" rows={4} value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="confirm-actions">
                <button type="button" className="btn-ghost" onClick={() => setEditing(false)} disabled={saving}>
                  CANCEL
                </button>
                <button type="button" className="btn-primary" onClick={saveEdit} disabled={saving || !editText.trim()}>
                  {saving ? 'SAVING…' : 'SAVE & RE-CLASSIFY'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="history-detail-message">{selected.message}</p>
              <p>CLASSIFICATION: {selected.classification.toUpperCase()}</p>
              <p>SPAM PROBABILITY: {(selected.spam_probability * 100).toFixed(2)}%</p>
              <p>TIMESTAMP: {formatTime(selected.created_at)}</p>
              {indicators.length > 0 && (
                <ul className="indicator-list mono">
                  {indicators.map((ind) => (
                    <li key={ind.id}>{ind.label}</li>
                  ))}
                </ul>
              )}
              <div className="divider" />
              <FeedbackWidget messageId={selected.id} existing={selected.feedback} />
              <div className="confirm-actions">
                <button type="button" className="btn-ghost" onClick={startEdit}>
                  EDIT
                </button>
                <button type="button" className="btn-ghost" onClick={() => setSelected(null)}>
                  CLOSE
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="DELETE MESSAGE?"
          body="This permanently removes the message, its prediction history, and any feedback."
          confirmLabel="DELETE"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
