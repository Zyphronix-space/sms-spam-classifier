export default function GlassSkeleton({ width = '100%', height = 16, className = '' }) {
  return (
    <span
      className={`glass-skeleton ${className}`}
      style={{ display: 'block', width, height }}
      aria-hidden="true"
    />
  )
}
