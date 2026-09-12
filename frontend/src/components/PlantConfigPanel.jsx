import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  Cpu,
  LayoutGrid,
  List,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sun,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { updateDemandSchedule } from '../api/client.js'

export default function PlantConfigPanel({ plant, loading, onScheduleSaved }) {
  const [editing, setEditing] = useState(false)
  const [schedule, setSchedule] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [bulkValue, setBulkValue] = useState('')
  const [viewStyle, setViewStyle] = useState('grid') // 'grid' | 'table'

  useEffect(() => {
    setSchedule(plant?.demand_schedule || [])
    setEditing(false)
    setError(null)
    setSuccess(false)
    setBulkValue('')
  }, [plant?.plant_id, plant?.demand_schedule])

  // Stepper & Row handlers
  function updateRow(idx, value) {
    const val = Math.max(0, parseFloat(value) || 0)
    setSchedule((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, demand_mw: Number(val.toFixed(1)) } : row))
    )
  }

  function adjustRow(idx, delta) {
    setSchedule((prev) =>
      prev.map((row, i) => {
        if (i === idx) {
          const next = Math.max(0, Number((Number(row.demand_mw || 0) + delta).toFixed(1)))
          return { ...row, demand_mw: next }
        }
        return row
      })
    )
  }

  // Bulk tools for fast scheduling
  function applyBulkValue() {
    const val = parseFloat(bulkValue)
    if (Number.isNaN(val) || val < 0) return
    setSchedule((prev) => prev.map((row) => ({ ...row, demand_mw: Number(val.toFixed(1)) })))
    setBulkValue('')
  }

  function shiftAll(delta) {
    setSchedule((prev) =>
      prev.map((row) => ({
        ...row,
        demand_mw: Math.max(0, Number((Number(row.demand_mw || 0) + delta).toFixed(1))),
      }))
    )
  }

  function resetToOriginal() {
    setSchedule(plant?.demand_schedule || [])
    setError(null)
  }

  function cancelEditing() {
    setEditing(false)
    setSchedule(plant?.demand_schedule || [])
    setError(null)
    setBulkValue('')
  }

  async function handleSave() {
    if (!plant) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const updated = await updateDemandSchedule(plant.plant_id, schedule)
      onScheduleSaved?.(updated)
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3500)
    } catch (e) {
      setError('Could not save schedule. Please check connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  // Live schedule metrics
  const scheduleStats = useMemo(() => {
    if (!schedule || schedule.length === 0) {
      return { max: '0.0', avg: '0.0', totalMWh: '0.0' }
    }
    let max = 0
    let sum = 0
    schedule.forEach((r) => {
      const v = Number(r.demand_mw || 0)
      if (v > max) max = v
      sum += v
    })
    return {
      max: max.toFixed(1),
      avg: (sum / schedule.length).toFixed(1),
      totalMWh: sum.toFixed(1),
    }
  }, [schedule])

  if (loading) {
    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-card w-full">
        <div className="skeleton h-6 w-36 rounded" />
        <div className="skeleton mt-3 h-14 w-full rounded-xl" />
        <div className="skeleton mt-3 h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!plant) {
    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-card w-full">
        <h2 className="text-sm font-bold text-navy">Demand Schedule</h2>
        <p className="mt-2 text-xs text-slate-400">No plant selected.</p>
      </div>
    )
  }

  const isWind = plant.type === 'wind'
  const TypeIcon = isWind ? Wind : Sun
  const capacity = Number(plant.capacity_mw || 1)
  const plantDisplayName = plant.name === 'Demo Solar Farm' ? 'Solar Farm1' : plant.name

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-card transition-all w-full">
      <div>
        {/* ================= HEADER (Optimized for 1/4 space) ================= */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-200 shadow-2xs">
              <SlidersHorizontal size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-navy tracking-tight">Demand Schedule</h2>
                <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600 font-mono">
                  {schedule?.length || 0}h
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                Committed PPA dispatch targets
              </p>
            </div>
          </div>

          {/* View Toggle (Grid / List) + Edit/Cancel Button */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center rounded-lg border border-border bg-slate-100 p-0.5 shadow-inner text-xs">
              <button
                onClick={() => setViewStyle('grid')}
                className={`flex items-center gap-1 rounded-md px-1.5 py-1 transition-all ${
                  viewStyle === 'grid' ? 'bg-white font-bold text-navy shadow-2xs' : 'text-slate-500 hover:text-navy'
                }`}
                title="Grid view"
              >
                <LayoutGrid size={11} />
                <span className="hidden sm:inline text-[11px]">Grid</span>
              </button>
              <button
                onClick={() => setViewStyle('table')}
                className={`flex items-center gap-1 rounded-md px-1.5 py-1 transition-all ${
                  viewStyle === 'table' ? 'bg-white font-bold text-navy shadow-2xs' : 'text-slate-500 hover:text-navy'
                }`}
                title="List table view"
              >
                <List size={11} />
                <span className="hidden sm:inline text-[11px]">List</span>
              </button>
            </div>

            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-navy shadow-sm transition-all hover:bg-slate-50 hover:border-slate/40 focus:outline-none"
              >
                <Pencil size={11} className="text-slate-500" />
                <span>Edit</span>
              </button>
            ) : (
              <button
                onClick={cancelEditing}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-navy"
              >
                <X size={11} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= COMPACT PLANT TELEMETRY STRIP ================= */}
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-slate-50/80 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-border/80 text-navy shadow-2xs">
              <TypeIcon size={13} className={isWind ? 'text-cyan-600' : 'text-amber-500'} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-bold text-navy text-xs truncate" title={plantDisplayName}>
                  {plantDisplayName}
                </span>
                <span className="inline-flex items-center rounded-full bg-white border border-border px-1 py-0.2 text-[8px] font-bold uppercase text-slate-600 shrink-0">
                  {plant.type || 'RE'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono block truncate">
                {plant.latitude?.toFixed(2)}, {plant.longitude?.toFixed(2)} • 33 kV
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[8px] uppercase font-bold text-slate-400 block">Rated</span>
            <span className="font-mono font-bold text-navy text-xs">{plant.capacity_mw} MW</span>
          </div>
        </div>

        {/* ================= SITUATIONAL METRICS STRIP ================= */}
        <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-xl border border-border/60 bg-white p-1.5 text-xs shadow-2xs">
          <div className="rounded-lg bg-slate-50/60 p-1.5 text-center border border-border/50">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block tracking-tight truncate">Peak</span>
            <span className="font-mono font-bold text-rust text-xs mt-0.5 block truncate">{scheduleStats.max} MW</span>
          </div>
          <div className="rounded-lg bg-slate-50/60 p-1.5 text-center border border-border/50">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block tracking-tight truncate">Avg</span>
            <span className="font-mono font-bold text-slate-700 text-xs mt-0.5 block truncate">{scheduleStats.avg} MW</span>
          </div>
          <div className="rounded-lg bg-slate-50/60 p-1.5 text-center border border-border/50">
            <span className="text-[9px] uppercase font-semibold text-slate-400 block tracking-tight truncate">Total</span>
            <span className="font-mono font-bold text-navy text-xs mt-0.5 block truncate">{scheduleStats.totalMWh} MWh</span>
          </div>
        </div>

        {/* ================= EDITING TOOLS STRIP (When in Edit Mode) ================= */}
        {editing && (
          <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50/70 p-2 text-xs">
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-950">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                Edit Dispatch
              </span>
              <button
                onClick={resetToOriginal}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 hover:text-navy transition-colors"
                title="Reset all values to originally saved schedule"
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            </div>

            {/* Bulk Quick Fill Tools */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center rounded-lg border border-orange-200 bg-white shadow-2xs overflow-hidden">
                <span className="px-1.5 text-[10px] font-medium text-slate-500">All:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="MW"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="w-12 px-1 py-0.5 text-center text-xs font-bold text-navy focus:outline-none"
                />
                <button
                  onClick={applyBulkValue}
                  disabled={!bulkValue}
                  className="bg-orange-500 text-white px-2 py-0.5 text-[11px] font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  Set
                </button>
              </div>

              {/* Nudge +/- buttons */}
              <div className="flex items-center rounded-lg border border-orange-200 bg-white text-xs font-bold overflow-hidden shadow-2xs">
                <button
                  onClick={() => shiftAll(-1)}
                  className="px-2 py-0.5 text-slate-700 hover:bg-orange-50 transition-colors text-[11px]"
                  title="Shift all hours -1 MW"
                >
                  -1 MW
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={() => shiftAll(1)}
                  className="px-2 py-0.5 text-slate-700 hover:bg-orange-50 transition-colors text-[11px]"
                  title="Shift all hours +1 MW"
                >
                  +1 MW
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= SCHEDULE INTERVALS CONTAINER ================= */}
        {!schedule || schedule.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No demand schedule configured.</p>
        ) : viewStyle === 'grid' ? (
          /* GRID VIEW: 2 columns in 1/4 space */
          <div className="max-h-[380px] xl:max-h-[420px] 2xl:max-h-[460px] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 2xl:grid-cols-3 gap-1.5">
              {schedule.map((row, idx) => {
                const val = Number(row.demand_mw || 0)
                const pct = Math.min(100, Math.round((val / capacity) * 100))
                const isOverCap = val > capacity

                return (
                  <div
                    key={row.hour_offset}
                    className={`rounded-lg border p-1.5 text-center transition-all ${
                      editing
                        ? 'border-orange-200 bg-orange-50/20 hover:border-orange-300'
                        : 'border-border/70 bg-white hover:border-slate/30 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 font-bold mb-1">
                      <span>+{row.hour_offset}h</span>
                      <span className={isOverCap ? 'text-amber-600 font-bold' : ''}>{pct}%</span>
                    </div>

                    {editing ? (
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => adjustRow(idx, -0.5)}
                          className="h-5 w-5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-[10px]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={row.demand_mw}
                          onChange={(e) => updateRow(idx, e.target.value)}
                          className={`w-10 text-center font-mono text-xs font-bold rounded py-0.5 border ${
                            isOverCap ? 'border-amber-400 bg-amber-50 text-amber-900' : 'border-border bg-white text-navy'
                          }`}
                        />
                        <button
                          onClick={() => adjustRow(idx, 0.5)}
                          className="h-5 w-5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-[10px]"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div className="font-mono text-xs font-bold text-navy">
                        {val.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">MW</span>
                      </div>
                    )}

                    {/* Mini load bar */}
                    <div className="mt-1 h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverCap ? 'bg-amber-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* LIST TABLE VIEW */
          <div className="max-h-[380px] xl:max-h-[420px] 2xl:max-h-[460px] overflow-y-auto rounded-lg border border-border/80 bg-white shadow-inner divide-y divide-border/50">
            {schedule.map((row, idx) => {
              const val = Number(row.demand_mw || 0)
              const pct = Math.min(100, Math.round((val / capacity) * 100))
              const isOverCap = val > capacity

              return (
                <div
                  key={row.hour_offset}
                  className="flex items-center justify-between px-2.5 py-1.5 text-xs hover:bg-slate-50/70"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-500 text-[11px] w-8">+{row.hour_offset}h</span>
                    <div className="flex items-center gap-1" title={`${val} MW (${pct}% capacity)`}>
                      <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isOverCap ? 'bg-amber-500' : 'bg-orange-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[9px] text-slate-400">{pct}%</span>
                    </div>
                  </div>

                  {editing ? (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => adjustRow(idx, -0.5)}
                        className="h-5 w-5 rounded border border-border bg-slate-50 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-[10px]"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={row.demand_mw}
                        onChange={(e) => updateRow(idx, e.target.value)}
                        className="w-12 rounded border border-border px-1 py-0.5 text-center font-mono text-xs font-bold text-navy"
                      />
                      <button
                        onClick={() => adjustRow(idx, 0.5)}
                        className="h-5 w-5 rounded border border-border bg-slate-50 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-[10px]"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-rust text-xs">{val.toFixed(1)} MW</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ================= FOOTER & ACTIONS ================= */}
      <div className="mt-3 pt-2.5 border-t border-border/60">
        {editing ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-lg border border-border bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-navy disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-slate disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              <span>{saving ? 'Saving…' : 'Save Schedule'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Synced
            </span>
            <button
              onClick={() => setEditing(true)}
              className="text-slate-600 font-semibold hover:text-navy transition-colors"
            >
              Edit Targets &rarr;
            </button>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-danger/20 bg-dangerbg p-2 text-xs text-danger">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Feedback */}
        {success && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-ok/20 bg-okbg p-2 text-xs text-ok">
            <Check size={13} className="shrink-0" />
            <span>Saved successfully!</span>
          </div>
        )}
      </div>
    </div>
  )
}
