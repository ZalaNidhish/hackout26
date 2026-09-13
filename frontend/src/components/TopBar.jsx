import {
  Activity,
  ChevronDown,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  User,
  Wind,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function TopBar({
  plants,
  selectedPlantId,
  onSelectPlant,
  isLive,
  loading,
  onRefresh,
  refreshing,
  theme,
  onToggleTheme,
  onOpenAddPlant,
}) {
  const { user, isAuthenticated, logout } = useAuth()
  const selectedPlant = plants.find((p) => p.plant_id === selectedPlantId)
  const isWind = selectedPlant?.type?.toLowerCase() === 'wind'

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
        {/* Left: Brand identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 via-steel to-navy text-white shadow-sm">
            {isWind ? <Wind size={18} strokeWidth={2.25} /> : <Activity size={18} strokeWidth={2.25} />}
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-navy">
                Renewable Generation Forecasting Platform
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-400 animate-pulse" />
                Real-Time Wind &amp; Solar
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Live meteorological sensors, wind vector dynamics &amp; grid dispatch
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Sensor Stream Indicator */}
          <div
            className="hidden md:flex items-center gap-1.5 rounded-full border border-ok/30 bg-okbg px-2.5 py-1 text-xs font-medium text-ok shadow-2xs"
            title="Receiving live atmospheric & wind sensor telemetry"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok" />
            </span>
            <span className="text-[11px] font-bold tracking-wide">
              Live Stream
            </span>
          </div>

          {/* Plant Selector */}
          <div className="relative flex items-center">
            <div className="relative">
              <select
                value={selectedPlantId || ''}
                onChange={(e) => onSelectPlant(e.target.value)}
                disabled={loading || plants.length === 0}
                className="appearance-none rounded-xl border border-border bg-input py-1.5 pl-8 pr-8 text-xs font-semibold text-navy shadow-sm transition-all hover:border-steel/40 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20 disabled:cursor-not-allowed disabled:opacity-60 max-w-[200px] sm:max-w-[260px] truncate"
              >
                {plants.length === 0 && <option value="">No plants configured</option>}
                {plants.map((p) => {
                  const isW = p.type?.toLowerCase() === 'wind'
                  const icon = isW ? '??' : '??'
                  const cap = p.capacity_mw ? ' (' + p.capacity_mw + ' MW)' : ''
                  return (
                    <option key={p.plant_id} value={p.plant_id}>
                      {icon} {p.name}{cap}
                    </option>
                  )
                })}
              </select>

              {/* Icon inside select */}
              <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                {isWind ? (
                  <Wind size={13} className="text-sky-600" />
                ) : (
                  <Sun size={13} className="text-amber-500" />
                )}
              </div>

              <ChevronDown
                size={13}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          </div>

          {/* Add Plant Button */}
          {onOpenAddPlant && (
            <button
              onClick={onOpenAddPlant}
              title="Register new solar or wind asset"
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-950 dark:hover:text-sky-200 focus:outline-none focus:ring-2 focus:ring-steel/20"
            >
              <Plus size={13} className="text-sky-600" />
              <span className="hidden sm:inline">Add Plant</span>
            </button>
          )}

          {/* Auth Controls: User Profile Chip & Logout */}
          {isAuthenticated && (
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-slate-50/90 dark:bg-slate-800/80 py-1 px-2.5 text-xs shadow-2xs">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-navy text-white text-[10px] font-bold">
                {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="max-w-[110px] truncate text-[11px] font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
                {user?.email || 'Operator'}
              </span>
              <button
                onClick={logout}
                title="Sign out of operator session"
                className="ml-1 rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-danger dark:hover:bg-slate-700 transition-colors"
              >
                <LogOut size={12} />
              </button>
            </div>
          )}

          {/* Dark / Light Mode Switcher */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              title="Toggle Light / Dark mode"
              className="flex h-8 items-center gap-1.5 rounded-xl border border-border bg-surface px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy focus:outline-none focus:ring-2 focus:ring-steel/20"
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? (
                <>
                  <Moon size={13} className="text-amber-400 fill-amber-400" />
                  <span className="text-[11px] font-bold hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun size={13} className="text-amber-500 fill-amber-500" />
                  <span className="text-[11px] font-bold hidden sm:inline">Light</span>
                </>
              )}
            </button>
          )}

          {/* Quick Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              title="Refresh live telemetry now"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-slate-500 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy focus:outline-none focus:ring-2 focus:ring-steel/20 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={refreshing ? 'animate-spin text-sky-600' : ''}
              />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
