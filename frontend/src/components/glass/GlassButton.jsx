const VARIANT_CLASS = { primary: 'btn-primary', ghost: 'btn-ghost', danger: 'btn-danger' }

export default function GlassButton({ variant = 'primary', className = '', type = 'button', ...rest }) {
  return <button type={type} className={`${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} ${className}`} {...rest} />
}
