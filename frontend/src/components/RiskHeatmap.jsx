import { useEffect, useMemo, useState } from 'react'
import { CloudLightning, Info, Zap } from 'lucide-react'
import { formatShortTime, statusStyle } from '../statusConfig.js'

export default function RiskHeatmap({ points, loading }) {
  const [hoverIdx, setHoverIdx] = useState(null)

  // Reset hover state if points dataset changes
  useEffect(() => {
    setHoverIdx(null)
  }, [points])

  const totalPoints = Array.isArray(points) ? points.length : 0
  const validHover = hoverIdx !== null && hoverIdx >= 0 && hoverIdx < totalPoints
  const hovered = validHover ? points[hoverIdx] : null

  // Calculate status summary stats across horizon
  const stats = useMemo(() => {
    if (!Array.isArray(points) || points.length === 0) {
      return { normal: 0, shortage: 0, surplus: 0, emergency: 0, severeWeatherCount: 0 }
    }
    const counts = { normal: 0, shortage: 0, surplus: 0, emergency: 0, severeWeatherCount: 0 }
    points.forEach((p) => {
      const s = typeof p?.status === 'string' ? p.status.toLowerCase().trim() : 'normal'
      if (s === 'emergency' || s === 'critical') counts.emergency++
      else if (s === 'shortage' || s === 'warning' || s === 'deficit') counts.shortage++
      else if (s === 'surplus' || s === 'curtailment' || s === 'excess') counts.surplus++
      else counts.normal++

      if (p?.severe_weather) counts.severeWeatherCount++
    })
    return counts
  }, [points])

  // Precision tooltip coordinates with boundary clamping & caret alignment
  let tooltipStyle = {}
  let arrowStyle = {}
  if (validHover && totalPoints > 0) {
    const pct = ((hoverIdx + 0.5) / totalPoints) * 100
    if (pct < 16) {
      tooltipStyle = { left: '0px', transform: 'none' }
      arrowStyle = { left: `${Math.max(6, pct)}%` }
    } else if (pct > 84) {
      tooltipStyle = { right: '0px', left: 'auto', transform: 'none' }
      arrowStyle = { right: `${Math.max(6, 100 - pct)}%`, left: 'auto' }
    } else {
      tooltipStyle = { left: `${pct}%`, transform: 'translateX(-50%)' }
      arrowStyle = { left: '50%', transform: 'translateX(-50%)' }
    }
  }

  const firstPoint = totalPoints > 0 ? points[0] : null
  const midPoint = totalPoints > 1 ? points[Math.floor(totalPoints / 2)] : null
  const lastPoint = totalPoints > 0 ? points[totalPoints - 1] : null

  return (
    <div className="rounded-xl border border-border/80 bg-white p-5 shadow-card transition-all">
      {/* Header with Title and Status Legend */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-navy tracking-tight">Risk Timeline Ribbon</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 font-mono">
              {totalPoints}h Horizon
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous hourly operational dispatch classification • Hover to scrub
          </p>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
          <LegendDot status="normal" label="Normal" count={stats.normal} />
          <LegendDot status="surplus" label="Surplus" count={stats.surplus} />
          <LegendDot status="shortage" label="Shortage" count={stats.shortage} />
          {stats.emergency > 0 && (
            <LegendDot status="emergency" label="Emergency" count={stats.emergency} />
          )}
          {stats.severeWeatherCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600">
              <CloudLightning size={12} className="shrink-0" />
              <span>Storm ({stats.severeWeatherCount})</span>
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-12 w-full rounded-lg" />
          <div className="skeleton h-6 w-full rounded-lg" />
        </div>
      ) : totalPoints === 0 ? (
        <div className="flex h-16 items-center justify-center text-sm text-slate-400">
          No timeline intervals available for this window.
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Ribbon Strip Container with Floating Tooltip */}
          <div className="relative pt-1 pb-1">
            {/* The Timeline Ribbon Strip */}
            <div
              className="flex h-12 w-full gap-[2px] rounded-lg bg-slate-100 p-1 select-none"
              onMouseLeave={() => setHoverIdx(null)}
            >
              {points.map((p, i) => {
                const style = statusStyle(p?.status)
                const isHovered = hoverIdx === i
                return (
                  <div
                    key={`cell-${p?.hour_offset ?? i}-${i}`}
                    onMouseEnter={() => setHoverIdx(i)}
                    onClick={() => setHoverIdx(isHovered ? null : i)}
                    className={`relative h-full flex-1 cursor-pointer rounded-[2px] transition-all duration-100 ${
                      isHovered
                        ? 'scale-y-125 ring-2 ring-navy ring-offset-1 z-20 brightness-110'
                        : 'hover:scale-y-110 hover:brightness-105'
                    }`}
                    style={{ minWidth: 2, backgroundColor: style.hex }}
                  >
                    {p?.severe_weather && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-sm" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Floating Tooltip Card (Clamped & Perfectly Positioned Above Ribbon) */}
            {hovered && (
              <div
                className="pointer-events-none absolute bottom-full mb-3.5 z-30 w-60 rounded-xl border border-border/90 bg-white p-3.5 text-xs shadow-2xl backdrop-blur-sm animate-fadeIn"
                style={tooltipStyle}
              >
                {/* Header row: Time and Hour offset */}
                <div className="flex items-center justify-between border-b border-border/70 pb-1.5 mb-2">
                  <span className="font-bold text-navy">
                    {formatShortTime(hovered) || `Hour +${hovered.hour_offset}`}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600">
                    +{hovered.hour_offset ?? 0}h
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">P50 Expected:</span>
                    <span className="font-bold text-navy font-mono">
                      {Number(hovered.p50 ?? 0).toFixed(1)} MW
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Committed Demand:</span>
                    <span className="font-bold text-slate font-mono">
                      {Number(hovered.demand_mw ?? 0).toFixed(1)} MW
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border/50">
                    <span className="text-slate-400">Net Margin:</span>
                    {(() => {
                      const net = Number(hovered.p50 ?? 0) - Number(hovered.demand_mw ?? 0)
                      const isPositive = net >= 0
                      return (
                        <span className={`font-bold font-mono ${isPositive ? 'text-ok' : 'text-danger'}`}>
                          {isPositive ? `+${net.toFixed(1)}` : net.toFixed(1)} MW
                        </span>
                      )
                    })()}
                  </div>
                </div>

                {/* Status Badge & Storm Alert */}
                <div className="mt-2 pt-1.5 border-t border-border/70 flex items-center justify-between">
                  <span
                    className="rounded px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      color: statusStyle(hovered.status).hex,
                      backgroundColor: statusStyle(hovered.status).hexBg,
                    }}
                  >
                    {statusStyle(hovered.status).label}
                  </span>
                  {hovered.severe_weather && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                      <CloudLightning size={11} /> Storm Alert
                    </span>
                  )}
                </div>

                {/* Downward pointing triangle pointer caret */}
                <div
                  className="absolute -bottom-1.5 h-3 w-3 rotate-45 border-r border-b border-border/90 bg-white"
                  style={arrowStyle}
                />
              </div>
            )}
          </div>

          {/* Time offset axis labels */}
          <div className="flex justify-between px-1 text-[10px] font-mono text-slate-400">
            <span>
              +{firstPoint?.hour_offset ?? 0}h
              {formatShortTime(firstPoint) ? ` (${formatShortTime(firstPoint)})` : ''}
            </span>
            {midPoint && (
              <span>
                +{midPoint.hour_offset}h
                {formatShortTime(midPoint) ? ` (${formatShortTime(midPoint)})` : ''}
              </span>
            )}
            <span>
              +{lastPoint?.hour_offset ?? totalPoints}h
              {formatShortTime(lastPoint) ? ` (${formatShortTime(lastPoint)})` : ''}
            </span>
          </div>

          {/* Fixed-Height Interactive Action & Guidance Bar (Zero layout shift) */}
          <div className="h-9 flex items-center justify-between rounded-lg border border-border/60 bg-slate-50/70 px-3.5 text-xs text-slate-600 overflow-hidden">
            {hovered ? (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2 truncate">
                  <Zap size={13} className="shrink-0 text-rust" />
                  <span className="font-semibold text-navy shrink-0">
                    +{hovered.hour_offset ?? 0}h Action:
                  </span>
                  <span className="truncate text-slate-600">
                    {hovered.action || 'Maintain nominal generation profile.'}
                  </span>
                </div>
                <span className="hidden sm:inline-block shrink-0 text-[11px] font-mono text-slate-400">
                  {statusStyle(hovered.status).label}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full text-slate-500">
                <div className="flex items-center gap-2">
                  <Info size={13} className="text-slate-400 shrink-0" />
                  <span>
                    Hover or scrub along the ribbon to inspect interval dispatch balance and actions.
                  </span>
                </div>
                <span className="hidden sm:inline-block font-mono text-[11px] text-slate-400">
                  {stats.shortage > 0 ? `${stats.shortage}h shortage` : 'All nominal'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LegendDot({ status, label, count }) {
  const style = statusStyle(status)
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.hex }} />
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className="text-[10px] text-slate-400 font-mono">({count})</span>
      )}
    </span>
  )
}

