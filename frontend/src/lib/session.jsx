import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from './api'

const SessionContext = createContext(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)
  const [health, setHealth] = useState(null)
  const [dataRefreshKey, setDataRefreshKey] = useState(0)

  // Restore login state on load. The session cookie is HttpOnly, so this is
  // the only way the UI can know whether it's still valid.
  useEffect(() => {
    let cancelled = false
    api
      .me()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setChecked(true))
    return () => {
      cancelled = true
    }
  }, [])

  // System status: polled, not faked. If the gateway is unreachable this
  // reflects that instead of pretending everything is fine.
  useEffect(() => {
    let cancelled = false
    async function poll() {
      try {
        const h = await api.health()
        if (!cancelled) setHealth(h)
      } catch {
        if (!cancelled) setHealth({ gateway: 'unreachable', backend: 'unknown', database: 'unknown' })
      }
    }
    poll()
    const id = setInterval(poll, 20000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const refreshData = useCallback(() => setDataRefreshKey((k) => k + 1), [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // clear local state regardless — the cookie is gone or invalid either way
    }
    setUser(null)
    refreshData()
  }, [refreshData])

  return (
    <SessionContext.Provider value={{ user, setUser, checked, health, dataRefreshKey, refreshData, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function RequireAuth({ children }) {
  const { user, checked } = useSession()
  if (!checked) {
    return <div className="app-main" aria-hidden="true" />
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function RequireAdmin({ children }) {
  const { user } = useSession()
  if (!user?.is_admin) return <Navigate to="/app/dashboard" replace />
  return children
}
