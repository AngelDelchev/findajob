import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { useNotifications } from '../notifications'
import { useToast } from '../toast'
import { formatDateTime } from '../utils'
import type { NotificationItem } from '../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export default function Notifications() {
  const { decrementUnread, clearUnread, refreshUnread } = useNotifications()
  const { showError } = useToast()

  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)

      try {
        // The endpoint returns a plain array. The previous version searched the
        // response for "any field that happens to be an array" as a fallback, which
        // hid real failures behind a guess.
        const response = await api.get<NotificationItem[]>('/notifications/mine')
        setItems(response.data)
      } catch (error) {
        if (!silent) showError(errorMessage(error, 'Could not load your notifications.'))
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [showError]
  )

  useEffect(() => {
    void load()
    void refreshUnread()
  }, [load, refreshUnread])

  const markRead = async (notification: NotificationItem) => {
    setItems((previous) =>
      previous.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
    )

    if (!notification.isRead) decrementUnread(1)

    try {
      await api.post(`/notifications/${notification.id}/read`)
    } catch {
      // Reload to undo the optimistic update if the server disagreed.
      void load(true)
      void refreshUnread()
    }
  }

  const markAllRead = async () => {
    setItems((previous) => previous.map((item) => ({ ...item, isRead: true })))
    clearUnread()

    try {
      await api.post('/notifications/mark-all-read')
    } catch {
      void load(true)
      void refreshUnread()
    }
  }

  const unreadCount = items.filter((item) => !item.isRead).length

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3rem' } }}>
            Notifications
          </Typography>
          <Typography sx={{ opacity: 0.6 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          disabled={unreadCount === 0}
          onClick={() => void markAllRead()}
          sx={{ fontWeight: 800 }}
        >
          Mark all as read
        </Button>
      </Stack>

      <Paper
        sx={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.01)' }}
      >
        {loading && items.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography sx={{ opacity: 0.5 }}>Loading…</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ opacity: 0.35, fontWeight: 900 }}>
              No notifications yet
            </Typography>
            <Typography sx={{ opacity: 0.25 }}>
              We will let you know when something happens.
            </Typography>
          </Box>
        ) : (
          items.map((notification, index) => (
            <Box key={notification.id}>
              <Box
                sx={{
                  p: 3,
                  backgroundColor: notification.isRead ? 'transparent' : 'rgba(0,229,255,0.03)',
                  borderLeft: '4px solid',
                  borderLeftColor: notification.isRead ? 'transparent' : 'primary.main',
                  transition: 'background-color 0.3s',
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                  justifyContent="space-between"
                >
                  <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 900,
                          fontSize: '1rem',
                          color: notification.isRead ? 'inherit' : 'primary.main',
                        }}
                      >
                        {notification.title}
                      </Typography>

                      {notification.type ? (
                        <Chip
                          size="small"
                          label={notification.type}
                          variant="outlined"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            fontWeight: 800,
                          }}
                        />
                      ) : null}

                      {!notification.isRead ? (
                        <Chip
                          size="small"
                          label="New"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900 }}
                        />
                      ) : null}
                    </Stack>

                    <Typography sx={{ opacity: 0.85, mt: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {notification.message}
                    </Typography>

                    <Typography sx={{ opacity: 0.4, mt: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>
                      {formatDateTime(notification.createdAt)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    {notification.linkUrl ? (
                      <Button
                        size="small"
                        variant="contained"
                        component={RouterLink}
                        to={notification.linkUrl}
                        onClick={() => void markRead(notification)}
                        sx={{ fontWeight: 800 }}
                      >
                        Open
                      </Button>
                    ) : null}

                    {!notification.isRead ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void markRead(notification)}
                        sx={{ fontWeight: 800 }}
                      >
                        Dismiss
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </Box>

              {index !== items.length - 1 ? (
                <Divider sx={{ mx: 3, borderColor: 'rgba(255,255,255,0.05)' }} />
              ) : null}
            </Box>
          ))
        )}
      </Paper>
    </Box>
  )
}
