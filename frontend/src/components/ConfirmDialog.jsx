// Hand-rolled modal, matching the existing Auth.jsx modal-backdrop/modal
// styling rather than introducing a dialog library.
export default function ConfirmDialog({ title, body, confirmLabel = 'CONFIRM', danger = true, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal confirm-dialog" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
          ×
        </button>
        <p className="panel-title mono">{title}</p>
        {body && <p className="text-muted">{body}</p>}
        <div className="confirm-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            CANCEL
          </button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
