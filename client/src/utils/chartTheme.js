// Chart theming that mirrors the Sai Dental "Technical Minimalist" design system:
// paper background, forest primary, coral/gold/mint accents, hairlines, mono labels.

export const CHART_COLORS = {
  forest: '#1A3C2B',
  forestLight: '#285740',
  forestDark: '#112a1d',
  coral: '#FF8C69',
  gold: '#F4D35E',
  mint: '#9EFFBF',
  ink: '#3A3A38',
  paper: '#F7F7F5',
  paperDark: '#E4E4DC',
  muted: 'rgba(26, 60, 43, 0.72)',
  hairline: 'rgba(58, 58, 56, 0.2)',
}

export const CHART_PALETTE = [
  CHART_COLORS.forest,
  CHART_COLORS.coral,
  CHART_COLORS.gold,
  CHART_COLORS.forestLight,
  CHART_COLORS.mint,
  CHART_COLORS.forestDark,
]

export const CHART_MONO = `'JetBrains Mono', 'SF Mono', monospace`

// Shared axis tick styling: mono, 11px, muted forest, uppercase tracking.
export const AXIS_TICK = {
  fontSize: 11,
  fontFamily: CHART_MONO,
  fill: 'rgba(26, 60, 43, 0.72)',
}

export const AXIS_LABEL = {
  fontSize: 11,
  fontFamily: CHART_MONO,
  fill: 'rgba(26, 60, 43, 0.72)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

export const TOOLTIP_SX = {
  '& .MuiChartsTooltip-root': {
    fontFamily: CHART_MONO,
    fontSize: 11,
  },
  '& .MuiPaper-root': {
    background: CHART_COLORS.paper,
    border: `1px solid ${CHART_COLORS.hairline}`,
    borderRadius: '2px',
    boxShadow: 'none',
    color: CHART_COLORS.forest,
  },
}

// Legend text also mono + muted.
export const LEGEND_SX = {
  '& .MuiChartsLegend-root': {
    fontSize: 11,
    fontFamily: CHART_MONO,
    fill: 'rgba(26, 60, 43, 0.72)',
  },
}

export function formatCurrency(value) {
  const n = Number(value) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n)
}

export function formatNumber(value) {
  const n = Number(value) || 0
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

export function compactCurrency(value) {
  const n = Number(value) || 0
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${n}`
}
