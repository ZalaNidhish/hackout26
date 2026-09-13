import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  getToken, setToken, clearToken,
  login as apiLogin, register as apiRegister, getMe,
} from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // true while we check for an existing session

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    // We have a token from a previous session — verify it's still valid
    // and fetch who it belongs to, rather than trusting it blindly.
    getMe()
      .then((me) => setUser(me))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (email, password) => {
    const data = await apiRegister(email, password)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
