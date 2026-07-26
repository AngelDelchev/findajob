import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { NotificationsContext } from '../../notifications'
import type { NotificationsContextValue } from '../../notifications'

/** How often the unread badge is refreshed while the tab is visible. */
const POLL_INTERVAL_MS = 60_000

export default function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [unread, setUnread] = useState(0)

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnread(0)
      return
    }

    try {
      const response = await api.get<{ count: number }>('/notifications/unread-count')
      setUnread(response.data.count ?? 0)
    } catch {
      setUnread(0)
    }
  }, [user])

  const decrementUnread = useCallback((by = 1) => {
    setUnread((previous) => Math.max(0, previous - by))
  }, [])

  const clearUnread = useCallback(() => setUnread(0), [])

  useEffect(() => {
    void refreshUnread()
  }, [refreshUnread])

  // Keeps the badge roughly current without the user having to reload the page.
  useEffect(() => {
    if (!user) return

    const interval = window.setInterval(() => {
      if (!document.hidden) void refreshUnread()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [user, refreshUnread])

  const value = useMemo<NotificationsContextValue>(
    () => ({ unread, refreshUnread, decrementUnread, clearUnread }),
    [unread, refreshUnread, decrementUnread, clearUnread]
  )

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  )
}
