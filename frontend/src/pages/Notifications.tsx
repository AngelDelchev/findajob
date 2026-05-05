import { useEffect, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
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
  const { decrementUnread, clearUnread, refreshUnread } = useNotifications()

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get('/notifications/mine')
      const raw = res.data
      
      // Handle both raw arrays and common object wrappers
      let list = Array.isArray(raw) 
        ? raw 
        : (raw?.items || raw?.notifications || raw?.results || raw?.data || [])

      // Final fallback: search for any array field in the response object
      if (!Array.isArray(list) || list.length === 0) {
        const potentialList = Object.values(raw || {}).find(v => Array.isArray(v))
        if (potentialList) list = potentialList as any[]
      }
        
      setItems(Array.isArray(list) ? list : [])
    } catch (e) {
      console.error('Failed to load notifications:', e)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void refreshUnread()
  }, [])

  const markRead = async (n: NotificationItem) => {
    // Optimistic UI
    setItems(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item))
    if (!n.isRead) decrementUnread(1)
    
    try {
      await api.post(`/notifications/${n.id}/read`)
    } catch (e) {
      console.error('Failed to mark read:', e)
      void load(true) // Revert on failure
    }
  }

  const markAll = async () => {
    // Optimistic UI
    setItems(prev => prev.map(item => ({ ...item, isRead: true })))
    clearUnread()
    
    try {
      await api.post('/notifications/mark-all-read')
    } catch (e) {
      console.error('Failed to mark all read:', e)
      void load(true) // Revert on failure
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            Notifications
          </Typography>
          <Typography sx={{ opacity: 0.6 }}>Stay updated on your applications and messages</Typography>
        </Box>
        <Button 
          variant="outlined" 
          disabled={items.length === 0 || items.every(i => i.isRead)} 
          onClick={() => void markAll()}
          sx={{ fontWeight: 800 }}
        >
          Mark all as read
        </Button>
      </Stack>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.01)' }}>
        {loading && items.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography sx={{ opacity: 0.5 }}>Fetching your notifications...</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ opacity: 0.3, fontWeight: 900 }}>No notifications yet</Typography>
            <Typography sx={{ opacity: 0.2 }}>We'll let you know when something happens!</Typography>
          </Box>
        ) : (
          <Box>
            {items.map((n, idx) => (
              <Box 
                key={n.id} 
                sx={{ 
                  p: 3, 
                  backgroundColor: n.isRead ? 'transparent' : 'rgba(0,229,255,0.03)',
                  transition: 'background-color 0.3s',
                  position: 'relative',
                  borderLeft: n.isRead ? '4px solid transparent' : '4px solid',
                  borderColor: 'primary.main'
                }}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
                  <Stack spacing={0.5} sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography variant="h6" sx={{ fontWeight: 900, color: n.isRead ? 'inherit' : 'primary.main', fontSize: '1rem' }}>
                        {n.title}
                      </Typography>
                      {n.type && (
                        <Chip 
                          size="small" 
                          label={n.type} 
                          variant="outlined" 
                          sx={{ height: 20, fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 800 }} 
                        />
                      )}
                      {!n.isRead && (
                        <Chip 
                          size="small" 
                          label="New" 
                          color="primary" 
                          sx={{ height: 20, fontSize: '0.65rem', fontWeight: 900 }} 
                        />
                      )}
                    </Stack>
                    
                    <Typography sx={{ opacity: 0.85, mt: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {n.message}
                    </Typography>

                    <Typography sx={{ opacity: 0.4, mt: 1.5, fontSize: '0.75rem', fontWeight: 600 }}>
                      {new Date(n.createdAt).toLocaleString(undefined, { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                      })}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    {n.linkUrl && (
                      <Button 
                        size="small" 
                        variant="contained" 
                        component={RouterLink} 
                        to={n.linkUrl}
                        sx={{ fontWeight: 800 }}
                      >
                        Open
                      </Button>
                    ) }
                    {!n.isRead && (
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => void markRead(n)}
                        sx={{ fontWeight: 800 }}
                      >
                        Dismiss
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {idx !== items.length - 1 && (
                  <Divider sx={{ position: 'absolute', bottom: 0, left: 20, right: 20, borderColor: 'rgba(255,255,255,0.05)' }} />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  )
}
