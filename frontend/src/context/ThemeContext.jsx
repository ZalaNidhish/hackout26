import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'rgfp_theme_override' // 'light' | 'dark' | absent (= auto)

function isNightTime(date = new Date()) {
  const hour = date.getHours()
  return hour >= 18 || hour < 6 // 6pm-6am counts as "night"
}

function computeAutoTheme() {
  return isNightTime() ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [override, setOverride] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [theme, setTheme] = useState(() => override || computeAutoTheme())

  // Apply the theme class to <html> so Tailwind's `dark:` variants work.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // If the user hasn't manually overridden, re-check every few minutes so
  // the app actually flips to dark mode right around sunset while it's open,
  // not just on next page load.
  useEffect(() => {
    if (override) return
    const interval = setInterval(() => {
      setTheme(computeAutoTheme())
    }, 5 * 60 * 1000) // every 5 minutes
    return () => clearInterval(interval)
  }, [override])

  // Keep theme in sync if override changes (e.g. user toggles manually).
  useEffect(() => {
    if (override) {
      setTheme(override)
    } else {
      setTheme(computeAutoTheme())
    }
  }, [override])

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setOverride(next)
    localStorage.setItem(STORAGE_KEY, next)
    setTheme(next)
  }, [theme])

  const resetToAuto = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setOverride(null)
    setTheme(computeAutoTheme())
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, resetToAuto, isAuto: !override }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
