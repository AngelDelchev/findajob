import { useCallback, useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import { fullName, initials } from '../../utils'
import ProfileDialog from '../../components/ProfileDialog'
import type { Friend, FriendRequest } from '../../types'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BlockIcon from '@mui/icons-material/Block'
import ChatIcon from '@mui/icons-material/Chat'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PersonIcon from '@mui/icons-material/Person'

type Props = {
  mode?: 'friends' | 'requests' | 'both'
}

export default function FriendsList({ mode = 'both' }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [selected, setSelected] = useState<Friend | null>(null)
  const [viewingProfileOf, setViewingProfileOf] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [friendsResponse, requestsResponse] = await Promise.all([
        api.get<Friend[]>('/friendships/friends'),
        api.get<FriendRequest[]>('/friendships/requests'),
      ])

      setFriends(friendsResponse.data)
      setRequests(requestsResponse.data)
    } catch (error) {
      showError(errorMessage(error, 'Could not load your connections.'))
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    void load()
  }, [load])

  const closeMenu = () => {
    setAnchorEl(null)
    setSelected(null)
  }

  const openMenu = (event: MouseEvent<HTMLElement>, friend: Friend) => {
    setAnchorEl(event.currentTarget)
    setSelected(friend)
  }

  const respond = async (id: number, action: 'accept' | 'reject') => {
    try {
      await api.post(`/friendships/requests/${id}/${action}`)
      await load()
      showSuccess(action === 'accept' ? 'Connection accepted.' : 'Request declined.')
    } catch (error) {
      showError(errorMessage(error, 'Could not respond to the request.'))
    }
  }

  const cancelRequest = async (id: number) => {
    const confirmed = await confirm({
      title: 'Cancel this request?',
      confirmLabel: 'Cancel request',
      cancelLabel: 'Keep it',
    })

    if (!confirmed) return

    try {
      await api.delete(`/friendships/requests/${id}`)
      await load()
      showSuccess('Request cancelled.')
    } catch (error) {
      showError(errorMessage(error, 'Could not cancel the request.'))
    }
  }

  const removeFriend = async () => {
    if (!selected) return
    const target = selected
    closeMenu()

    const confirmed = await confirm({
      title: 'Remove this connection?',
      description: `${fullName(target.firstName, target.lastName)} will be removed from your connections.`,
      confirmLabel: 'Remove',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/friendships/friends/${target.id}`)
      await load()
      showSuccess('Connection removed.')
    } catch (error) {
      showError(errorMessage(error, 'Could not remove this connection.'))
    }
  }

  const toggleBlock = async () => {
    if (!selected) return
    const target = selected
    closeMenu()

    if (!target.isBlocked) {
      const confirmed = await confirm({
        title: `Block ${target.firstName || 'this user'}?`,
        description: 'They will no longer be able to message you.',
        confirmLabel: 'Block',
        destructive: true,
      })

      if (!confirmed) return
    }

    try {
      if (target.isBlocked) {
        await api.delete(`/messages/block/${target.id}`)
        showSuccess('User unblocked.')
      } else {
        await api.post(`/messages/block/${target.id}`)
        showSuccess('User blocked.')
      }

      await load()
    } catch (error) {
      showError(errorMessage(error, 'Could not update the block list.'))
    }
  }

  if (loading) {
    return (
      <Typography sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>Loading…</Typography>
    )
  }

  return (
    <Stack spacing={4}>
      {mode === 'both' || mode === 'requests' ? (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, color: 'primary.main' }}>
            Connection requests ({requests.length})
          </Typography>

          {requests.length === 0 ? (
            <Typography sx={{ opacity: 0.5 }}>No pending requests.</Typography>
          ) : (
            <Grid container spacing={2}>
              {requests.map((request) => (
                <Grid key={request.id} size={{ xs: 12, sm: 6 }}>
                  <Paper
                    sx={{
                      p: 2,
                      border: '1px solid rgba(0,229,255,0.3)',
                      background: 'rgba(0,229,255,0.02)',
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Avatar
                          sx={{
                            bgcolor: request.isOutgoing ? 'rgba(255,255,255,0.1)' : 'primary.main',
                            color: request.isOutgoing ? 'white' : 'background.default',
                            fontWeight: 900,
                          }}
                        >
                          {request.otherName?.[0] ?? '?'}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontWeight: 800 }} noWrap>
                              {request.otherName}
                            </Typography>
                            {request.isOutgoing ? (
                              <Chip
                                label="Sent"
                                size="small"
                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 900 }}
                              />
                            ) : null}
                          </Stack>
                          <Typography variant="caption" sx={{ opacity: 0.6 }} noWrap>
                            {request.otherTitle || 'User'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                        {request.isOutgoing ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={() => void cancelRequest(request.id)}
                            sx={{ opacity: 0.7 }}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => void respond(request.id, 'accept')}
                            >
                              Accept
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => void respond(request.id, 'reject')}
                            >
                              Decline
                            </Button>
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
      ) : null}

      {mode === 'both' || mode === 'friends' ? (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Your connections ({friends.length})
          </Typography>

          {friends.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.12)' }}>
              <Typography sx={{ opacity: 0.6, mb: 2 }}>
                You have not connected with anyone yet.
              </Typography>
              <Button variant="outlined" component={RouterLink} to="/">
                Find people
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {friends.map((friend) => (
                <Grid key={friend.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white' }}>
                          {initials(friend.firstName, friend.lastName)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontWeight: 800 }} noWrap>
                              {fullName(friend.firstName, friend.lastName)}
                            </Typography>
                            {friend.isBlocked ? (
                              <Chip
                                label="Blocked"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ height: 18, fontSize: '0.6rem' }}
                              />
                            ) : null}
                          </Stack>
                          <Typography variant="caption" sx={{ opacity: 0.6 }} noWrap>
                            {friend.professionalTitle || friend.companyName || 'Professional'}
                          </Typography>
                        </Box>
                      </Stack>

                      <IconButton
                        size="small"
                        onClick={(event) => openMenu(event, friend)}
                        aria-label="Connection options"
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      ) : null}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255,255,255,0.08)',
              minWidth: 190,
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setViewingProfileOf(selected?.id ?? null)
            closeMenu()
          }}
        >
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          View profile
        </MenuItem>

        <MenuItem component={RouterLink} to={`/messages?userId=${selected?.id ?? ''}`} onClick={closeMenu}>
          <ListItemIcon>
            <ChatIcon fontSize="small" />
          </ListItemIcon>
          Message
        </MenuItem>

        <Divider sx={{ opacity: 0.1 }} />

        <MenuItem onClick={() => void toggleBlock()}>
          <ListItemIcon>
            <BlockIcon fontSize="small" />
          </ListItemIcon>
          {selected?.isBlocked ? 'Unblock user' : 'Block user'}
        </MenuItem>

        <MenuItem onClick={() => void removeFriend()} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Remove connection
        </MenuItem>
      </Menu>

      <ProfileDialog userId={viewingProfileOf} onClose={() => setViewingProfileOf(null)} />
    </Stack>
  )
}
