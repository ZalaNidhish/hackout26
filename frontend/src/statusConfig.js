// Central definition of status colors, labels, and formatting.
// CRITICAL: surplus is YELLOW (not orange) to be distinctly different from red shortages.

export const STATUS_CONFIG = {
  normal: {
    label: 'Normal',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    hex: '#16a34a',
    hexBg: '#dcfce7',
    chartTint: 'rgba(22, 163, 74, 0.08)',
  },
  surplus: {
    label: 'Surplus',
    text: 'text-yellow-800 dark:text-yellow-300',
    bg: 'bg-yellow-50 dark:bg-yellow-950/50',
    dot: 'bg-yellow-500',
    border: 'border-yellow-300 dark:border-yellow-700',
    badge: 'text-yellow-800 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-950/60 border-yellow-300 dark:border-yellow-700',
    hex: '#eab308',
    hexBg: '#fef9c3',
    chartTint: 'rgba(234, 179, 8, 0.14)',
  },
  shortage: {
    label: 'Shortage',
    text: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-950/50',
    dot: 'bg-red-500',
    border: 'border-red-200 dark:border-red-800',
    badge: 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-800',
    hex: '#ef4444',
    hexBg: '#fee2e2',
    chartTint: 'rgba(239, 68, 68, 0.14)',
  },
  emergency: {
    label: 'Emergency',
    text: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    dot: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-800',
    badge: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800',
    hex: '#a855f7',
    hexBg: '#f3e8ff',
    chartTint: 'rgba(168, 85, 247, 0.16)',
  },
}

export function statusStyle(status) {
  const s = typeof status === 'string' ? status.toLowerCase().trim() : 'normal'
  if (s === 'surplus' || s === 'excess' || s === 'curtailment') return STATUS_CONFIG.surplus
  if (s === 'shortage' || s === 'deficit' || s === 'warning') return STATUS_CONFIG.shortage
  if (s === 'emergency' || s === 'critical') return STATUS_CONFIG.emergency
  return STATUS_CONFIG.normal
}

export function formatShortTime(point) {
  if (!point) return ''
  try {
    const raw = typeof point.timestamp === 'string' ? point.timestamp.replace(' ', 'T') : point.timestamp
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return `+${point?.hour_offset ?? 0}h`
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return `+${point?.hour_offset ?? 0}h`
  }
}

export function formatHourLabel(offset) {
  return `+${offset ?? 0}h`
}

export function formatINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  const rounded = Math.round(Number(value))
  return '₹' + new Intl.NumberFormat('en-IN').format(rounded)
}
