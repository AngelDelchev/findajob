import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'

type NotificationsCtx = {
  unread: number
  refreshUnread: () => Promise<void>
  decrementUnread: (by?: number) => void
  clearUnread: () => void
}

const Ctx = createContext<NotificationsCtx | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  const refreshUnread = async () => {
    if (!user) {
      setUnread(0)
      return
    }
    try {
      const res = await api.get('/notifications/unread-count')
      setUnread(res.data.count ?? 0)
    } catch {
      setUnread(0)
    }
  }

  const decrementUnread = (by: number = 1) => setUnread(prev => Math.max(0, prev - by))
  const clearUnread = () => setUnread(0)

  useEffect(() => {
    void refreshUnread()
  }, [user])

  const value = useMemo(() => ({ unread, refreshUnread, decrementUnread, clearUnread }), [unread])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useNotifications must be used within NotificationsProvider')
  return v
}
