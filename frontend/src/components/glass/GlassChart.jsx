// Thin recharts styling layer — every chart in the app shares this tooltip/
// axis look instead of repeating the same style object on every page.
export { ResponsiveContainer } from 'recharts'

export const glassTooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 12,
}

export const glassAxisTick = { fontSize: 10 }
export const glassAxisColor = 'var(--text-faint)'
export const glassGridColor = 'var(--border)'
