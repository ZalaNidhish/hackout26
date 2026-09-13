import { createContext, useContext, useEffect, useState } from 'react'
import { applyThemeToDocument, getInitialTheme, isNightTime } from '../lib/theme.js'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  // Periodic check (every 60s) to auto-switch if user hasn't set manual preference
  useEffect(() => {
    const interval = setInterval(() => {
      const saved = localStorage.getItem('theme_preference')
      if (!saved) {
        const autoTheme = isNightTime() ? 'dark' : 'light'
        setTheme(autoTheme)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme_preference', next)
  }

  const setThemeExplicitly = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme_preference', newTheme)
  }


  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme: setThemeExplicitly }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
