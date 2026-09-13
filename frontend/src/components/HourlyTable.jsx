import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BatteryCharging,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { formatHourLabel, statusStyle } from '../statusConfig.js'

const COLUMNS = [
  { key: 'hour_offset', label: 'Hour', align: 'left' },
  { key: 'timestamp', label: 'Time & Date', align: 'left' },
  { key: 'wind_speed_100m', label: 'Wind (m/s)', align: 'right' },
  { key: 'p10', label: 'P10 Floor', align: 'right' },
  { key: 'p50', label: 'P50 Expected', align: 'right' },
  { key: 'p90', label: 'P90 Ceiling', align: 'right' },
  { key: 'demand_mw', label: 'Committed Demand', align: 'right' },
  { key: 'net_margin', label: 'Net Margin', align: 'right' },
  { key: 'status', label: 'Grid State', align: 'center' },
  { key: 'action', label: 'Recommended Action', align: 'left' },
]

function getFormattedTimestamp(p) {
  if (!p || !p.timestamp) return { time: `+${p?.hour_offset ?? 0}h`, date: 'Horizon' }
  try {
    const raw = typeof p.timestamp === 'string' ? p.timestamp.replace(' ', 'T') : p.timestamp
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return { time: `+${p.hour_offset}h`, date: 'Horizon' }

    const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    return { time: timeStr, date: dateStr }
  } catch {
    return { time: `+${p.hour_offset}h`, date: 'Horizon' }
  }
}

function getActionIcon(actionText = '') {
  const t = actionText.toLowerCase()
  if (t.includes('bess') || t.includes('charge') || t.includes('battery')) {
    return <BatteryCharging size={13} className="shrink-0 text-amber-600" />
  }
  if (t.includes('curtail') || t.includes('market') || t.includes('dam') || t.includes('sell') || t.includes('rtm') || t.includes('surplus')) {
    return <TrendingUp size={13} className="shrink-0 text-orange-600" />
  }
  if (t.includes('procure') || t.includes('shortage') || t.includes('deficit') || t.includes('buy') || t.includes('peak') || t.includes('feather')) {
    return <AlertTriangle size={13} className="shrink-0 text-red-600" />
  }
  return <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
}

