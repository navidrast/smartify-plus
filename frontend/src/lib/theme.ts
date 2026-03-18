export type Theme = 'dark' | 'light' | 'auto'

const STORAGE_KEY = 'smartify-theme'

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const resolved = theme === 'auto' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('light', resolved === 'light')
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function getSavedTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'dark'
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'dark'
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}
