const ICON = { info: 'ⓘ', danger: '⚠', success: '✓' }

export default function GlassAlert({ tone = 'info', title, children }) {
  return (
    <div className={`glass-alert glass-alert--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="glass-alert-icon" aria-hidden="true">
        {ICON[tone] || ICON.info}
      </span>
      <div>
        {title && <p className="mono">{title}</p>}
        {children}
      </div>
    </div>
  )
}
