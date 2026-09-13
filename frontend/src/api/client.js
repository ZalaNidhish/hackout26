import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const TOKEN_KEY = 'rgfp_token'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

// Attach the JWT (if we have one) to every request automatically, so
// components never have to remember to pass it themselves.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the token is invalid/expired, the backend returns 401. Clear it so the
// app doesn't keep retrying with a dead token, and let ProtectedRoute
// redirect to /login on the next render.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
    }
    return Promise.reject(error)
  }
)

// --- Token storage helpers ---

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// --- Auth ---

export async function register(email, password) {
  const { data } = await api.post('/auth/register', { email, password })
  return data // { access_token, token_type, user }
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

// --- Health ---

export async function getHealth() {
  const { data } = await api.get('/health')
  return data
}

// --- Plants ---

export async function getPlants() {
  const { data } = await api.get('/plants')
  return data
}

export async function getPlant(plantId) {
  const { data } = await api.get(`/plants/${plantId}`)
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
