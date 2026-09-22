/**
 * Colours Recharts needs as literal values. SVG props and Recharts' own
 * tooltip and legend swatches can't reliably resolve CSS variables, so these
 * mirror the tokens in index.css. Change a colour in both places.
 */
export const chartTheme = {
  grid: '#E2E8F0',
  axis: '#64748B',
  text: '#0F172A',
  line: '#1E40AF',
  series: ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#D97706'],
} as const

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024