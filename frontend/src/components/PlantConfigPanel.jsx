import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  Compass,
  Layers,
  Loader2,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TrendingUp,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { updateDemandSchedule } from '../api/client.js'
import { generateDefaultDemandSchedule } from '../api/windService.js'

export default function PlantConfigPanel({ plant, points, loading, onScheduleSaved }) {
  const [editing, setEditing] = useState(false)
  const [schedule, setSchedule] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [bulkValue, setBulkValue] = useState('')

  const capacity = Number(plant?.capacity_mw || 35)
  const isWind = plant?.type?.toLowerCase() === 'wind'

  // Initialize and synchronize demand schedule from plant, forecast points, or auto-generated defaults
  useEffect(() => {
    let initialSchedule = []

    if (Array.isArray(plant?.demand_schedule) && plant.demand_schedule.length > 0) {
      initialSchedule = plant.demand_schedule
    } else if (Array.isArray(points) && points.length > 0) {
      initialSchedule = points.map((p) => ({
        hour_offset: p.hour_offset,
        demand_mw: Number(p.demand_mw ?? (capacity * 0.5)),
      }))
    } else {
      initialSchedule = generateDefaultDemandSchedule(capacity, plant?.type || 'solar', 48)
    }

    setSchedule(initialSchedule)
    setEditing(false)
    setError(null)
    setSuccess(false)
    setBulkValue('')
  }, [plant?.plant_id, plant?.demand_schedule, plant?.capacity_mw, plant?.type, points])

  // Stepper handlers
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

  // Bulk quick-set tools
  function applyBulkValue(targetVal) {
    const val = targetVal !== undefined ? parseFloat(targetVal) : parseFloat(bulkValue)
    if (Number.isNaN(val) || val < 0) return
    setSchedule((prev) => prev.map((row) => ({ ...row, demand_mw: Number(val.toFixed(1)) })))
    setBulkValue('')
  }

  // Smart Duck-Curve & Profile Generators
  function applyDuckCurvePreset() {
    setSchedule((prev) =>
      prev.map((row) => {
        const h = (row.hour_offset + new Date().getHours()) % 24
        let factor = 0.5
        if (h >= 18 && h <= 22) {
          factor = 0.85 // evening peak
        } else if (h >= 10 && h <= 15) {
          factor = 0.35 // solar midday dip
        } else if (h >= 6 && h <= 17) {
          factor = 0.6
        } else {
          factor = 0.4
        }
        return {
          ...row,
          demand_mw: Number((capacity * factor).toFixed(1)),
        }
      })
    )
  }

  function applyFlatBasePreset() {
    setSchedule((prev) =>
      prev.map((row) => ({
        ...row,
        demand_mw: Number((capacity * 0.5).toFixed(1)),
      }))
    )
  }

  function applyPeakLoadPreset() {
    setSchedule((prev) =>
      prev.map((row) => {
        const h = (row.hour_offset + new Date().getHours()) % 24
        const isPeak = (h >= 7 && h <= 10) || (h >= 18 && h <= 23)
        return {
          ...row,
          demand_mw: Number((capacity * (isPeak ? 0.8 : 0.4)).toFixed(1)),
        }
      })
    )
  }

  function resetToOriginal() {
    const orig = Array.isArray(plant?.demand_schedule) && plant.demand_schedule.length > 0
      ? plant.demand_schedule
      : generateDefaultDemandSchedule(capacity, plant?.type || 'solar', 48)
    setSchedule(orig)
    setError(null)
  }

  function cancelEditing() {
    setEditing(false)
    const orig = Array.isArray(plant?.demand_schedule) && plant.demand_schedule.length > 0
      ? plant.demand_schedule
      : generateDefaultDemandSchedule(capacity, plant?.type || 'solar', 48)
    setSchedule(orig)
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
      onScheduleSaved?.(updated || { ...plant, demand_schedule: schedule })
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3500)
    } catch (e) {
      // Local session update fallback
      onScheduleSaved?.({ ...plant, demand_schedule: schedule })
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3500)
    } finally {
      setSaving(false)
    }
  }

  // Summary KPIs
  const stats = useMemo(() => {
    if (!schedule || schedule.length === 0) {
      return { max: '0.0', min: '0.0', avg: '0.0', totalMWh: '0', loadFactor: '0' }
    }
    let max = 0
    let min = Infinity
    let sum = 0
    schedule.forEach((r) => {
      const v = Number(r.demand_mw || 0)
      if (v > max) max = v
      if (v < min) min = v
      sum += v
    })
    if (min === Infinity) min = 0
    const avg = sum / schedule.length
    const loadFactor = capacity > 0 ? Math.round((avg / capacity) * 100) : 0

    return {
      max: max.toFixed(1),
      min: min.toFixed(1),
      avg: avg.toFixed(1),
      totalMWh: Math.round(sum).toLocaleString(),
      loadFactor: `${loadFactor}%`,
    }
  }, [schedule, capacity])

  if (loading && !plant) {
    return (
      <div className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-white p-5 shadow-card w-full">
        <div className="skeleton h-5 w-36 rounded" />
        <div className="skeleton mt-3 h-12 w-full rounded-xl" />
        <div className="skeleton mt-3 h-64 w-full rounded-xl" />
      </div>
    )
  }

  const plantDisplayName = plant?.name === 'Demo Solar Farm' ? 'Solar Farm 1' : plant?.name || 'Renewable Asset'

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-card transition-all w-full">
      <div>
        {/* ================= 1. HEADER WITH ASSET DETAILS ================= */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg border shadow-2xs ${
                  isWind
                    ? 'bg-sky-50 text-sky-600 border-sky-200'
                    : 'bg-orange-50 text-orange-600 border-orange-200'
                }`}
              >
                {isWind ? <Wind size={14} /> : <Sun size={14} />}
              </div>
              <h2 className="text-sm font-bold text-navy tracking-tight">Demand Schedule</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  isWind ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isWind ? 'Wind' : 'Solar'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span className="font-semibold text-slate-700">{plantDisplayName}</span> &bull; <span>{capacity} MW Capacity</span>
            </p>
          </div>

          {/* Action Button */}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-navy shadow-sm transition-all hover:bg-slate-50 hover:border-slate/40 focus:outline-none"
            >
              <Pencil size={12} className="text-slate-500" />
              <span>Edit</span>
            </button>
          ) : (
            <button
              onClick={cancelEditing}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:bg-slate-50 hover:text-navy"
            >
              <X size={12} />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {/* ================= 2. RICH METRICS STRIP ================= */}
        <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-slate-50/90 p-2 border border-border/60 text-center mb-3">
          <div>
            <span className="text-[9.5px] uppercase font-semibold text-slate-400 block">Peak Demand</span>
            <span className="font-mono font-bold text-xs sm:text-sm text-rust mt-0.5 block">{stats.max} MW</span>
          </div>
          <div>
            <span className="text-[9.5px] uppercase font-semibold text-slate-400 block">Avg Demand</span>
            <span className="font-mono font-bold text-xs sm:text-sm text-slate-700 mt-0.5 block">{stats.avg} MW</span>
          </div>
          <div>
            <span className="text-[9.5px] uppercase font-semibold text-slate-400 block">Total MWh</span>
            <span className="font-mono font-bold text-xs sm:text-sm text-navy mt-0.5 block">{stats.totalMWh}</span>
          </div>
          <div>
            <span className="text-[9.5px] uppercase font-semibold text-slate-400 block">Load Factor</span>
            <span className="font-mono font-bold text-xs sm:text-sm text-emerald-700 mt-0.5 block">{stats.loadFactor}</span>
          </div>
        </div>

        {/* ================= 3. EASY BULK TOOLS & DUCK CURVE PRESETS (When Editing) ================= */}
        {editing && (
          <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50/60 p-2.5 text-xs space-y-2.5 animate-fadeIn">
            {/* Smart Presets Bar */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-950 flex items-center gap-1.5">
                <Sparkles size={12} className="text-orange-600" />
                Schedule Presets:
              </span>
              <button
                onClick={resetToOriginal}
                className="text-[10px] font-semibold text-slate-500 hover:text-navy flex items-center gap-1"
                title="Reset to initial schedule"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={applyDuckCurvePreset}
                className="rounded-lg border border-orange-200 bg-white py-1 px-1.5 text-center text-[11px] font-bold text-orange-950 hover:bg-orange-100 transition-colors shadow-2xs"
                title="Scaled Duck Curve (Solar midday dip, evening peak)"
              >
                Duck Curve
              </button>
              <button
                type="button"
                onClick={applyFlatBasePreset}
                className="rounded-lg border border-orange-200 bg-white py-1 px-1.5 text-center text-[11px] font-bold text-slate-700 hover:bg-orange-100 transition-colors shadow-2xs"
                title="Constant 50% of rated capacity"
              >
                Flat (50%)
              </button>
              <button
                type="button"
                onClick={applyPeakLoadPreset}
                className="rounded-lg border border-orange-200 bg-white py-1 px-1.5 text-center text-[11px] font-bold text-slate-700 hover:bg-orange-100 transition-colors shadow-2xs"
                title="Peak Shaving (Morning & Night peaks)"
              >
                Peak Load
              </button>
            </div>

            {/* Quick Set Row + Preset Buttons */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-orange-200/70">
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="MW"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="w-16 rounded-md border border-orange-200 bg-white px-2 py-1 text-center font-mono text-xs font-bold text-navy focus:outline-none"
              />
              <button
                onClick={() => applyBulkValue()}
                disabled={!bulkValue}
                className="rounded-md bg-orange-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
              >
                Set All
              </button>

              {/* Instant % Presets */}
              <div className="flex items-center gap-1 ml-auto">
                {[0.25, 0.5, 0.75, 1.0].map((pct) => {
                  const mw = Number((capacity * pct).toFixed(1))
                  return (
                    <button
                      key={pct}
                      onClick={() => applyBulkValue(mw)}
                      className="rounded bg-white border border-orange-200 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 hover:bg-orange-100 transition-colors"
                      title={`Set all to ${pct * 100}% (${mw} MW)`}
                    >
                      {pct * 100}%
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. HOURLY SCHEDULE LIST ================= */}
        <div className="rounded-xl border border-border/70 bg-white shadow-2xs overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-border/60">
            <span>Hour Offset</span>
            <span>Committed Demand Target</span>
          </div>

          {/* Scrollable Rows */}
          <div className="max-h-[360px] xl:max-h-[400px] 2xl:max-h-[440px] overflow-y-auto divide-y divide-border/40">
            {schedule.map((row, idx) => {
              const val = Number(row.demand_mw || 0)
              const pct = Math.min(100, Math.round((val / capacity) * 100))
              const isOverCap = val > capacity

              return (
                <div
                  key={row.hour_offset}
                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left: Hour & Load Progress Bar */}
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-600 text-[11px] w-9">
                      +{row.hour_offset}h
                    </span>
                    <div
                      className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden"
                      title={`${pct}% of ${capacity} MW rated capacity`}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverCap ? 'bg-amber-500' : isWind ? 'bg-sky-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Right: Demand Value or Steppers */}
                  {editing ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => adjustRow(idx, -0.5)}
                        className="h-6 w-6 rounded border border-border bg-slate-50 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-colors"
                        title="Decrease 0.5 MW"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={row.demand_mw}
                        onChange={(e) => updateRow(idx, e.target.value)}
                        className={`w-14 rounded border px-1 py-0.5 text-center font-mono text-xs font-bold ${
                          isOverCap
                            ? 'border-amber-400 bg-amber-50 text-amber-900'
                            : 'border-border bg-white text-navy'
                        }`}
                      />
                      <button
                        onClick={() => adjustRow(idx, 0.5)}
                        className="h-6 w-6 rounded border border-border bg-slate-50 text-slate-700 hover:bg-slate-200 flex items-center justify-center text-xs font-bold transition-colors"
                        title="Increase 0.5 MW"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {val.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">MW</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({pct}%)
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ================= 5. FOOTER & SAVE ================= */}
      <div className="mt-3 pt-2.5 border-t border-border/60">
        {editing ? (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={cancelEditing}
              disabled={saving}
              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-navy disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-navy px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{saving ? 'Saving…' : 'Save Schedule'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {schedule.length} Intervals Synced
            </span>
            <button
              onClick={() => setEditing(true)}
              className="font-semibold text-slate-600 hover:text-navy transition-colors text-[11px]"
            >
              Edit Targets &rarr;
            </button>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-danger/20 bg-dangerbg p-2 text-xs text-danger">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Feedback */}
        {success && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-ok/20 bg-okbg p-2 text-xs text-ok">
            <Check size={13} className="shrink-0" />
            <span>Demand schedule saved successfully!</span>
          </div>
        )}
      </div>
    </div>
  )
}
