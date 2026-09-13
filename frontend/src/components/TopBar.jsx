import { useState, useRef, useEffect } from 'react'
import { Activity, ChevronDown, LogOut, Moon, Plus, RefreshCw, Sun, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

export default function TopBar({
  plants,
  selectedPlantId,
  onSelectPlant,
  isLive,
  loading,
  onRefresh,
  refreshing,
  onAddPlant,
}) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-steel to-navy text-white shadow-sm">
            <Activity size={18} strokeWidth={2.25} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-navy dark:text-slate-100 truncate">
                Renewable Generation Forecasting
              </h1>
              <span className="hidden md:inline-flex shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                Grid EMS
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">
              Operations &amp; live forecast telemetry
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {/* Connection Status */}
          <div
            className={`hidden sm:flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isLive
                ? 'border-ok/30 bg-okbg dark:bg-emerald-950/40 text-ok shadow-sm'
                : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
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
              className="appearance-none max-w-[9.5rem] sm:max-w-none rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 pl-3.5 pr-8 text-xs font-semibold text-navy dark:text-slate-100 shadow-sm transition-all hover:border-steel/40 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {plants.length === 0 && <option value="">No plants yet</option>}
              {plants.map((p) => (
                <option key={p.plant_id} value={p.plant_id}>
                  {p.name} ({p.type ? p.type.toUpperCase() : 'RE'})
                </option>
              ))}
            </select>
            <ChevronDown
              size={13}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          {/* Add Plant */}
          {onAddPlant && (
            <button
              onClick={onAddPlant}
              title="Add a new plant"
              className="flex h-8 items-center gap-1 rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-navy dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Add Plant</span>
            </button>
          )}

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              title="Refresh forecast now"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-navy dark:hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-steel/20 disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin text-steel' : ''} />
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-navy dark:hover:text-slate-100 focus:outline-none"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title={user?.email}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-navy dark:hover:text-slate-100 focus:outline-none"
            >
              <User size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 shadow-panel z-40 overflow-hidden">
                <div className="px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 border-b border-border/60 dark:border-slate-700/60 truncate">
                  {user?.email}
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <LogOut size={13} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
