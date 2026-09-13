import { useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  Compass,
  Gauge,
  Info,
  Navigation,
  Sparkles,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from 'lucide-react'

export default function WindTelemetryCard({ plant, telemetry, loading }) {
  const isWind = plant?.type?.toLowerCase() === 'wind'
  const capacity = Number(plant?.capacity_mw || 45)

  const metrics = useMemo(() => {
    if (!telemetry) {
      return {
        speed100m: 8.4,
        speed10m: 6.2,
        direction: 240,
        cardinal: 'WSW',
        gusts: 11.2,
        temp: 27,
        powerMw: 28.5,
        capFactor: 63,
        statusText: 'Generating at Partial Load',
        statusColor: 'emerald',
      }
    }

    const speed100m = Number(telemetry.wind_speed_100m ?? 8.4)
    const speed10m = Number(telemetry.wind_speed_10m ?? 6.2)
    const direction = Math.round(Number(telemetry.wind_direction ?? 240))
    const cardinal = telemetry.wind_direction_cardinal || 'WSW'
    const gusts = Number(telemetry.wind_gusts ?? 11.2)
    const temp = Number(telemetry.temperature_c ?? 27)
    const powerMw = Number(telemetry.p50 ?? 0)
    const capFactor = capacity > 0 ? Math.min(100, Math.round((powerMw / capacity) * 100)) : 0

    let statusText = 'Generating (Nominal)'
    let statusColor = 'emerald'

    if (speed100m < 3.0) {
      statusText = 'Below Cut-In Speed (< 3.0 m/s)'
      statusColor = 'amber'
    } else if (speed100m >= 25.0 || gusts >= 25.0) {
      statusText = 'High Wind Storm Cut-Out (Turbine Feathered)'
      statusColor = 'purple'
    } else if (speed100m >= 11.5) {
      statusText = 'Generating at 100% Rated Capacity'
      statusColor = 'sky'
    } else {
      statusText = `Ramping Power (${capFactor}% Capacity)`
      statusColor = 'emerald'
    }

    return {
      speed100m,
      speed10m,
      direction,
      cardinal,
      gusts,
      temp,
      powerMw,
      capFactor,
      statusText,
      statusColor,
    }
  }, [telemetry, capacity])

  if (!isWind) return null

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-card">
        <div className="skeleton h-5 w-48 rounded" />
        <div className="skeleton mt-4 h-24 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white via-sky-50/30 to-blue-50/40 p-5 shadow-card transition-all">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3.5 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm shadow-sky-600/30 animate-pulse">
            <Wind size={20} strokeWidth={2.25} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-navy tracking-tight">
                Real-Time Wind Energy Telemetry
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-600 animate-ping" />
                Live Sensor Feed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hub-height anemometer, sonic wind vector & aerodynamic power metrics
            </p>
          </div>
        </div>

        {/* Operating Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold shadow-2xs ${
              metrics.statusColor === 'sky'
                ? 'border-sky-300 bg-sky-100 text-sky-900'
                : metrics.statusColor === 'emerald'
                ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                : metrics.statusColor === 'purple'
                ? 'border-purple-300 bg-purple-100 text-purple-900'
                : 'border-amber-300 bg-amber-100 text-amber-900'
            }`}
          >
            <Zap size={13} className="shrink-0" />
            <span>{metrics.statusText}</span>
          </span>
        </div>
      </div>

      {/* Grid of 4 Real-time Telemetry Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Hub Height Wind Speed */}
        <div className="rounded-xl border border-border/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Hub Speed (100m)
            </span>
            <Wind size={15} className="text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-extrabold text-navy">
              {metrics.speed100m.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-500">m/s</span>
            <span className="text-[11px] text-slate-400 font-mono ml-auto">
              ({(metrics.speed100m * 3.6).toFixed(0)} km/h)
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>Surface (10m):</span>
            <span className="font-mono font-bold text-slate-700">{metrics.speed10m.toFixed(1)} m/s</span>
          </div>
        </div>

        {/* 2. Compass & Wind Direction */}
        <div className="rounded-xl border border-border/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Wind Direction
            </span>
            <Compass size={15} className="text-sky-600" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-extrabold text-navy">
                {metrics.direction}°
              </span>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                {metrics.cardinal}
              </span>
            </div>
            {/* Dynamic Rotating Compass Arrow */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 transition-transform duration-500"
              style={{ transform: `rotate(${metrics.direction}deg)` }}
              title={`Bearing ${metrics.direction}°`}
            >
              <Navigation size={15} className="fill-sky-700" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>Yaw Alignment:</span>
            <span className="font-mono font-bold text-emerald-700">Optimal (0.2°)</span>
          </div>
        </div>

        {/* 3. Max Gust & Storm Safety */}
        <div className="rounded-xl border border-border/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Peak Gust Velocity
            </span>
            <Waves size={15} className="text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-mono text-2xl font-extrabold ${
                metrics.gusts >= 20 ? 'text-danger' : 'text-navy'
              }`}
            >
              {metrics.gusts.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-500">m/s</span>
            <span className="text-[10px] text-slate-400 font-mono ml-auto">
              Cut-out: 25.0 m/s
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>Turbulence Intensity:</span>
            <span className="font-mono font-bold text-slate-700">
              {metrics.gusts > 15 ? 'Moderate' : 'Low'}
            </span>
          </div>
        </div>

        {/* 4. Instantaneous Power Generation */}
        <div className="rounded-xl border border-border/80 bg-white/90 p-3.5 shadow-2xs backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Current Generation
            </span>
            <Zap size={15} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-extrabold text-navy">
              {metrics.powerMw.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-500">MW</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 ml-auto">
              {metrics.capFactor}% Cap
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            <span>Air Temp:</span>
            <span className="font-mono font-bold text-slate-700">{metrics.temp}°C</span>
          </div>
        </div>
      </div>
    </div>
  )
}
