/**
 * Theme Manager for Light and Dark mode.
 * Rule: After 6:00 PM (18:00) until 6:00 AM, the default theme is Dark Mode.
 * Users can also manually toggle between Light and Dark mode anytime.
 */

export function isNightTime() {
  const hour = new Date().getHours()
  return hour >= 18 || hour < 6
}

export function getInitialTheme() {
  const saved = localStorage.getItem('theme_preference')
  if (saved === 'dark' || saved === 'light') {
    return saved
  }
  // By default: after 6:00 PM is Dark mode, daytime is Light mode
  return isNightTime() ? 'dark' : 'light'
}

export function applyThemeToDocument(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.style.colorScheme = 'dark'
  } else {
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
  }
}
