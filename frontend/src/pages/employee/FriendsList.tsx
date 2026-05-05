import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { api } from '../../api'
import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'

import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import ChatIcon from '@mui/icons-material/Chat'
import BlockIcon from '@mui/icons-material/Block'
import FlagIcon from '@mui/icons-material/Flag'

export default function FriendsList({ mode = 'both' }: { mode?: 'friends' | 'requests' | 'both' }) {
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [fRes, rRes] = await Promise.all([
        api.get('/friendships/friends'),
        api.get('/friendships/requests')
      ])
      setFriends(fRes.data ?? [])
      setRequests(rRes.data ?? [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, user: any) => {
    setAnchorEl(event.currentTarget)
    setSelectedUser(user)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setSelectedUser(null)
  }

  const accept = async (id: number) => {
    try {
      await api.post(`/friendships/requests/${id}/accept`)
      await load()
    } catch { alert('Action failed.') }
  }

  const reject = async (id: number) => {
    try {
      await api.post(`/friendships/requests/${id}/reject`)
      await load()
    } catch { alert('Action failed.') }
  }

  const cancelSent = async (id: number) => {
    if (!window.confirm('Cancel this friend request?')) return
    try {
      await api.delete(`/friendships/requests/${id}`)
      await load()
    } catch { alert('Action failed.') }
  }

  const removeFriend = async () => {
    if (!selectedUser || !window.confirm('Remove this friend?')) return
    try {
      await api.delete(`/friendships/friends/${selectedUser.id}`)
      await load()
    } catch { alert('Action failed.') }
    finally { handleMenuClose() }
  }

  const blockUser = async () => {
    if (!selectedUser) return
    const isBlocked = selectedUser.isBlocked
    if (!isBlocked && !window.confirm(`Block ${selectedUser.firstName}? They will no longer be able to message you.`)) return
    try {
      if (isBlocked) {
        await api.delete(`/messages/block/${selectedUser.id}`)
        alert('User unblocked.')
      } else {
        await api.post(`/messages/block/${selectedUser.id}`)
        alert('User blocked.')
      }
      await load()
    } catch { alert('Action failed.') }
    finally { handleMenuClose() }
  }

  const reportUser = () => {
    if (!selectedUser) return
    const reason = window.prompt('Reason for reporting:')
    if (reason) {
      alert('Report submitted.')
    }
    handleMenuClose()
  }

  if (loading) return <Typography sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>Loading...</Typography>

  return (
    <Stack spacing={4}>
      {(mode === 'both' || mode === 'requests') && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, color: 'primary.main' }}>
            Friend Requests ({requests.length})
          </Typography>
          {requests.length === 0 ? (
            <Typography sx={{ opacity: 0.5 }}>No pending requests.</Typography>
          ) : (
            <Grid container spacing={2}>
              {requests.map(r => (
                <Grid key={r.id} size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 2, border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.02)' }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: r.isOutgoing ? 'rgba(255,255,255,0.1)' : 'primary.main', color: r.isOutgoing ? 'white' : 'background.default', fontWeight: 900 }}>
                          {r.otherName?.[0]}
                        </Avatar>
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontWeight: 800 }}>{r.otherName}</Typography>
                            {r.isOutgoing && <Chip label="Sent" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }} />}
                          </Stack>
                          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>{r.otherTitle || 'User'}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        {r.isOutgoing ? (
                          <Button size="small" variant="outlined" color="inherit" onClick={() => cancelSent(r.id)} sx={{ opacity: 0.7 }}>Cancel</Button>
                        ) : (
                          <>
                            <Button size="small" variant="contained" onClick={() => accept(r.id)}>Accept</Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => reject(r.id)}>Ignore</Button>
                          </>
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {(mode === 'both' || mode === 'friends') && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Your Connections ({friends.length})</Typography>
          {friends.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Typography sx={{ opacity: 0.5 }}>You haven't added any friends yet. Use search to find people!</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {friends.map(f => (
                <Grid key={f.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }}>
                          {f.firstName?.[0]}{f.lastName?.[0]}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 800 }}>{f.firstName} {f.lastName}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>{f.professionalTitle || f.companyName || 'Professional'}</Typography>
                        </Box>
                      </Stack>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, f)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            border: '1px solid rgba(255,255,255,0.08)',
            minWidth: 180,
          }
        }}
      >
        <MenuItem component={RouterLink} to={`/messages?userId=${selectedUser?.id}`} onClick={handleMenuClose}>
          <ListItemIcon><ChatIcon fontSize="small" /></ListItemIcon>
          Message
        </MenuItem>
        <Divider sx={{ opacity: 0.1 }} />
        <MenuItem onClick={blockUser}>
          <ListItemIcon><BlockIcon fontSize="small" /></ListItemIcon>
          {selectedUser?.isBlocked ? 'Unblock User' : 'Block User'}
        </MenuItem>
        <MenuItem onClick={reportUser}>
          <ListItemIcon><FlagIcon fontSize="small" /></ListItemIcon>
          Report
        </MenuItem>
        <Divider sx={{ opacity: 0.1 }} />
        <MenuItem onClick={removeFriend} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          Remove Friend
        </MenuItem>
      </Menu>
    </Stack>
  )
}
