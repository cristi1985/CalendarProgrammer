'use client'

import { useEffect, useSyncExternalStore } from 'react'

const themes = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'warm', label: 'Warm' },
] as const

type Theme = (typeof themes)[number]['value']

function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme.value === value)
}

const storageKey = 'calendar-programmer-theme'
const themeChangeEvent = 'calendar-programmer-theme-change'

function getThemeSnapshot(): Theme {
  const storedTheme = window.localStorage.getItem(storageKey)
  if (isTheme(storedTheme)) {
    return storedTheme
  }
  return 'default'
}

function getServerSnapshot(): Theme {
  return 'default'
}

function subscribeToTheme(callback: () => void){
  window.addEventListener('storage', callback)
  window.addEventListener(themeChangeEvent, callback)

  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(themeChangeEvent, callback)
  }
}

export default function ThemeSelector() {
  const [theme, setTheme] = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot)

  useEffect(() => {
     document.documentElement.dataset.theme = theme
    }, [theme]) 


  const handleThemeChange = (nextTheme: Theme) => {
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem('calendar-programmer-theme', nextTheme)
  }

  return (
    <label className="theme-selector">
      <span className="muted">Theme</span>
      <select
        className="theme-select"
        value={theme}
        onChange={(event) => handleThemeChange(event.target.value as Theme)}
      >
        {themes.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}
