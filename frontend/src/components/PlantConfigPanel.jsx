import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
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
} from 'lucide-react'
import { updateDemandSchedule } from '../api/client.js'

export default function PlantConfigPanel({ plant, loading, onScheduleSaved }) {
  const [editing, setEditing] = useState(false)
  const [schedule, setSchedule] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [bulkValue, setBulkValue] = useState('')

  useEffect(() => {
    setSchedule(plant?.demand_schedule || [])
    setEditing(false)
    setError(null)
    setSuccess(false)
    setBulkValue('')
  }, [plant?.plant_id, plant?.demand_schedule])

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

  function updateRow(idx, value) {
    const val = Math.max(0, parseFloat(value) || 0)
    setSchedule((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, demand_mw: Number(val.toFixed(1)) } : row))
    )
  }

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

  const stats = useMemo(() => {
    if (!schedule || schedule.length === 0) return { max: '0.0', avg: '0.0', total: '0.0' }
    let max = 0
    let sum = 0
    schedule.forEach((r) => {
      const v = Number(r.demand_mw || 0)
      if (v > max) max = v
      sum += v
    })
    return { max: max.toFixed(1), avg: (sum / schedule.length).toFixed(1), total: sum.toFixed(1) }
  }, [schedule])

  const panelClass =
    'flex h-full flex-col justify-between rounded-2xl border border-border/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-card w-full'

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="skeleton h-6 w-36 rounded" />
        <div className="skeleton mt-3 h-14 w-full rounded-xl" />
        <div className="skeleton mt-3 h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!plant) {
    return (
      <div className={panelClass}>
        <h2 className="text-sm font-bold text-navy dark:text-slate-100">Demand Schedule</h2>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">No plant selected.</p>
      </div>
    )
  }

  const isWind = plant.type === 'wind'
  const TypeIcon = isWind ? Wind : Sun
  const capacity = Number(plant.capacity_mw || 1)

  return (
    <div className={panelClass}>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 dark:border-slate-700/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-navy dark:text-slate-200 border border-border dark:border-slate-700">
              <SlidersHorizontal size={15} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-navy dark:text-slate-100 tracking-tight">Demand Schedule</h2>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:text-slate-400 font-mono">
                  {schedule?.length || 0}h
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                Committed PPA dispatch targets
              </p>
            </div>
          </div>

          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-navy dark:text-slate-200 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-steel/40 focus:outline-none"
            >
              <Pencil size={12} />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <X size={12} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg bg-navy px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-all hover:bg-navy/90 disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          )}
        </div>

        {/* Plant summary strip */}
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border/60 dark:border-slate-700/60 px-3 py-2">
          <TypeIcon size={14} className="text-steel dark:text-slate-300 shrink-0" />
          <span className="text-xs font-semibold text-navy dark:text-slate-100 truncate">{plant.name}</span>
          <span className="ml-auto text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
            {capacity} MW capacity
          </span>
        </div>

        {/* Bulk edit tools — only shown while editing */}
        {editing && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mr-1">
              All hours
            </span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="MW"
              className="w-16 rounded-md border border-border dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-navy dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-steel/30"
            />
            <button
              onClick={applyBulkValue}
              className="rounded-md border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-navy dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Set all
            </button>
            <button
              onClick={() => shiftAll(1)}
              className="inline-flex items-center gap-0.5 rounded-md border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-navy dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Plus size={10} /> 1 MW
            </button>
            <button
              onClick={() => shiftAll(-1)}
              className="inline-flex items-center gap-0.5 rounded-md border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-navy dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Minus size={10} /> 1 MW
            </button>
            <button
              onClick={() => setSchedule(plant?.demand_schedule || [])}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              title="Reset to last saved schedule"
            >
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        )}

        {error && (
          <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={13} />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
            <Check size={13} />
            Schedule saved.
          </div>
        )}

        {/* Single, simple table — no grid/list toggle, no progress bars */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-border/60 dark:border-slate-700/60">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-3 py-1.5 text-left font-semibold">Hour</th>
                <th className="px-3 py-1.5 text-right font-semibold">Demand (MW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 dark:divide-slate-700/50">
              {schedule.map((row, idx) => {
                const overCapacity = Number(row.demand_mw) > capacity
                return (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                      +{row.hour_offset}h
                    </td>
                    <td className="px-3 py-1.5">
                      {editing ? (
                        <div className="flex items-center justify-end gap-1">
                          {overCapacity && (
                            <AlertCircle size={11} className="text-amber-500" title="Above plant capacity" />
                          )}
                          <button
                            onClick={() => adjustRow(idx, -1)}
                            className="flex h-5 w-5 items-center justify-center rounded border border-border dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Minus size={10} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.demand_mw}
                            onChange={(e) => updateRow(idx, e.target.value)}
                            className="w-16 rounded border border-border dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-0.5 text-right font-mono text-navy dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-steel/30"
                          />
                          <button
                            onClick={() => adjustRow(idx, 1)}
                            className="flex h-5 w-5 items-center justify-center rounded border border-border dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      ) : (
                        <span className="block text-right font-mono font-semibold text-navy dark:text-slate-100">
                          {Number(row.demand_mw).toFixed(1)}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats footer */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 dark:border-slate-700/60 pt-3">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Peak</div>
          <div className="text-sm font-bold text-navy dark:text-slate-100">{stats.max} MW</div>
        </div>
        <div className="text-center border-x border-border/60 dark:border-slate-700/60">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Average</div>
          <div className="text-sm font-bold text-navy dark:text-slate-100">{stats.avg} MW</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Total</div>
          <div className="text-sm font-bold text-navy dark:text-slate-100">{stats.total} MWh</div>
        </div>
      </div>
    </div>
  )
}
