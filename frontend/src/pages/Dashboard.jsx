import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Info, X } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import SummaryCards from '../components/SummaryCards.jsx'
import ForecastChart from '../components/ForecastChart.jsx'
import RiskHeatmap from '../components/RiskHeatmap.jsx'
import HourlyTable from '../components/HourlyTable.jsx'
import PlantConfigPanel from '../components/PlantConfigPanel.jsx'
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

  const pollRef = useRef(null)

  // --- Load plant list + health once on mount ---
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setPlantsLoading(true)
      try {
        const health = await getHealth()
        if (!cancelled) setIsLive(Boolean(health?.status === 'ok'))
      } catch {
        if (!cancelled) setIsLive(false)
      }

      try {
        const list = await getPlants()
        if (cancelled) return
        setPlants(Array.isArray(list) ? list : [])
        if (Array.isArray(list) && list.length > 0) {
          setSelectedPlantId(list[0].plant_id)
        }
        setPlantsError(null)
      } catch (e) {
        if (!cancelled) setPlantsError('Could not load plant list from the API.')
      } finally {
        if (!cancelled) setPlantsLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  // --- Fetch forecast (with mock fallback) whenever plant or window changes ---
  const fetchForecast = useCallback(
    async ({ silent = false, isUserRefresh = false } = {}) => {
      if (!selectedPlantId) return
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

  return (
    <div className="min-h-screen w-full bg-page text-navy antialiased">
      <TopBar
        plants={plants}
        selectedPlantId={selectedPlantId}
        onSelectPlant={setSelectedPlantId}
        isLive={isLive && !usingMock}
        loading={plantsLoading}
        onRefresh={() => fetchForecast({ silent: false, isUserRefresh: true })}
        refreshing={refreshing}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {plantsError && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-danger/20 bg-dangerbg px-4 py-3 text-sm text-danger shadow-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="font-medium">{plantsError}</span>
          </div>
        )}

        {usingMock && !bannerDismissed && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-rust/20 bg-rustbg px-4 py-3 text-sm text-rust shadow-sm">
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

        {!plantsLoading && plants.length === 0 && !plantsError && (
          <div className="mb-5 rounded-xl border border-border bg-white p-8 text-center text-sm text-slate-500 shadow-card">
            No plants configured yet. Add a plant via the API to see forecast data here.
          </div>
        )}

        <div className="space-y-6">
          {/* 1. Summary Cards Row */}
          <SummaryCards forecast={forecast} loading={forecastLoading} />

          {/* 2. Generation Forecast (Left 3/4 Space) & Demand Schedule (Right 1/4 Space) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            {/* Left: Generation Forecast (3/4 space = 9 cols) */}
            <div className="lg:col-span-9 xl:col-span-9 2xl:col-span-9 flex flex-col">
              <ForecastChart
                points={forecast?.points}
                windowHours={windowHours}
                onWindowChange={setWindowHours}
                loading={forecastLoading}
                capacity={selectedPlant?.capacity_mw}
              />
            </div>

            {/* Right: Demand Schedule (1/4 space = 3 cols) */}
            <div className="lg:col-span-3 xl:col-span-3 2xl:col-span-3 flex flex-col">
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

          {/* 3. Risk Heatmap Ribbon (100vw) */}
          <RiskHeatmap points={forecast?.points} loading={forecastLoading} />

          {/* 4. Hourly Detail Table (100vw) */}
          <HourlyTable points={forecast?.points} loading={forecastLoading} />
        </div>
      </main>
    </div>
  )
}
