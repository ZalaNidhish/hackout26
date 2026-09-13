import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Plus, RefreshCw, Sparkles, Wind, X, Zap } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import SummaryCards from '../components/SummaryCards.jsx'
import ForecastChart from '../components/ForecastChart.jsx'
import RiskHeatmap from '../components/RiskHeatmap.jsx'
import HourlyTable from '../components/HourlyTable.jsx'
import PlantConfigPanel from '../components/PlantConfigPanel.jsx'
import WindTelemetryCard from '../components/WindTelemetryCard.jsx'
import AddPlantModal from '../components/AddPlantModal.jsx'
import { getForecast, getHealth, getMockForecast, getPlants } from '../api/client.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

const POLL_INTERVAL_MS = 60_000

export default function Dashboard() {
  const { user, token, isAuthenticated, logout } = useAuth()
  const { theme, isDark, toggleTheme } = useTheme()

  const [plants, setPlants] = useState([])
  const [selectedPlantId, setSelectedPlantId] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [windowHours, setWindowHours] = useState(48)

  const [isLive, setIsLive] = useState(true)
  const [usingMock, setUsingMock] = useState(false)
  const [mockBannerDismissed, setMockBannerDismissed] = useState(false)

  const [plantsLoading, setPlantsLoading] = useState(true)
  const [forecastLoading, setForecastLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [plantsError, setPlantsError] = useState(null)

  // Modals
  const [isAddPlantOpen, setIsAddPlantOpen] = useState(false)

  const pollRef = useRef(null)

  // --- Load plant list + health when auth state changes or on mount ---
  const loadPlantsAndHealth = useCallback(async () => {
    setPlantsLoading(true)
    setPlantsError(null)

    try {
      const health = await getHealth()
      setIsLive(Boolean(health?.status === 'ok' || health?.status === 'live_telemetry'))
    } catch {
      setIsLive(true)
    }

    try {
      const list = await getPlants()
      const plantList = Array.isArray(list) ? list : []
      setPlants(plantList)
      if (plantList.length > 0) {
        setSelectedPlantId((curr) =>
          plantList.some((p) => p.plant_id === curr) ? curr : plantList[0].plant_id
        )
      }
      setPlantsError(null)
    } catch (e) {
      setPlantsError(null)
    } finally {
      setPlantsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPlantsAndHealth()
  }, [loadPlantsAndHealth, token])

  // --- Fetch forecast (real-time wind & solar) whenever plant or window changes ---
  const fetchForecast = useCallback(
    async ({ silent = false, isUserRefresh = false } = {}) => {
      if (!selectedPlantId) return
      if (!silent) setForecastLoading(true)
      if (isUserRefresh) setRefreshing(true)

      try {
        const data = await getForecast(selectedPlantId, windowHours)
        setForecast(data)
        setUsingMock(false)
      } catch (e) {
        try {
          const selected = plants.find((p) => p.plant_id === selectedPlantId)
          const mock = await getMockForecast(windowHours, selected)
          setForecast(mock)
          setUsingMock(true)
        } catch {
          setForecast(null)
        }
      } finally {
        if (!silent) setForecastLoading(false)
        if (isUserRefresh) setRefreshing(false)
      }
    },
    [selectedPlantId, windowHours, plants]
  )

  useEffect(() => {
    fetchForecast()
  }, [fetchForecast])

  // --- Poll every 60s for real-time wind & weather updates ---
  useEffect(() => {
    if (!selectedPlantId) return undefined
    pollRef.current = setInterval(() => {
      fetchForecast({ silent: true })
    }, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [selectedPlantId, fetchForecast])

  const handlePlantCreated = (newPlant) => {
    setPlants((prev) => [newPlant, ...prev])
    setSelectedPlantId(newPlant.plant_id)
    fetchForecast({ silent: false })
  }

  const selectedPlant = plants.find((p) => p.plant_id === selectedPlantId) || plants[0] || null
  const isWind = selectedPlant?.type?.toLowerCase() === 'wind'

  return (
    <div className="min-h-screen w-full bg-page text-navy antialiased transition-colors duration-200">
      <TopBar
        plants={plants}
        selectedPlantId={selectedPlantId}
        onSelectPlant={setSelectedPlantId}
        isLive={isLive}
        loading={plantsLoading}
        onRefresh={() => fetchForecast({ silent: false, isUserRefresh: true })}
        refreshing={refreshing}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAddPlant={() => setIsAddPlantOpen(true)}
      />

      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Dismissible Mock Fallback Banner */}
        {usingMock && !mockBannerDismissed && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 dark:border-amber-700 dark:bg-amber-950/50 p-3.5 text-xs text-amber-900 dark:text-amber-200 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Showing demo data ? live forecast unavailable.</span>
                <span className="hidden sm:inline text-amber-800 dark:text-amber-300 ml-1">
                  Using local predictive physics model while backend reconnects.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchForecast({ silent: false, isUserRefresh: true })}
                className="rounded-lg bg-amber-200/80 dark:bg-amber-800/80 px-2.5 py-1 font-bold text-amber-950 dark:text-amber-100 hover:bg-amber-300 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setMockBannerDismissed(true)}
                className="rounded-lg p-1 text-amber-700 hover:bg-amber-200/60 dark:hover:bg-amber-800/50 transition-colors"
                title="Dismiss notice"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Real-Time Wind & Weather Notice */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 p-3.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-600 text-white shadow-2xs">
              <Wind size={15} />
            </div>
            <div>
              <span className="font-bold text-xs text-sky-950 dark:text-sky-200">
                Live Real-Time Meteorological Telemetry Active
              </span>
              <p className="text-[11px] text-sky-800 dark:text-sky-300">
                Streaming hourly surface &amp; hub-height wind vectors with physical turbine power curve conversion.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsAddPlantOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition-all"
            >
              <Plus size={13} />
              <span>Add Plant</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* 1. Real-Time Wind Telemetry Card (Shown when Wind Asset is selected) */}
          {isWind && (
            <WindTelemetryCard
              plant={selectedPlant}
              telemetry={forecast?.current_telemetry || forecast?.points?.[0]}
              loading={forecastLoading}
            />
          )}

          {/* 2. Summary Cards Row */}
          <SummaryCards forecast={forecast} loading={forecastLoading} />

          {/* 3. Generation Forecast (Left 3/4 Space) & Demand Schedule (Right 1/4 Space) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
            {/* Left: Generation Forecast (9 cols) */}
            <div className="lg:col-span-9 xl:col-span-9 2xl:col-span-9 flex flex-col">
              <ForecastChart
                points={forecast?.points}
                windowHours={windowHours}
                onWindowChange={setWindowHours}
                loading={forecastLoading}
                capacity={selectedPlant?.capacity_mw}
                plantType={selectedPlant?.type || 'wind'}
              />
            </div>

            {/* Right: Demand Schedule (3 cols) */}
            <div className="lg:col-span-3 xl:col-span-3 2xl:col-span-3 flex flex-col">
              <PlantConfigPanel
                plant={selectedPlant}
                points={forecast?.points}
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

          {/* 4. Risk Heatmap Ribbon */}
          <RiskHeatmap points={forecast?.points} loading={forecastLoading} />

          {/* 5. Hourly Detail Table */}
          <HourlyTable points={forecast?.points} loading={forecastLoading} />
        </div>
      </main>

      {/* Add Plant Modal */}
      <AddPlantModal
        isOpen={isAddPlantOpen}
        onClose={() => setIsAddPlantOpen(false)}
        onPlantCreated={handlePlantCreated}
      />
    </div>
  )
}
