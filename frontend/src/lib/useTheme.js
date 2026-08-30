import { useEffect, useState } from 'react'

const KEY = 'sms-classifier-theme'

function readStored() {
  try {
    return localStorage.getItem(KEY) || 'system'
  } catch {
    return 'system'
  }
}

/** Cycles system -> dark -> light -> system. Persisted in localStorage. */
export function useTheme() {
  const [theme, setTheme] = useState(readStored)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // storage unavailable — theme still applies for this session
    }
  }, [theme])

  const cycle = () => setTheme((t) => (t === 'system' ? 'dark' : t === 'dark' ? 'light' : 'system'))

  return [theme, cycle]
}
