import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Plus, X } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import SummaryCards from '../components/SummaryCards.jsx'
import ForecastChart from '../components/ForecastChart.jsx'
import RiskHeatmap from '../components/RiskHeatmap.jsx'
import HourlyTable from '../components/HourlyTable.jsx'
import PlantConfigPanel from '../components/PlantConfigPanel.jsx'
import AddPlantModal from '../components/AddPlantModal.jsx'
import { getForecast, getHealth, getMockForecast, getPlants } from '../api/client.js'

const POLL_INTERVAL_MS = 60_000

export default function Dashboard() {
  const [plants, setPlants] = useState([])
  const [selectedPlantId, setSelectedPlantId] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [windowHours, setWindowHours] = useState(48)

  const [isLive, setIsLive] = useState(false)
  const [usingMock, setUsingMock] = useState(false)
  const [plantsLoading, setPlantsLoading] = useState(true)
  const [forecastLoading, setForecastLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [plantsError, setPlantsError] = useState(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [showAddPlant, setShowAddPlant] = useState(false)

  const pollRef = useRef(null)

  const loadPlants = useCallback(async ({ selectNewest = false } = {}) => {
    setPlantsLoading(true)
    try {
      const list = await getPlants()
      setPlants(Array.isArray(list) ? list : [])
      if (Array.isArray(list) && list.length > 0) {
        if (selectNewest) {
          setSelectedPlantId(list[list.length - 1].plant_id)
        } else {
          setSelectedPlantId((prev) => prev || list[0].plant_id)
        }
      }
      setPlantsError(null)
    } catch (e) {
      setPlantsError('Could not load plant list from the API.')
    } finally {
      setPlantsLoading(false)
    }
  }, [])

  // --- Load plant list + health once on mount ---
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const health = await getHealth()
        if (!cancelled) setIsLive(Boolean(health?.status === 'ok'))
      } catch {
        if (!cancelled) setIsLive(false)
      }
      if (!cancelled) await loadPlants()
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [loadPlants])

  // --- Fetch forecast (with mock fallback) whenever plant or window changes ---
  const fetchForecast = useCallback(
    async ({ silent = false, isUserRefresh = false } = {}) => {
      if (!selectedPlantId) {
        setForecast(null)
        setForecastLoading(false)
        return
      }
      if (!silent) setForecastLoading(true)
      if (isUserRefresh) setRefreshing(true)
      try {
        const data = await getForecast(selectedPlantId, windowHours)
        setForecast(data)
        setUsingMock(false)
        setBannerDismissed(false)
      } catch (e) {
        try {
          const mock = await getMockForecast(windowHours)
          setForecast(mock)
          setUsingMock(true)
        } catch (mockErr) {
          setForecast(null)
        }
      } finally {
        if (!silent) setForecastLoading(false)
        if (isUserRefresh) setRefreshing(false)
      }
    },
    [selectedPlantId, windowHours]
  )

  useEffect(() => {
    fetchForecast()
  }, [fetchForecast])

  // --- Poll every 60s, cleared on unmount or dependency change ---
  useEffect(() => {
    if (!selectedPlantId) return undefined
    pollRef.current = setInterval(() => {
      fetchForecast({ silent: true })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [selectedPlantId, fetchForecast])

  const selectedPlant = plants.find((p) => p.plant_id === selectedPlantId) || null
  const noPlantsYet = !plantsLoading && plants.length === 0 && !plantsError

  return (
    <div className="min-h-screen w-full bg-page dark:bg-slate-950 text-navy dark:text-slate-100 antialiased transition-colors">
      <TopBar
        plants={plants}
        selectedPlantId={selectedPlantId}
        onSelectPlant={setSelectedPlantId}
        isLive={isLive && !usingMock}
        loading={plantsLoading}
        onRefresh={() => fetchForecast({ silent: false, isUserRefresh: true })}
        refreshing={refreshing}
        onAddPlant={() => setShowAddPlant(true)}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {plantsError && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-danger/20 bg-dangerbg dark:bg-red-950/30 px-4 py-3 text-sm text-danger dark:text-red-300 shadow-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-medium">{plantsError}</span>
          </div>
        )}

        {usingMock && !bannerDismissed && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rust/20 bg-rustbg dark:bg-orange-950/30 px-4 py-3 text-sm text-rust dark:text-orange-300 shadow-sm">
            <span className="flex items-center gap-2.5 font-medium">
              <AlertCircle size={16} className="shrink-0" />
              Showing demo data — live forecast unavailable
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              className="rounded-lg p-1 text-rust/70 hover:bg-rust/10 hover:text-rust transition-colors"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {noPlantsYet && (
          <div className="mb-5 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center shadow-card">
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              You don't have any plants configured yet. Add your first solar or wind plant to see a live forecast.
            </p>
            <button
              onClick={() => setShowAddPlant(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-navy/90"
            >
              <Plus size={13} />
              Add your first plant
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* 1. Summary Cards Row */}
          <SummaryCards forecast={forecast} loading={forecastLoading} />

          {/* 2. Generation Forecast (Left) & Demand Schedule (Right) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-9 xl:col-span-9 2xl:col-span-9 flex flex-col min-w-0">
              <ForecastChart
                points={forecast?.points}
                windowHours={windowHours}
                onWindowChange={setWindowHours}
                loading={forecastLoading}
                capacity={selectedPlant?.capacity_mw}
              />
            </div>

            <div className="lg:col-span-3 xl:col-span-3 2xl:col-span-3 flex flex-col min-w-0">
              <PlantConfigPanel
                plant={selectedPlant}
                loading={plantsLoading}
                onScheduleSaved={(updated) => {
                  setPlants((prev) =>
                    prev.map((p) => (p.plant_id === updated.plant_id ? updated : p))
                  )
                  fetchForecast({ silent: true })
                }}
              />
            </div>
          </div>

          {/* 3. Risk Heatmap Ribbon */}
          <RiskHeatmap points={forecast?.points} loading={forecastLoading} />

          {/* 4. Hourly Detail Table */}
          <HourlyTable points={forecast?.points} loading={forecastLoading} />
        </div>
      </main>

      {showAddPlant && (
        <AddPlantModal
          onClose={() => setShowAddPlant(false)}
          onCreated={async (plant) => {
            setShowAddPlant(false)
            await loadPlants({ selectNewest: true })
          }}
        />
      )}
    </div>
  )
}