export default function HourlyTable({ points, loading }) {
  const [collapsed, setCollapsed] = useState(false)
  const [sort, setSort] = useState({ key: 'hour_offset', dir: 'asc' })
  const [statusFilter, setStatusFilter] = useState('all')
  const [horizonFilter, setHorizonFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const hasWindData = useMemo(() => {
    return Array.isArray(points) && points.some((p) => p.wind_speed_100m !== undefined || p.wind_speed_10m !== undefined)
  }, [points])

  const stats = useMemo(() => {
    if (!points || points.length === 0) {
      return { total: 0, surplus: 0, shortage: 0, normal: 0, avgP50: '0.0', avgDemand: '0.0', netMargin: '0.0' }
    }
    let surplus = 0
    let shortage = 0
    let normal = 0
    let sumP50 = 0
    let sumDemand = 0

    points.forEach((p) => {
      const s = (p.status || '').toLowerCase()
      if (s === 'surplus' || s === 'excess' || s === 'curtailment') surplus++
      else if (s === 'shortage' || s === 'deficit' || s === 'warning' || s === 'emergency' || s === 'critical') shortage++
      else normal++

      sumP50 += Number(p.p50 || 0)
      sumDemand += Number(p.demand_mw || 0)
    })

    const total = points.length
    const avgP50 = (sumP50 / total).toFixed(1)
    const avgDemand = (sumDemand / total).toFixed(1)
    const diff = (sumP50 - sumDemand) / total
    const netMargin = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)

    return { total, surplus, shortage, normal, avgP50, avgDemand, netMargin }
  }, [points])

  const filteredPoints = useMemo(() => {
    if (!points) return []
    return points.filter((p) => {
      if (horizonFilter === '24' && p.hour_offset >= 24) return false
      if (horizonFilter === '48' && (p.hour_offset < 24 || p.hour_offset >= 48)) return false
      if (horizonFilter === '72' && p.hour_offset < 48) return false

      if (statusFilter !== 'all') {
        const s = (p.status || '').toLowerCase()
        if (statusFilter === 'surplus' && !(s === 'surplus' || s === 'excess' || s === 'curtailment')) return false
        if (statusFilter === 'shortage' && !(s === 'shortage' || s === 'deficit' || s === 'warning' || s === 'emergency' || s === 'critical')) return false
        if (statusFilter === 'normal' && !(s === 'normal' || s === 'ok')) return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const hourStr = `+${p.hour_offset}h`
        const statusStr = (p.status || '').toLowerCase()
        const actionStr = (p.action || '').toLowerCase()
        const timeStr = (p.timestamp || '').toLowerCase()
        if (
          !hourStr.includes(q) &&
          !String(p.hour_offset).includes(q) &&
          !statusStr.includes(q) &&
          !actionStr.includes(q) &&
          !timeStr.includes(q)
        ) {
          return false
        }
      }

      return true
    })
  }, [points, statusFilter, horizonFilter, searchQuery])

  const sorted = useMemo(() => {
    const arr = [...(filteredPoints || [])]
    arr.sort((a, b) => {
      let va = a[sort.key]
      let vb = b[sort.key]

      if (sort.key === 'net_margin') {
        va = Number(a.p50 ?? 0) - Number(a.demand_mw ?? 0)
        vb = Number(b.p50 ?? 0) - Number(b.demand_mw ?? 0)
      } else if (
        sort.key === 'hour_offset' ||
        sort.key === 'p10' ||
        sort.key === 'p50' ||
        sort.key === 'p90' ||
        sort.key === 'demand_mw' ||
        sort.key === 'wind_speed_100m'
      ) {
        va = Number(va ?? 0)
        vb = Number(vb ?? 0)
      }

      if (typeof va === 'string') {
        return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      return sort.dir === 'asc' ? va - vb : vb - va
    })
    return arr
  }, [filteredPoints, sort])

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    )
  }

  function handleExportCsv() {
    if (!points || points.length === 0) return
    const headers = [
      'Hour Offset',
      'Timestamp',
      'Wind Speed (m/s)',
      'Wind Direction',
      'P10 Floor (MW)',
      'P50 Expected (MW)',
      'P90 Ceiling (MW)',
      'Committed Demand (MW)',
      'Net Margin (MW)',
      'Grid State',
      'Recommended Action',
    ]

    const dataset = filteredPoints.length > 0 ? filteredPoints : points
    const rows = dataset.map((p) => {
      const windSpeed = p.wind_speed_100m ?? p.wind_speed_10m ?? ''
      const windDir = p.wind_direction_cardinal || (p.wind_direction ? `${p.wind_direction}°` : '')
      const p10 = p.p10 !== undefined ? Number(p.p10).toFixed(2) : ''
      const p50 = p.p50 !== undefined ? Number(p.p50).toFixed(2) : ''
      const p90 = p.p90 !== undefined ? Number(p.p90).toFixed(2) : ''
      const dem = p.demand_mw !== undefined ? Number(p.demand_mw).toFixed(2) : ''
      const margin =
        p.p50 !== undefined && p.demand_mw !== undefined
          ? (Number(p.p50) - Number(p.demand_mw)).toFixed(2)
          : ''
      const action = (p.action || '').replace(/"/g, '""')

      return [
        `+${p.hour_offset}h`,
        p.timestamp || '',
        windSpeed,
        windDir,
        p10,
        p50,
        p90,
        dem,
        margin,
        p.status || '',
        `"${action}"`,
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `realtime_dispatch_schedule_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const isFiltered = statusFilter !== 'all' || horizonFilter !== 'all' || searchQuery.trim() !== ''

  return (
    <div className="rounded-xl border border-border/80 bg-white shadow-card overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/70 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate/20 bg-slate-50 text-slate shadow-sm">
            <CalendarClock size={20} className="text-slate" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-navy tracking-tight">Hourly Generation &amp; Weather Detail</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                {stats.total} Intervals
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live hourly wind speeds, multi-quantile generation, committed dispatch demand &amp; operational actions
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/60 px-2.5 py-1 text-xs font-semibold text-yellow-800 dark:text-yellow-300">
            <span className="h-2 w-2 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50" />
            <span>Surplus: {stats.surplus}h</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/60 px-2.5 py-1 text-xs font-semibold text-red-800 dark:text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-600 shadow-sm shadow-red-600/50" />
            <span>Shortage: {stats.shortage}h</span>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={!points || points.length === 0}
            title="Export full schedule to CSV"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate/40 hover:bg-slate-50 hover:text-navy focus:outline-none focus:ring-2 focus:ring-slate/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={13} className="text-slate-500" />
            <span className="hidden xs:inline">Export CSV</span>
          </button>

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-navy focus:outline-none"
            title={collapsed ? 'Expand hourly detail table' : 'Collapse hourly detail table'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div>
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 border-b border-border/60 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Filter:
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-border hover:border-slate/30 hover:bg-slate-100'
                }`}
              >
                All ({stats.total})
              </button>

              <button
                onClick={() => setStatusFilter('surplus')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  statusFilter === 'surplus'
                    ? 'bg-yellow-500 text-white shadow-sm shadow-yellow-500/20'
                    : 'bg-white dark:bg-slate-800 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700 hover:bg-yellow-50'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === 'surplus' ? 'bg-white' : 'bg-yellow-500'}`} />
                Surplus ({stats.surplus})
              </button>

              <button
                onClick={() => setStatusFilter('shortage')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  statusFilter === 'shortage'
                    ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                    : 'bg-white text-red-800 border border-red-200 hover:bg-red-50'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === 'shortage' ? 'bg-white' : 'bg-red-600'}`} />
                Shortage ({stats.shortage})
              </button>

              <button
                onClick={() => setStatusFilter('normal')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  statusFilter === 'normal'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === 'normal' ? 'bg-white' : 'bg-emerald-600'}`} />
                Normal ({stats.normal})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-white p-0.5 shadow-sm text-xs">
                <button
                  onClick={() => setHorizonFilter('all')}
                  className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                    horizonFilter === 'all' ? 'bg-slate-100 font-bold text-navy' : 'text-slate-500 hover:text-navy'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHorizonFilter('24')}
                  className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                    horizonFilter === '24' ? 'bg-slate-100 font-bold text-navy' : 'text-slate-500 hover:text-navy'
                  }`}
                >
                  0–24h
                </button>
                <button
                  onClick={() => setHorizonFilter('48')}
                  className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                    horizonFilter === '48' ? 'bg-slate-100 font-bold text-navy' : 'text-slate-500 hover:text-navy'
                  }`}
                >
                  24–48h
                </button>
                <button
                  onClick={() => setHorizonFilter('72')}
                  className={`rounded-md px-2 py-0.5 font-medium transition-colors ${
                    horizonFilter === '72' ? 'bg-slate-100 font-bold text-navy' : 'text-slate-500 hover:text-navy'
                  }`}
                >
                  48–72h
                </button>
              </div>

              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hour, action..."
                  className="w-36 sm:w-44 rounded-lg border border-border bg-white py-1 pl-8 pr-7 text-xs text-navy placeholder:text-slate-400 focus:border-slate focus:outline-none focus:ring-1 focus:ring-slate/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-9 w-full rounded-lg" />
              ))}
            </div>
          ) : !points || points.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No forecast intervals available.
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm font-semibold text-navy">No intervals match your filter criteria</p>
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setHorizonFilter('all')
                  setSearchQuery('')
                }}
                className="mt-3 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-navy"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[920px] text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-sm text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-border shadow-sm">
                  <tr>
                    {COLUMNS.map((col) => {
                      const isActive = sort.key === col.key
                      return (
                        <th
                          key={col.key}
                          className={`whitespace-nowrap px-4 py-3 ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          <button
                            onClick={() => toggleSort(col.key)}
                            className={`inline-flex items-center gap-1 transition-colors hover:text-navy ${
                              isActive ? 'text-navy font-extrabold' : ''
                            }`}
                          >
                            <span>{col.label}</span>
                            {isActive ? (
                              sort.dir === 'asc' ? (
                                <ArrowUp size={12} className="text-navy stroke-[2.5]" />
                              ) : (
                                <ArrowDown size={12} className="text-navy stroke-[2.5]" />
                              )
                            ) : (
                              <ArrowUpDown size={11} className="opacity-30 group-hover:opacity-70" />
                            )}
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/60">
                  {sorted.map((p) => {
                    const style = statusStyle(p.status)
                    const isShortage =
                      p.status === 'shortage' ||
                      p.status === 'deficit' ||
                      p.status === 'warning' ||
                      p.status === 'emergency' ||
                      p.status === 'critical'
                    const isSurplus =
                      p.status === 'surplus' ||
                      p.status === 'excess' ||
                      p.status === 'curtailment'

                    const p10Num = p.p10 !== undefined ? Number(p.p10) : null
                    const p50Num = p.p50 !== undefined ? Number(p.p50) : null
                    const p90Num = p.p90 !== undefined ? Number(p.p90) : null
                    const demandNum = p.demand_mw !== undefined ? Number(p.demand_mw) : null
                    const windSpeed = p.wind_speed_100m ?? p.wind_speed_10m ?? null
                    const windDir = p.wind_direction_cardinal || (p.wind_direction ? `${p.wind_direction}°` : '')

                    const margin =
                      p50Num !== null && demandNum !== null
                        ? Number((p50Num - demandNum).toFixed(1))
                        : null

                    const { time, date } = getFormattedTimestamp(p)

                    let rowBg = 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors'
                    if (isShortage) {
                      rowBg = 'bg-red-50/20 dark:bg-red-950/20 hover:bg-red-50/40 dark:hover:bg-red-950/40 transition-colors'
                    } else if (isSurplus) {
                      rowBg = 'bg-yellow-50/20 dark:bg-yellow-950/20 hover:bg-yellow-50/40 dark:hover:bg-yellow-950/40 transition-colors'
                    }

                    return (
                      <tr key={p.hour_offset} className={rowBg}>
                        {/* Hour */}
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-navy">
                            +{p.hour_offset}h
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <div className="flex flex-col leading-tight">
                            <span className="font-semibold text-navy">{time}</span>
                            <span className="text-[10px] text-slate-400">{date}</span>
                          </div>
                        </td>

                        {/* Wind Speed (m/s) */}
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">
                          {windSpeed !== null ? (
                            <div className="inline-flex items-center gap-1">
                              <span className="font-bold text-sky-700">{Number(windSpeed).toFixed(1)}</span>
                              <span className="text-[10px] text-slate-400">m/s</span>
                              {windDir && (
                                <span className="rounded bg-sky-50 px-1 text-[9.5px] font-bold text-sky-800 border border-sky-200 ml-0.5">
                                  {windDir}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* P10 */}
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-slate-500">
                          {p10Num !== null ? p10Num.toFixed(1) : '—'}{' '}
                          <span className="text-[10px] text-slate-400 font-sans">MW</span>
                        </td>

                        {/* P50 */}
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <span className="font-mono font-bold text-slate text-[13px]">
                            {p50Num !== null ? p50Num.toFixed(1) : '—'}{' '}
                            <span className="text-[10px] text-slate-400 font-sans font-normal">MW</span>
                          </span>
                        </td>

                        {/* P90 */}
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-slate-500">
                          {p90Num !== null ? p90Num.toFixed(1) : '—'}{' '}
                          <span className="text-[10px] text-slate-400 font-sans">MW</span>
                        </td>

                        {/* Demand */}
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <span className="font-mono font-semibold text-rust">
                            {demandNum !== null ? demandNum.toFixed(1) : '—'}{' '}
                            <span className="text-[10px] text-rust/70 font-sans font-normal">MW</span>
                          </span>
                        </td>

                        {/* Net Margin */}
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono">
                          {margin !== null ? (
                            <span
                              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                                margin > 0.1
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                  : margin < -0.1
                                  ? 'bg-red-50 text-red-700 border border-red-200/70'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {margin > 0.1 ? (
                                <ArrowUp size={10} className="stroke-[2.5]" />
                              ) : margin < -0.1 ? (
                                <ArrowDown size={10} className="stroke-[2.5]" />
                              ) : null}
                              {margin > 0 ? `+${margin.toFixed(1)}` : margin.toFixed(1)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-4 py-2.5 text-center">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-2xs"
                            style={{
                              color: style.hex,
                              backgroundColor: style.hexBg,
                              border: `1px solid ${style.hex}30`,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: style.hex }}
                            />
                            {style.label}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="max-w-[320px] px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {getActionIcon(p.action)}
                            <span
                              className="truncate text-xs font-medium text-slate-700 hover:text-navy cursor-help"
                              title={p.action || 'Optimal generation dispatch'}
                            >
                              {p.action || 'Optimal generation dispatch'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/70 bg-slate-50/50 px-5 py-2.5 text-xs text-slate-500">
            <span className="font-semibold text-navy">
              Showing {sorted.length} of {stats.total} intervals
            </span>
            <span className="text-[11px] text-slate-400">
              Live hub-height wind speed vector and aerodynamic energy conversion
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
