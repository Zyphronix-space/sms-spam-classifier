import { useEffect, useRef } from 'react'

// Generic modal shell — ConfirmDialog.jsx implements the same
// backdrop/modal pattern for its specific confirm/cancel case; this is the
// reusable version for anything else that needs an overlay dialog.
export default function GlassModal({ open, onClose, title, className = '', children }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {title && <h2 className="panel-title mono">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
