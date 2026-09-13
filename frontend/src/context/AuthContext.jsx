import { createContext, useContext, useEffect, useState } from 'react'
import { getMe, getStoredToken, getStoredUser, login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [token, setToken] = useState(getStoredToken)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Verify session on mount if token exists
  useEffect(() => {
    let cancelled = false

    async function checkAuth() {
      const stored = getStoredToken()
      if (!stored) {
        if (!cancelled) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      try {
        const me = await getMe()
        if (!cancelled) {
          setUser(me)
          setToken(stored)
          localStorage.setItem('auth_user', JSON.stringify(me))
        }
      } catch (err) {
        if (!cancelled) {
          const storedU = getStoredUser()
          if (storedU) setUser(storedU)
          else {
            setUser(null)
            setToken(null)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkAuth()

    const handleUnauthorized = () => {
      setUser(null)
      setToken(null)
    }

    const handleLogout = () => {
      setUser(null)
      setToken(null)
    }

    window.addEventListener('auth:unauthorized', handleUnauthorized)
    window.addEventListener('auth:logout', handleLogout)

    return () => {
      cancelled = true
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
      window.removeEventListener('auth:logout', handleLogout)
    }
  }, [])

  const login = async (email, password) => {
    setAuthError(null)
    try {
      const data = await apiLogin({ email, password })
      setUser(data.user || { email })
      setToken(data.access_token)
      return { success: true, data }
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Authentication failed. Please check your email and password.'
      setAuthError(message)
      return { success: false, error: message }
    }
  }

  const register = async (email, password) => {
    setAuthError(null)
    try {
      const data = await apiRegister({ email, password })
      setUser(data.user || { email })
      setToken(data.access_token)
      return { success: true, data }
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Registration failed. Please check your credentials and try again.'
      setAuthError(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    apiLogout()
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        loading,
        authError,
        login,
        register,
        logout,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
