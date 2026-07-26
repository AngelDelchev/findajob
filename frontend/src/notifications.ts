import { createContext, useContext } from 'react'

export type NotificationsContextValue = {
  unread: number
  refreshUnread: () => Promise<void>
  decrementUnread: (by?: number) => void
  clearUnread: () => void
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return context
}
