// A labeled input matching the vertical `.auth-form label` layout already
// used across the app's forms (login/signup/settings) — see App.css.
export default function GlassInput({ label, hint, error, className = '', ...rest }) {
  return (
    <label className="mono">
      {label}
      <input className={className} {...rest} />
      {hint && !error && <p className="text-faint mono">{hint}</p>}
      {error && <p className="error-text mono">{error}</p>}
    </label>
  )
}
