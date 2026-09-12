import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

// --- Health ---

export async function getHealth() {
  const { data } = await api.get('/health')
  return data
}

// --- Plants ---

export async function getPlants() {
  const { data } = await api.get('/plants')
  if (Array.isArray(data)) {
    return data.map((p) => ({
      ...p,
      name: p.name === 'Demo Solar Farm' ? 'Solar Farm1' : p.name,
    }))
  }
  return data
}

export async function getPlant(plantId) {
  const { data } = await api.get(`/plants/${plantId}`)
  if (data && data.name === 'Demo Solar Farm') {
    return { ...data, name: 'Solar Farm1' }
  }
  return data
}

export async function createPlant(payload) {
  const { data } = await api.post('/plants', payload)
  return data
}

export async function updateDemandSchedule(plantId, schedule) {
  const { data } = await api.put(`/plants/${plantId}/demand-schedule`, schedule)
  return data
}

// --- Forecast ---

export async function getForecast(plantId, hours = 48) {
  const { data } = await api.get(`/forecast/${plantId}`, { params: { hours } })
  return data
}

export async function getMockForecast(hours = 48) {
  const { data } = await api.get('/mock/forecast', { params: { hours } })
  return data
}
