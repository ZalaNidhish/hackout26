import { Activity, ChevronDown, RefreshCw } from 'lucide-react'

export default function TopBar({
  plants,
  selectedPlantId,
  onSelectPlant,
  isLive,
  loading,
  onRefresh,
  refreshing,
}) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-white/90 backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate to-navy text-white shadow-sm">
            <Activity size={18} strokeWidth={2.25} />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-navy">
                Renewable Generation Forecasting Platform
              </h1>
              <span className="hidden sm:inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                Grid EMS
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Operations &amp; live forecast telemetry
            </p>
          </div>
        </div>

        {/* Controls: Connection Pill + Plant Selector + Refresh */}
        <div className="flex items-center gap-3">
          {/* Connection Status Indicator */}
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isLive
                ? 'border-ok/30 bg-okbg text-ok shadow-sm'
                : 'border-slate-300 bg-slate-100 text-slate-600'
            }`}
            title={isLive ? 'Connected to live forecast API stream' : 'Falling back to demo forecast data'}
          >
            {isLive ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
              </span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-slate-400" />
            )}
            <span className="text-[11px] font-semibold tracking-wide">
              {isLive ? 'Live Grid' : 'Demo Fallback'}
            </span>
          </div>

          {/* Plant Selector */}
          <div className="relative">
            <select
              value={selectedPlantId || ''}
              onChange={(e) => onSelectPlant(e.target.value)}
              disabled={loading || plants.length === 0}
              className="appearance-none rounded-lg border border-border bg-white py-1.5 pl-3.5 pr-8 text-xs font-semibold text-navy shadow-sm transition-all hover:border-slate/40 focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {plants.length === 0 && <option value="">No plants configured</option>}
              {plants.map((p) => (
                <option key={p.plant_id} value={p.plant_id}>
                  {p.name === 'Demo Solar Farm' ? 'Solar Farm1' : p.name} ({p.type ? p.type.toUpperCase() : 'RE'})
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {/* Quick Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              title="Refresh forecast now"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-navy focus:outline-none focus:ring-2 focus:ring-slate/20 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={refreshing ? 'animate-spin text-slate' : ''}
              />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
