import { useState } from 'react'
import {
  AlertCircle,
  Check,
  Compass,
  Loader2,
  MapPin,
  Plus,
  Sun,
  Wind,
  X,
  Zap,
} from 'lucide-react'
import { createPlant } from '../api/client.js'

const PRESET_LOCATIONS = [
  {
    name: 'Charanka Solar Park, Gujarat',
    type: 'solar',
    lat: 23.9038,
    lon: 71.2014,
    defaultCapacity: 40,
  },
  {
    name: 'Bhadla Solar Park, Rajasthan',
    type: 'solar',
    lat: 27.5397,
    lon: 71.9167,
    defaultCapacity: 50,
  },
  {
    name: 'Pavagada Solar Park, Karnataka',
    type: 'solar',
    lat: 14.2817,
    lon: 77.4147,
    defaultCapacity: 35,
  },
  {
    name: 'Muppandal Wind Farm, Tamil Nadu',
    type: 'wind',
    lat: 8.2588,
    lon: 77.5457,
    defaultCapacity: 30,
  },
  {
    name: 'Jaisalmer Wind Park, Rajasthan',
    type: 'wind',
    lat: 26.9157,
    lon: 70.9083,
    defaultCapacity: 45,
  },
]

// Generate dynamic capacity-scaled duck-curve demand schedule
function generateInitialDemandSchedule(capacityMw, type = 'solar', hours = 48) {
  const cap = Math.max(1, Number(capacityMw) || 30)
  const schedule = []

  for (let h = 0; h < hours; h++) {
    const hourOfDay = (h + new Date().getHours()) % 24
    let factor = 0.5

    if (type === 'solar') {
      // Duck Curve: lower daytime (solar self-generation), high evening peak 18-22h
      if (hourOfDay >= 18 && hourOfDay <= 22) {
        factor = 0.85
      } else if (hourOfDay >= 10 && hourOfDay <= 15) {
        factor = 0.35
      } else if (hourOfDay >= 6 && hourOfDay <= 17) {
        factor = 0.6
      } else {
        factor = 0.4
      }
    } else {
      // Wind: base load with evening & early morning peaks
      if ((hourOfDay >= 18 && hourOfDay <= 23) || (hourOfDay >= 6 && hourOfDay <= 9)) {
        factor = 0.75
      } else {
        factor = 0.5
      }
    }

    schedule.push({
      hour_offset: h,
      demand_mw: Number((cap * factor).toFixed(1)),
    })
  }

  return schedule
}

export default function AddPlantModal({ isOpen, onClose, onPlantCreated }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('solar')
  const [capacityMw, setCapacityMw] = useState(35)
  const [latitude, setLatitude] = useState(23.0225)
  const [longitude, setLongitude] = useState(72.5714)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleApplyPreset = (preset) => {
    setName(preset.name.split(',')[0])
    setType(preset.type)
    setLatitude(preset.lat)
    setLongitude(preset.lon)
    setCapacityMw(preset.defaultCapacity)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !capacityMw) return

    setLoading(true)
    setError(null)

    try {
      const demandSchedule = generateInitialDemandSchedule(capacityMw, type, 48)
      const payload = {
        name: name.trim(),
        type,
        capacity_mw: Number(capacityMw),
        latitude: Number(latitude),
        longitude: Number(longitude),
        demand_schedule: demandSchedule,
      }

      const newPlant = await createPlant(payload)
      onPlantCreated?.(newPlant)
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to create plant. Ensure backend v0.2 is reachable and authenticated.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-white p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
            <Plus size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy tracking-tight">
              Register New Generation Asset
            </h2>
            <p className="text-xs text-slate-500">
              Configure Solar PV or Wind Farm for multi-tenant forecast telemetry
            </p>
          </div>
        </div>

        {/* Location Quick-Presets */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
            <MapPin size={12} className="text-orange-600" />
            Quick Location Presets:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-950 transition-all"
              >
                {preset.type === 'solar' ? (
                  <Sun size={11} className="text-amber-500" />
                ) : (
                  <Wind size={11} className="text-sky-500" />
                )}
                <span>{preset.name.split(',')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/20 bg-dangerbg p-3 text-xs text-danger">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plant Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Plant Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Khavda Hybrid Wind-Solar Zone"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-navy placeholder:text-slate-400 focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
            />
          </div>

          {/* Plant Type & Rated Capacity Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Asset Type
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setType('solar')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    type === 'solar'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  <Sun size={13} />
                  <span>Solar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('wind')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    type === 'wind'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  <Wind size={13} />
                  <span>Wind</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Rated Capacity (MW)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  required
                  value={capacityMw}
                  onChange={(e) => setCapacityMw(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-xs font-bold text-navy focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                  MW
                </span>
              </div>
            </div>
          </div>

          {/* Geographic Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Compass size={11} className="text-slate-400" />
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-xs text-navy focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Compass size={11} className="text-slate-400" />
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-2 font-mono text-xs text-navy focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              />
            </div>
          </div>

          {/* Auto-schedule note */}
          <p className="text-[11px] text-slate-400">
            * Backend automatically initializes a 48h {type === 'solar' ? 'duck-curve' : 'wind-profile'} demand schedule scaled to {capacityMw || 0} MW.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate disabled:opacity-60 transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Creating Plant on Grid...</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Deploy Plant to Grid EMS</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
