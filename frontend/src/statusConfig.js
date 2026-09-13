// Central definition of how each forecast point status is labeled and colored.
// Keeping this in one place means every component (chart, heatmap, alerts, table)
// stays visually consistent.

export const STATUS_CONFIG = {
  normal: {
    label: 'Normal',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-600',
    border: 'border-emerald-300',
    hex: '#16a34a',
    hexBg: '#dcfce7',
  },
  surplus: {
    label: 'Surplus',
    text: 'text-yellow-800',
    bg: 'bg-yellow-100',
    dot: 'bg-yellow-500',
    border: 'border-yellow-300',
    hex: '#ca8a04',
    hexBg: '#fef9c3',
  },
  shortage: {
    label: 'Shortage',
    text: 'text-red-800',
    bg: 'bg-red-100',
    dot: 'bg-red-600',
    border: 'border-red-300',
    hex: '#dc2626',
    hexBg: '#fee2e2',
  },
  emergency: {
    label: 'Emergency',
    text: 'text-purple-700',
    bg: 'bg-purple-50',
    dot: 'bg-purple-700',
    border: 'border-purple-300',
    hex: '#7e22ce',
    hexBg: '#f3e8ff',
  },
  critical: {
    label: 'Emergency',
    text: 'text-emergency',
    bg: 'bg-emergencybg',
    dot: 'bg-emergency',
    border: 'border-emergency',
    hex: '#6b21a8',
    hexBg: '#f3e8ff',
  },
  warning: {
    label: 'Shortage',
    text: 'text-red-700',
    bg: 'bg-red-50',
    dot: 'bg-red-600',
    border: 'border-red-300',
    hex: '#dc2626',
    hexBg: '#fee2e2',
  },
  deficit: {
    label: 'Shortage',
    text: 'text-red-700',
    bg: 'bg-red-50',
    dot: 'bg-red-600',
    border: 'border-red-300',
    hex: '#dc2626',
    hexBg: '#fee2e2',
  },
  excess: {
    label: 'Surplus',
    text: 'text-yellow-800',
    bg: 'bg-yellow-100',
    dot: 'bg-yellow-500',
    border: 'border-yellow-300',
    hex: '#ca8a04',
    hexBg: '#fef9c3',
  },
  curtailment: {
    label: 'Surplus',
    text: 'text-yellow-800',
    bg: 'bg-yellow-100',
    dot: 'bg-yellow-500',
    border: 'border-yellow-300',
    hex: '#ca8a04',
    hexBg: '#fef9c3',
  },
  ok: {
    label: 'Normal',
    text: 'text-ok',
    bg: 'bg-okbg',
    dot: 'bg-ok',
    border: 'border-ok',
    hex: '#15803d',
    hexBg: '#dcfce7',
  },
}

export function statusStyle(status) {
  const normalized = typeof status === 'string' ? status.toLowerCase().trim() : 'normal'
  return STATUS_CONFIG[normalized] || STATUS_CONFIG.normal
}

function parsePointDate(point) {
  if (!point || !point.timestamp) return null
  try {
    const raw = typeof point.timestamp === 'string' ? point.timestamp.replace(' ', 'T') : point.timestamp
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export function formatHourLabel(point) {
  if (!point) return ''
  const d = parsePointDate(point)
  if (!d) return `+${point.hour_offset ?? 0}h`
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatShortTime(point) {
  if (!point) return ''
  const d = parsePointDate(point)
  if (!d) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatFullDateTime(point) {
  if (!point) return ''
  const d = parsePointDate(point)
  if (!d) return `Hour +${point.hour_offset ?? 0}`
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  const rounded = Math.round(Number(value))
  return `Rs. ${new Intl.NumberFormat('en-IN').format(rounded)}`
}
