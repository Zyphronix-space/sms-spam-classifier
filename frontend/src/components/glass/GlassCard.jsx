// Thin, reused card shell — every panel in the app is one of these. Renders
// on the existing `.panel` glass-blur styling already defined in App.css.
export default function GlassCard({ title, subtitle, actions, className = '', children, ...rest }) {
  return (
    <section className={`panel ${className}`} {...rest}>
      {(title || actions) && (
        <div className="panel-header">
          <div>
            {title && <p className="panel-title mono">{title}</p>}
            {subtitle && <p className="text-faint">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
