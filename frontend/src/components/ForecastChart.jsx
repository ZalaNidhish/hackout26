import { useMemo, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CloudLightning,
  Eye,
  EyeOff,
  Gauge,
  Layers,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { formatShortTime, statusStyle } from '../statusConfig.js'

const WINDOW_OPTIONS = [24, 48, 72]

const SHADE_FILL = {
  shortage: '#fee2e2',
  surplus: '#fef9c3',
  emergency: '#f3e8ff',
}

function buildShadeSegments(points) {
  const segments = []
  let current = null

  points.forEach((p) => {
    const shade = SHADE_FILL[p.status] ? p.status : null
    if (shade === current?.status) {
      current.x2 = p.hour_offset
    } else {
      if (current) segments.push(current)
      current = shade ? { status: shade, x1: p.hour_offset, x2: p.hour_offset } : null
    }
  })
  if (current) segments.push(current)
  return segments
}

function ChartTooltip({ active, payload, viewMode }) {
  if (!active || !payload || !payload.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  const style = statusStyle(point.status)
  const p50 = Number(point.p50 ?? 0)
  const demand = Number(point.demand_mw ?? 0)
  const p10 = Number(point.p10 ?? 0)
  const p90 = Number(point.p90 ?? 0)
  const margin = p50 - demand
  const isPositiveMargin = margin >= 0

  return (
    <div className="min-w-[260px] rounded-2xl border border-border/90 bg-white/95 p-4 text-xs shadow-2xl backdrop-blur-md transition-all">
      {/* Tooltip Header */}
      <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: style.hex }} />
          <span className="font-bold text-navy text-sm">
            {formatShortTime(point) || `Hour +${point.hour_offset}`}
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-600">
          +{point.hour_offset}h
        </span>
      </div>

      {/* Net Balance Highlight in Balance View */}
      {viewMode === 'balance' ? (
        <div className="mb-2.5 rounded-lg bg-slate-50/90 p-2.5 border border-border/70">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Net Power Balance
          </span>
          <div className="mt-0.5 flex items-center justify-between">
            <span
              className={`font-mono text-base font-extrabold ${
                isPositiveMargin ? 'text-ok' : 'text-danger'
              }`}
            >
              {isPositiveMargin ? `+${margin.toFixed(1)}` : margin.toFixed(1)} MW
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                isPositiveMargin ? 'bg-okbg text-ok' : 'bg-dangerbg text-danger'
              }`}
            >
              {isPositiveMargin ? 'Surplus Export' : 'Deficit Power'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1.5 text-[11px] text-slate-500">
            <span>P50: {p50.toFixed(1)} MW</span>
            <span>Demand: {demand.toFixed(1)} MW</span>
          </div>
        </div>
      ) : (
        /* Main Expected Value Callout in Generation View */
        <div className="mb-2.5 rounded-lg bg-slate-50/80 p-2 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500">Expected Output (P50)</span>
            <span className="text-base font-bold font-mono text-navy">{p50.toFixed(1)} MW</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>P10: {p10.toFixed(1)} MW</span>
            <span>P90: {p90.toFixed(1)} MW</span>
          </div>
        </div>
      )}

      {/* Demand & Net Margin details for Curve View */}
      {viewMode !== 'balance' && (
        <div className="space-y-1.5 text-slate-600 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="inline-block h-0.5 w-2.5 border-t-2 border-dashed border-rust" />
              Committed Demand:
            </span>
            <span className="font-mono font-bold text-rust">{demand.toFixed(1)} MW</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <span className="text-slate-500 font-medium">Net Margin:</span>
            <span
              className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                isPositiveMargin ? 'text-ok bg-okbg' : 'text-danger bg-dangerbg'
              }`}
            >
              {isPositiveMargin ? `+${margin.toFixed(1)}` : margin.toFixed(1)} MW
            </span>
          </div>
        </div>
      )}

      {/* Status Badge & Severe Weather */}
      <div className="mt-2.5 pt-2 border-t border-border/70 flex items-center justify-between">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
          style={{ color: style.hex, backgroundColor: style.hexBg }}
        >
          {style.label}
        </span>
        {point.severe_weather && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
            <CloudLightning size={11} /> Storm Alert
          </span>
        )}
      </div>

      {/* Operational Action Preview */}
      {point.action && (
        <div className="mt-2 pt-1.5 border-t border-border/50 text-[10px] text-slate-500 leading-tight">
          <span className="font-semibold text-slate-700">Action: </span>
          {point.action}
        </div>
      )}
    </div>
  )
}

