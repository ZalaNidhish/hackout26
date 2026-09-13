export const STATUS_META = {
  normal: {
    label: 'Normal',
    color: '#15803d',
    bg: '#dcfce7',
    border: '#16a34a',
    dotClass: 'bg-green-600',
    badgeClass: 'text-green-700 bg-green-100 border-green-200',
  },
  surplus: {
    label: 'Surplus',
    color: '#c2410c',
    bg: '#ffedd5',
    border: '#c2410c',
    dotClass: 'bg-yellow-700',
    badgeClass: 'text-yellow-900 bg-yellow-100 border-yellow-300',
  },
  shortage: {
    label: 'Shortage',
    color: '#b91c1c',
    bg: '#fee2e2',
    border: '#dc2626',
    dotClass: 'bg-red-600',
    badgeClass: 'text-red-700 bg-red-100 border-red-200',
  },
  emergency: {
    label: 'Emergency',
    color: '#6b21a8',
    bg: '#f3e8ff',
    border: '#9333ea',
    dotClass: 'bg-purple-700',
    badgeClass: 'text-purple-800 bg-purple-100 border-purple-300',
  },
};

export const CONFIDENCE_META = {
  High: {
    label: 'High',
    badgeClass: 'text-green-700 bg-green-100 border-green-200',
  },
  Medium: {
    label: 'Medium',
    badgeClass: 'text-amber-800 bg-amber-100 border-amber-200',
  },
  Low: {
    label: 'Low',
    badgeClass: 'text-red-700 bg-red-100 border-red-200',
  },
};

export const WINDOW_OPTIONS = [
  { value: 24, label: '24h' },
  { value: 48, label: '48h' },
  { value: 72, label: '72h' },
];

export function formatINR(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value)))}`;
}

export function formatNumber(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return Number(value).toFixed(digits);
}

export function formatTimestamp(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${mon}, ${hh}:00`;
}

export function formatFullTimestamp(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${d.getDate()} ${mon} ${d.getFullYear()}, ${hh}:${mm}`;
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function buildStatusRanges(points) {
  if (!points || !points.length) return [];
  const ranges = [];
  const normalized = points.map((p, idx) => ({ ...p, _idx: idx }));
  for (const p of normalized) {
    const last = ranges[ranges.length - 1];
    if (last && last.status === p.status) {
      last.toIdx = p._idx;
    } else {
      ranges.push({
        status: p.status,
        from: p.timestamp,
        to: p.timestamp,
        fromIdx: p._idx,
        toIdx: p._idx,
      });
    }
  }
  return ranges
    .filter((r) => r.status !== 'normal')
    .map((r) => {
      const next = normalized[r.toIdx + 1];
      return { ...r, to: next ? next.timestamp : r.to };
    });
}