import { useState } from 'react'
import { AlertCircle, Loader2, MapPin, Sun, Wind, X, Zap } from 'lucide-react'
import { createPlant } from '../api/client.js'

const PRESET_LOCATIONS = [
  { label: 'Ahmedabad, Gujarat (solar-heavy)', lat: 23.0225, lon: 72.5714 },
  { label: 'Kutch, Gujarat (wind-heavy)', lat: 23.5, lon: 69.5 },
  { label: 'Jaisalmer, Rajasthan (solar-heavy)', lat: 26.9157, lon: 70.9083 },
  { label: 'Tuticorin, Tamil Nadu (wind-heavy)', lat: 8.7642, lon: 78.1348 },
]

export default function AddPlantModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('solar')
  const [capacity, setCapacity] = useState('35')
  const [locationIdx, setLocationIdx] = useState(0)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const capacityNum = parseFloat(capacity)
    if (!name.trim()) {
      setError('Give the plant a name.')
      return
    }
    if (Number.isNaN(capacityNum) || capacityNum <= 0) {
      setError('Capacity must be a positive number.')
      return
    }

    const loc = PRESET_LOCATIONS[locationIdx]
    setSubmitting(true)
    try {
      const plant = await createPlant({
        name: name.trim(),
        type,
        capacity_mw: capacityNum,
        latitude: loc.lat,
        longitude: loc.lon,
      })
      onCreated(plant)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Could not create plant. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 dark:bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border dark:border-slate-700 bg-white dark:bg-slate-900 shadow-panel">
        <div className="flex items-center justify-between border-b border-border/60 dark:border-slate-700/60 px-5 py-3.5">
          <h2 className="text-sm font-bold text-navy dark:text-slate-100">Add a plant</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-navy dark:hover:text-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          {error && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2.5 py-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Plant name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Rooftop Array"
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-navy dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-steel/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Resource type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('solar')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  type === 'solar'
                    ? 'border-steel bg-steel/10 text-navy dark:text-slate-100'
                    : 'border-border dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Sun size={13} /> Solar
              </button>
              <button
                type="button"
                onClick={() => setType('wind')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  type === 'wind'
                    ? 'border-steel bg-steel/10 text-navy dark:text-slate-100'
                    : 'border-border dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Wind size={13} /> Wind
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Capacity (MW)
            </label>
            <div className="relative">
              <Zap size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                required
                min="0.1"
                step="0.1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-8 pr-3 text-sm text-navy dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-steel/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Location</label>
            <div className="relative">
              <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={locationIdx}
                onChange={(e) => setLocationIdx(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-8 pr-3 text-sm text-navy dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-steel/20"
              >
                {PRESET_LOCATIONS.map((loc, i) => (
                  <option key={loc.label} value={i}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Used to fetch real weather for the forecast. A demand schedule is generated automatically — edit it afterward from the dashboard.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy/90 disabled:opacity-60 mt-1"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Create plant
          </button>
        </form>
      </div>
    </div>
  )
}
