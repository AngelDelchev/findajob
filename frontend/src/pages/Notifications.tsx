import { useEffect, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import { useNotifications } from '../notifications'
import { Link as RouterLink } from 'react-router-dom'

type NotificationItem = {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  linkUrl?: string | null
  createdAt: string
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { decrementUnread, clearUnread, refreshUnread } = useNotifications()

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/notifications')
      setItems(res.data)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const markRead = async (n: NotificationItem) => {
    await api.put(`/notifications/${n.id}/read`)
    if (!n.isRead) decrementUnread(1)
    await load()
    await refreshUnread()
  }

  const markAll = async () => {
    await api.put('/notifications/read-all')
    clearUnread()
    await load()
    await refreshUnread()
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>Notifications</Typography>
        <Button variant="outlined" onClick={() => void markAll()}>Mark all read</Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>Loading…</Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 2 }}>No notifications yet.</Box>
        ) : (
          <Box>
            {items.map((n, idx) => (
              <Box key={n.id} sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 900, color: n.isRead ? 'inherit' : 'primary.main' }}>
                      {n.title}
                    </Typography>
                    {n.type ? <Chip size="small" label={n.type} variant="outlined" /> : null}
                    {!n.isRead ? <Chip size="small" label="NEW" color="primary" /> : null}
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    {n.linkUrl ? (
                      <Button size="small" variant="outlined" component={RouterLink} to={n.linkUrl}>
                        Open
                      </Button>
                    ) : null}
                    {!n.isRead ? (
                      <Button size="small" variant="contained" onClick={() => void markRead(n)}>
                        Mark read
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>

                <Typography sx={{ opacity: 0.85, mt: 1, whiteSpace: 'pre-wrap' }}>
                  {n.message}
                </Typography>

                <Typography sx={{ opacity: 0.6, mt: 1, fontSize: 12 }}>
                  {new Date(n.createdAt).toLocaleString()}
                </Typography>

                {idx !== items.length - 1 ? (
                  <Divider sx={{ mt: 2, borderColor: 'rgba(255,255,255,0.08)' }} />
                ) : null}
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  )
}
