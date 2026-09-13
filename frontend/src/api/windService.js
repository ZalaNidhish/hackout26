/**
 * Real-Time Wind Energy Service
 * 
 * Fetches real-time weather & wind telemetry from Open-Meteo API (free, open, no auth required)
 * and computes aerodynamic turbine generation using standard physical wind power models:
 * - Cut-in speed: 3.0 m/s
 * - Rated speed: 11.5 m/s
 * - Cut-out speed: 25.0 m/s
 * - Wind speed at turbine hub-height (100m) & surface (10m)
 * - Wind direction, gust peaks, and power generation (P10, P50, P90)
 */

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast'

export function generateDefaultDemandSchedule(capacityMw = 45, type = 'wind', hours = 48) {
  const cap = Math.max(1, Number(capacityMw) || 45)
  const isWind = type?.toLowerCase() === 'wind'
  const schedule = []
  const nowHour = new Date().getHours()

  for (let h = 0; h < hours; h++) {
    const hourOfDay = (nowHour + h) % 24
    let factor = 0.5
    if (isWind) {
      factor = (hourOfDay >= 18 && hourOfDay <= 23) || (hourOfDay >= 6 && hourOfDay <= 9) ? 0.72 : 0.48
    } else {
      factor = hourOfDay >= 18 && hourOfDay <= 22 ? 0.82 : hourOfDay >= 10 && hourOfDay <= 15 ? 0.38 : 0.55
    }
    schedule.push({
      hour_offset: h,
      demand_mw: Number((cap * factor).toFixed(1)),
    })
  }
  return schedule
}

export const DEFAULT_PLANTS = [
  {
    plant_id: 'plant-wind-muppandal',
    name: 'Muppandal Wind Farm',
    type: 'wind',
    capacity_mw: 45.0,
    latitude: 8.2588,
    longitude: 77.5457,
    location_name: 'Kanyakumari, Tamil Nadu',
    hub_height_m: 100,
    cut_in_ms: 3.0,
    rated_ms: 11.5,
    cut_out_ms: 25.0,
    demand_schedule: generateDefaultDemandSchedule(45.0, 'wind', 48),
  },
  {
    plant_id: 'plant-wind-jaisalmer',
    name: 'Jaisalmer Wind Park',
    type: 'wind',
    capacity_mw: 50.0,
    latitude: 26.9157,
    longitude: 70.9083,
    location_name: 'Thar Desert, Rajasthan',
    hub_height_m: 100,
    cut_in_ms: 3.0,
    rated_ms: 11.5,
    cut_out_ms: 25.0,
    demand_schedule: generateDefaultDemandSchedule(50.0, 'wind', 48),
  },
  {
    plant_id: 'plant-wind-khavda',
    name: 'Khavda Renewable Energy Hub',
    type: 'wind',
    capacity_mw: 60.0,
    latitude: 23.8500,
    longitude: 69.7500,
    location_name: 'Kutch, Gujarat',
    hub_height_m: 110,
    cut_in_ms: 3.0,
    rated_ms: 12.0,
    cut_out_ms: 25.0,
    demand_schedule: generateDefaultDemandSchedule(60.0, 'wind', 48),
  },
  {
    plant_id: 'plant-solar-charanka',
    name: 'Charanka Solar Park',
    type: 'solar',
    capacity_mw: 35.0,
    latitude: 23.9038,
    longitude: 71.2014,
    location_name: 'Patan, Gujarat',
    demand_schedule: generateDefaultDemandSchedule(35.0, 'solar', 48),
  },
  {
    plant_id: 'plant-solar-bhadla',
    name: 'Bhadla Solar Park',
    type: 'solar',
    capacity_mw: 50.0,
    latitude: 27.5397,
    longitude: 71.9167,
    location_name: 'Jodhpur, Rajasthan',
    demand_schedule: generateDefaultDemandSchedule(50.0, 'solar', 48),
  },
]

/**
 * Converts degrees to 16-point cardinal compass direction
 */
export function getCompassDirection(degrees) {
  if (degrees === null || degrees === undefined) return 'N/A'
  const deg = (degrees % 360 + 360) % 360
  const cardinals = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
  ]
  const idx = Math.round(deg / 22.5) % 16
  return cardinals[idx]
}

/**
 * Calculates physical wind turbine power output in MW based on wind speed (m/s)
 */
export function calculateTurbinePower(windSpeedMs, capacityMw = 45, cutIn = 3.0, rated = 11.5, cutOut = 25.0) {
  const v = Math.max(0, windSpeedMs)
  if (v < cutIn || v >= cutOut) {
    return 0.0
  }
  if (v >= rated) {
    return capacityMw
  }
  // Cubic power curve transition between cut-in and rated speed
  const fraction = Math.pow(v - cutIn, 3) / Math.pow(rated - cutIn, 3)
  return Math.min(capacityMw, Math.max(0, fraction * capacityMw))
}

/**
 * Fetch real-time hourly wind and weather telemetry from Open-Meteo API
 */
export async function fetchRealtimeWindTelemetry(lat, lon, hours = 48) {
  const url = new URL(OPEN_METEO_BASE)
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set(
    'hourly',
    'wind_speed_10m,wind_speed_100m,wind_direction_10m,wind_direction_100m,wind_gusts_10m,temperature_2m,surface_pressure,cloud_cover,shortwave_radiation'
  )
  url.searchParams.set('forecast_days', String(Math.min(16, Math.max(3, Math.ceil(hours / 24) + 1))))
  url.searchParams.set('timezone', 'auto')

  const resp = await fetch(url.toString())
  if (!resp.ok) {
    throw new Error(`Open-Meteo API returned status ${resp.status}`)
  }
  const json = await resp.json()
  return json
}

