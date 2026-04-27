'use client'

import { useEffect, useState } from 'react'

const themes = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'warm', label: 'Warm' },
] as const

type Theme = (typeof themes)[number]['value']

function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme.value === value)
}

export default function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>('default')

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('calendar-programmer-theme')

    if (isTheme(storedTheme)) {
      setTheme(storedTheme)
      document.documentElement.dataset.theme = storedTheme
      return
    }

    document.documentElement.dataset.theme = 'default'
  }, [])

  const handleThemeChange = (nextTheme: Theme) => {
    setTheme(nextTheme)
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