function CustomXAxisTick({ x, y, payload, points }) {
  const offset = payload.value
  const pt = points?.find((p) => p.hour_offset === offset)
  const timeStr = pt ? formatShortTime(pt) : ''

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fill="#475569" fontSize={11} fontFamily="monospace" fontWeight={600}>
        +{offset}h
      </text>
      {timeStr && (
        <text x={0} y={0} dy={24} textAnchor="middle" fill="#94a3b8" fontSize={9.5} fontWeight={500}>
          {timeStr}
        </text>
      )}
    </g>
  )
}

export default function ForecastChart({ points, windowHours, onWindowChange, loading, capacity }) {
  // View mode switcher: 'generation' (default) vs 'balance' (Net Power Balance)
  const [viewMode, setViewMode] = useState('generation')

  // Layer toggles for interactive exploration
  const [showP50, setShowP50] = useState(true)
  const [showDemand, setShowDemand] = useState(true)
  const [showBand, setShowBand] = useState(true)
  const [showShading, setShowShading] = useState(true)
  const [showCapacity, setShowCapacity] = useState(true)

  const shadeSegments = useMemo(() => buildShadeSegments(points || []), [points])

  const chartData = useMemo(
    () =>
      (points || []).map((p) => {
        const p50 = Number(p.p50 ?? 0)
        const demand = Number(p.demand_mw ?? 0)
        const margin = Number((p50 - demand).toFixed(1))
        return {
          ...p,
          net_margin: margin,
          bandRange: Math.max(0, (p.p90 ?? 0) - (p.p10 ?? 0)),
        }
      }),
    [points]
  )

  // Calculate zero offset for Net Balance split gradient
  const zeroOffset = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0.5
    let maxM = 0
    let minM = 0
    chartData.forEach((d) => {
      if (d.net_margin > maxM) maxM = d.net_margin
      if (d.net_margin < minM) minM = d.net_margin
    })
    if (maxM <= 0) return 0
    if (minM >= 0) return 1
    return maxM / (maxM - minM)
  }, [chartData])

  // Comprehensive situational energy & power metrics
  const summary = useMemo(() => {
    if (!Array.isArray(points) || points.length === 0) return null
    let maxP50 = 0
    let peakHour = 0
    let sumP50 = 0
    let sumDemand = 0
    let maxDemand = 0
    let surplusHrs = 0
    let shortageHrs = 0

    points.forEach((p) => {
      const p50 = Number(p.p50 ?? 0)
      const dem = Number(p.demand_mw ?? 0)
      if (p50 > maxP50) {
        maxP50 = p50
        peakHour = p.hour_offset
      }
      sumP50 += p50
      sumDemand += dem
      if (dem > maxDemand) maxDemand = dem

      const s = typeof p.status === 'string' ? p.status.toLowerCase().trim() : 'normal'
      if (s === 'surplus' || s === 'excess' || s === 'curtailment') surplusHrs++
      else if (s === 'shortage' || s === 'warning' || s === 'deficit' || s === 'emergency' || s === 'critical') shortageHrs++
    })

    const avgP50 = sumP50 / points.length
    const totalGenMWh = sumP50.toFixed(1)
    const totalDemandMWh = sumDemand.toFixed(1)
    const netMWh = (sumP50 - sumDemand).toFixed(1)
    const capFactor = capacity && capacity > 0 ? ((avgP50 / capacity) * 100).toFixed(1) : null

    return {
      peakP50: maxP50.toFixed(1),
      peakHour,
      avgP50: avgP50.toFixed(1),
      peakDemand: maxDemand.toFixed(1),
      totalGenMWh,
      totalDemandMWh,
      netMWh,
      capFactor,
      surplusHrs,
      shortageHrs,
    }
  }, [points, capacity])

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-white p-5 sm:p-6 shadow-card transition-all">
      {/* Header: Title, View Switcher & Window Control */}
      <div className="mb-4 flex flex-col gap-4 border-b border-border/50 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-steel/10 text-steel">
            <TrendingUp size={20} strokeWidth={2.25} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-navy tracking-tight">Generation Forecast</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI Ensemble
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {viewMode === 'generation'
                ? 'P10–P90 probabilistic uncertainty band vs. committed dispatch demand'
                : 'Net instantaneous power balance (P50 Expected − Committed Demand)'}
            </p>
          </div>
        </div>

        {/* View Mode Switcher + Horizon Control */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dual Perspective Toggle: Curve vs Net Margin */}
          <div className="flex items-center rounded-xl border border-border/80 bg-slate-100/90 p-1 shadow-inner text-xs font-semibold">
            <button
              onClick={() => setViewMode('generation')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'generation'
                  ? 'bg-white text-navy shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-navy'
              }`}
            >
              <TrendingUp size={13} />
              <span>Forecast Curve</span>
            </button>
            <button
              onClick={() => setViewMode('balance')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                viewMode === 'balance'
                  ? 'bg-white text-navy shadow-sm ring-1 ring-slate-900/5'
                  : 'text-slate-500 hover:text-navy'
              }`}
            >
              <Zap size={13} className={viewMode === 'balance' ? 'text-amber-500' : ''} />
              <span>Net Power Balance</span>
            </button>
          </div>

          {/* 24h / 48h / 72h pill switcher */}
          <div className="flex items-center rounded-xl border border-border/80 bg-slate-100/90 p-1 shadow-inner">
            {WINDOW_OPTIONS.map((h) => (
              <button
                key={h}
                onClick={() => onWindowChange(h)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
                  windowHours === h
                    ? 'bg-white text-navy shadow-sm ring-1 ring-slate-900/5'
                    : 'text-slate-500 hover:text-navy hover:bg-white/40'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Micro-Metrics Bar: Energy (MWh) and Power (MW) */}
      {summary && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 rounded-xl border border-border/70 bg-slate-50/60 p-2.5 text-xs">
          {/* 1. Peak Generation */}
          <div className="rounded-lg bg-white p-2 border border-border/60 shadow-2xs">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Peak Gen</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono font-bold text-navy text-sm">{summary.peakP50} MW</span>
              <span className="text-[10px] text-slate-400 font-mono">(+{summary.peakHour}h)</span>
            </div>
          </div>

          {/* 2. Peak Demand */}
          <div className="rounded-lg bg-white p-2 border border-border/60 shadow-2xs">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Peak Demand</span>
            <div className="mt-0.5 font-mono font-bold text-rust text-sm">{summary.peakDemand} MW</div>
          </div>

          {/* 3. Total Forecast Energy (MWh) */}
          <div className="rounded-lg bg-white p-2 border border-border/60 shadow-2xs">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Total Generation</span>
            <div className="mt-0.5 font-mono font-bold text-steel text-sm">{summary.totalGenMWh} MWh</div>
          </div>

          {/* 4. Net Energy Balance (MWh) */}
          <div className="rounded-lg bg-white p-2 border border-border/60 shadow-2xs">
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Net Energy Balance</span>
            <div
              className={`mt-0.5 font-mono font-bold text-sm ${
                Number(summary.netMWh) >= 0 ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {Number(summary.netMWh) >= 0 ? `+${summary.netMWh}` : summary.netMWh} MWh
            </div>
          </div>

          {/* 5. Capacity Factor (if rated capacity available) */}
          {summary.capFactor ? (
            <div className="rounded-lg bg-white p-2 border border-border/60 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Capacity Factor</span>
              <div className="mt-0.5 font-mono font-bold text-navy text-sm">{summary.capFactor}%</div>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-2 border border-border/60 shadow-2xs">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Avg Hourly Gen</span>
              <div className="mt-0.5 font-mono font-bold text-steel text-sm">{summary.avgP50} MW</div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="skeleton h-[400px] xl:h-[440px] 2xl:h-[480px] w-full rounded-xl" />
      ) : !points || points.length === 0 ? (
        <div className="flex h-[400px] xl:h-[440px] 2xl:h-[480px] items-center justify-center text-sm text-slate-400">
          No forecast curve available for this window.
        </div>
      ) : (
        <>
          {/* Main Chart Area */}
          <div className="h-[400px] xl:h-[440px] 2xl:h-[480px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -10, bottom: 10 }}
              >
                <defs>
                  {/* Subtle area gradient under P50 */}
                  <linearGradient id="p50AreaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0.0} />
                  </linearGradient>

                  {/* Uncertainty Band gradient */}
                  <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0.04} />
                  </linearGradient>

                  {/* Split Gradient for Net Margin Balance view */}
                  <linearGradient id="splitMarginGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                    <stop offset={`${zeroOffset * 100}%`} stopColor="#f97316" stopOpacity={0.05} />
                    <stop offset={`${zeroOffset * 100}%`} stopColor="#dc2626" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.35} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  strokeOpacity={1}
                  vertical={false}
                />

                <XAxis
                  dataKey="hour_offset"
                  interval="preserveStartEnd"
                  minTickGap={28}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={<CustomXAxisTick points={points} />}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  unit=" MW"
                  dx={-2}
                />

                <Tooltip content={<ChartTooltip viewMode={viewMode} />} />

                {/* 0 MW Baseline Reference */}
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />

                {/* Rated Capacity Line (if provided) */}
                {capacity && capacity > 0 && showCapacity && viewMode === 'generation' && (
                  <ReferenceLine
                    y={capacity}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth={1.25}
                    label={{
                      value: `Rated Capacity: ${capacity} MW`,
                      position: 'top',
                      fill: '#64748b',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                )}

                {/* ================= MODE 1: STANDARD GENERATION & DEMAND ================= */}
                {viewMode === 'generation' && (
                  <>
                    {/* Risk Window Shading Areas */}
                    {showShading &&
                      shadeSegments.map((seg, i) => (
                        <ReferenceArea
                          key={i}
                          x1={seg.x1}
                          x2={seg.x2}
                          fill={SHADE_FILL[seg.status]}
                          fillOpacity={0.45}
                          strokeOpacity={0}
                        />
                      ))}

                    {/* Uncertainty Band Area (P10 to P90) */}
                    {showBand && (
                      <>
                        <Area
                          type="monotone"
                          dataKey="p10"
                          stackId="band"
                          stroke="none"
                          fill="transparent"
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="bandRange"
                          stackId="band"
                          stroke="none"
                          fill="url(#bandGradient)"
                          isAnimationActive={false}
                        />
                      </>
                    )}

                    {/* Radiant area glow under P50 */}
                    {showP50 && (
                      <Area
                        type="monotone"
                        dataKey="p50"
                        stroke="none"
                        fill="url(#p50AreaGlow)"
                        isAnimationActive={false}
                      />
                    )}

                    {/* Expected Output (P50) Line */}
                    {showP50 && (
                      <Line
                        type="monotone"
                        dataKey="p50"
                        name="Expected (P50)"
                        stroke="#1e3a5f"
                        strokeWidth={2.75}
                        dot={false}
                        activeDot={{
                          r: 5,
                          fill: '#1e3a5f',
                          stroke: '#ffffff',
                          strokeWidth: 2.5,
                        }}
                        isAnimationActive={false}
                      />
                    )}

                    {/* Committed Demand Line */}
                    {showDemand && (
                      <Line
                        type="monotone"
                        dataKey="demand_mw"
                        name="Demand"
                        stroke="#ea580c"
                        strokeWidth={2.25}
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={{
                          r: 4.5,
                          fill: '#ea580c',
                          stroke: '#ffffff',
                          strokeWidth: 2,
                        }}
                        isAnimationActive={false}
                      />
                    )}
                  </>
                )}

                {/* ================= MODE 2: NET POWER BALANCE (MARGIN VIEW) ================= */}
                {viewMode === 'balance' && (
                  <>
                    {/* Area fill for Net Margin */}
                    <Area
                      type="monotone"
                      dataKey="net_margin"
                      name="Net Margin"
                      stroke="#1e3a5f"
                      strokeWidth={2.25}
                      fill="url(#splitMarginGlow)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: '#1e3a5f',
                        stroke: '#ffffff',
                        strokeWidth: 2.5,
                      }}
                      isAnimationActive={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Legend & Layer Controls */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-y-3 border-t border-border/70 pt-3.5 text-xs">
            {/* Left: Clickable layer toggles based on viewMode */}
            {viewMode === 'generation' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowP50((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-all ${
                    showP50
                      ? 'border-steel/40 bg-steel/5 text-navy font-semibold'
                      : 'border-border bg-slate-50 text-slate-400 line-through'
                  }`}
                  title="Toggle P50 Line"
                >
                  <span className="inline-block h-1 w-3.5 rounded-full bg-steel" />
                  <span>P50 Expected</span>
                </button>

                <button
                  onClick={() => setShowDemand((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-all ${
                    showDemand
                      ? 'border-orange-300 bg-orange-50/50 text-orange-900 font-semibold'
                      : 'border-border bg-slate-50 text-slate-400 line-through'
                  }`}
                  title="Toggle Demand Line"
                >
                  <span className="inline-block h-0.5 w-3.5 border-t-2 border-dashed border-rust" />
                  <span>Demand Schedule</span>
                </button>

                <button
                  onClick={() => setShowBand((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-all ${
                    showBand
                      ? 'border-steel/40 bg-steel/5 text-slate-700 font-semibold'
                      : 'border-border bg-slate-50 text-slate-400 line-through'
                  }`}
                  title="Toggle Uncertainty Band"
                >
                  <span className="inline-block h-2.5 w-3.5 rounded-sm bg-steel/20 border border-steel/30" />
                  <span>P10–P90 Band</span>
                </button>

                <button
                  onClick={() => setShowShading((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-all ${
                    showShading
                      ? 'border-border bg-slate-50 text-slate-600 font-medium'
                      : 'border-border bg-slate-50 text-slate-400 line-through'
                  }`}
                  title="Toggle Risk Zones"
                >
                  {showShading ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>Risk Zones</span>
                </button>

                {capacity && capacity > 0 && (
                  <button
                    onClick={() => setShowCapacity((v) => !v)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition-all ${
                      showCapacity
                        ? 'border-border bg-slate-50 text-slate-700 font-medium'
                        : 'border-border bg-slate-50 text-slate-400 line-through'
                    }`}
                    title="Toggle Plant Capacity Reference Line"
                  >
                    <span className="inline-block h-0.5 w-3 border-t border-dashed border-slate-500" />
                    <span>Capacity ({capacity} MW)</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-200 bg-yellow-50/60 px-2.5 py-1 text-xs font-semibold text-yellow-900">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  <span>Above 0 MW: Net Surplus Generation</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-1 text-xs font-semibold text-red-900">
                  <span className="h-2 w-2 rounded-full bg-red-600" />
                  <span>Below 0 MW: Net Shortage Deficit</span>
                </span>
              </div>
            )}

            {/* Right: Risk Horizon Breakdown chips */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-yellow-50 px-2.5 py-1 font-semibold text-yellow-800 border border-yellow-200">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                Surplus {summary?.surplusHrs ? `(${summary.surplusHrs}h)` : ''}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 font-semibold text-red-800 border border-red-200">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                Shortage {summary?.shortageHrs ? `(${summary.shortageHrs}h)` : ''}
              </span>
              {shadeSegments.some((s) => s.status === 'emergency') && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2.5 py-1 font-semibold text-purple-800 border border-purple-200">
                  <span className="h-2 w-2 rounded-full bg-purple-700" />
                  Emergency
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}