/**
 * Transforms real-time Open-Meteo wind data into full ForecastResponse model
 */
export function buildRealtimeWindForecast(rawMeteo, plant, hours = 48) {
  const hourly = rawMeteo?.hourly || {}
  const times = hourly.time || []
  const count = Math.min(hours, times.length)

  const capacity = plant.capacity_mw || 45.0
  const isWind = plant.type?.toLowerCase() === 'wind'
  const points = []

  let totalGenP50 = 0
  let totalDemand = 0
  let stormHours = 0

  const plantSchedule = Array.isArray(plant.demand_schedule) && plant.demand_schedule.length > 0
    ? plant.demand_schedule
    : generateDefaultDemandSchedule(capacity, plant.type, count)

  const scheduleMap = {}
  plantSchedule.forEach((d) => {
    scheduleMap[d.hour_offset] = d.demand_mw
  })

  for (let i = 0; i < count; i++) {
    const timestamp = times[i]
    const windSpeed10m = hourly.wind_speed_10m?.[i] ?? 6.2
    const windSpeed100m = hourly.wind_speed_100m?.[i] ?? (windSpeed10m * 1.28)
    const windDir = hourly.wind_direction_100m?.[i] ?? hourly.wind_direction_10m?.[i] ?? 240
    const windGusts = hourly.wind_gusts_10m?.[i] ?? (windSpeed10m * 1.4)
    const tempC = hourly.temperature_2m?.[i] ?? 28
    const solarRad = hourly.shortwave_radiation?.[i] ?? 0

    let p50 = 0
    let p10 = 0
    let p90 = 0
    let severeWeather = false

    if (isWind) {
      const effectiveSpeed = windSpeed100m
      const baseGen = calculateTurbinePower(effectiveSpeed, capacity)

      p50 = Number(baseGen.toFixed(2))
      p10 = Number(Math.max(0, calculateTurbinePower(effectiveSpeed * 0.85, capacity)).toFixed(2))
      p90 = Number(Math.min(capacity, calculateTurbinePower(effectiveSpeed * 1.15, capacity)).toFixed(2))

      if (windGusts >= 22.0 || effectiveSpeed >= 24.0) {
        severeWeather = true
        stormHours++
      }
    } else {
      const daylightFactor = Math.max(0, solarRad / 950)
      const baseGen = daylightFactor * capacity * (1 - (tempC - 25) * 0.004)
      p50 = Number(Math.max(0, Math.min(capacity, baseGen)).toFixed(2))
      p10 = Number(Math.max(0, p50 * 0.82).toFixed(2))
      p90 = Number(Math.min(capacity, p50 * 1.12).toFixed(2))
    }

    const demandMw = scheduleMap[i] !== undefined
      ? Number(scheduleMap[i])
      : Number((capacity * 0.5).toFixed(1))

    let status = 'normal'
    let action = 'Nominal dispatch schedule'

    const margin = p50 - demandMw
    if (severeWeather) {
      status = 'emergency'
      action = `High wind cut-out risk (${windGusts.toFixed(1)} m/s gusts). Standby turbine feathering.`
    } else if (margin < -0.15 * capacity) {
      status = 'shortage'
      action = isWind
        ? `Wind deficit of ${Math.abs(margin).toFixed(1)} MW. Dispatch thermal/BESS reserve.`
        : `Solar deficit of ${Math.abs(margin).toFixed(1)} MW. Procure from RTM grid exchange.`
    } else if (margin > 0.15 * capacity) {
      status = 'surplus'
      action = isWind
        ? `Wind surplus +${margin.toFixed(1)} MW. Charge BESS storage or export via DAM.`
        : `Solar surplus +${margin.toFixed(1)} MW. Export to regional grid node.`
    }

    totalGenP50 += p50
    totalDemand += demandMw

    points.push({
      hour_offset: i,
      timestamp,
      p10,
      p50,
      p90,
      demand_mw: demandMw,
      status,
      action,
      severe_weather: severeWeather,
      wind_speed_10m: Number(windSpeed10m.toFixed(1)),
      wind_speed_100m: Number(windSpeed100m.toFixed(1)),
      wind_direction: Math.round(windDir),
      wind_direction_cardinal: getCompassDirection(windDir),
      wind_gusts: Number(windGusts.toFixed(1)),
      temperature_c: Number(tempC.toFixed(1)),
    })
  }

  const avoidedCo2 = Number((totalGenP50 * 0.82).toFixed(1))
  const estimatedSavings = Math.round(totalGenP50 * 3200)

  return {
    plant_id: plant.plant_id,
    plant_name: plant.name,
    plant_type: plant.type,
    capacity_mw: capacity,
    generated_at: new Date().toISOString(),
    hours_ahead: count,
    forecast_confidence: stormHours > 4 ? 'Medium' : 'High',
    estimated_savings_inr: estimatedSavings,
    avoided_emissions_tco2: avoidedCo2,
    total_generation_mwh: Number(totalGenP50.toFixed(1)),
    total_demand_mwh: Number(totalDemand.toFixed(1)),
    points,
    current_telemetry: points[0] || null,
  }
}
