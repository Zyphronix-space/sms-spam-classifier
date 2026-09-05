// Generic modal shell — ConfirmDialog.jsx implements the same
// backdrop/modal pattern for its specific confirm/cancel case; this is the
// reusable version for anything else that needs an overlay dialog.
export default function GlassModal({ open, onClose, title, className = '', children }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {title && <h2 className="panel-title mono">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
