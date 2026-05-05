import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonIcon from '@mui/icons-material/Person'
import BlockIcon from '@mui/icons-material/Block'
import FlagIcon from '@mui/icons-material/Flag'
import Avatar from '@mui/material/Avatar'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'

type InboxItem = {
  otherUserId: string
  otherUserName?: string
  id: number
  subject: string
  content: string
  sentAt: string
  unreadCount: number
  iBlockedThem: boolean
  theyBlockedMe: boolean
}

type ThreadItem = {
  id: number
  senderUserId: string
  receiverUserId: string
  senderUserName?: string
  receiverUserName?: string
  subject: string
  content: string
  sentAt: string
  isRead: boolean
}

const getDayLabel = (date: Date) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'

  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' })
  }

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

const format24h = (date: Date) => {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function Messages() {
  const [params] = useSearchParams()
  const initialUserId = params.get('user') || params.get('userId') || ''

  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [selectedOtherId, setSelectedOtherId] = useState(initialUserId)
  const [thread, setThread] = useState<ThreadItem[]>([])
  const [iBlockedThem, setIBlockedThem] = useState(false)
  const [theyBlockedMe, setTheyBlockedMe] = useState(false)
  const [selectedOtherProfile, setSelectedOtherProfile] = useState<any | null>(null)
  const [openProfile, setOpenProfile] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [error, setError] = useState('')
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [sending, setSending] = useState(false)

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [menuUserId, setMenuUserId] = useState<string | null>(null)

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, userId: string) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setMenuUserId(userId)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setMenuUserId(null)
  }

  const handleDeleteChat = async () => {
    if (!menuUserId) return
    if (!window.confirm('Are you sure you want to delete this conversation? This cannot be undone.')) return
    
    try {
      await api.delete(`/messages/conversation/${menuUserId}`)
      setInbox(prev => prev.filter(item => item.otherUserId !== menuUserId))
      if (selectedOtherId === menuUserId) {
        setSelectedOtherId('')
        setThread([])
      }
    } catch (e) {
      console.error('Failed to delete chat:', e)
      alert('Failed to delete conversation.')
    } finally {
      handleMenuClose()
    }
  }

  const viewProfile = async () => {
    if (!menuUserId) return
    const id = menuUserId
    handleMenuClose()
    try {
      const res = await api.get(`/profiles/${id}`)
      setSelectedOtherProfile(res.data)
      setOpenProfile(true)
    } catch (e) {
      console.error('Failed to load profile:', e)
      alert('Could not load user profile.')
    }
  }

  const blockUser = async () => {
    if (!menuUserId) return
    const targetUser = inbox.find(i => i.otherUserId === menuUserId)
    const isBlocked = targetUser?.iBlockedThem ?? iBlockedThem
    
    if (!isBlocked && !window.confirm('Block this user? You will no longer receive messages from them.')) return
    
    try {
      if (isBlocked) {
        await api.delete(`/messages/block/${menuUserId}`)
      } else {
        await api.post(`/messages/block/${menuUserId}`)
      }
      
      if (selectedOtherId === menuUserId) {
        setIBlockedThem(!isBlocked)
      }
      await loadInbox(true)
      alert(isBlocked ? 'User unblocked.' : 'User blocked.')
    } catch {
      alert('Action failed.')
    } finally {
      handleMenuClose()
    }
  }

  const reportUser = async () => {
    if (!menuUserId) return
    const reason = window.prompt('Reason for reporting this user:')
    if (!reason) return
    handleMenuClose()
    alert('Report submitted to admin.')
  }

  const selectedConversation = useMemo(
    () => inbox.find((x) => x.otherUserId === selectedOtherId) ?? null,
    [inbox, selectedOtherId]
  )

  const loadInbox = async (silent = false) => {
    if (!silent) setLoadingInbox(true)
    try {
      const res = await api.get('/messages/inbox')
      const raw = Array.isArray(res.data) ? res.data : []

      setInbox(
        raw.map((item: any) => ({
          otherUserId: String(item?.otherUserId ?? ''),
          otherUserName: item?.otherUserName ? String(item.otherUserName) : undefined,
          id: Number(item?.lastMessageId ?? 0),
          subject: String(item?.lastMessageSubject ?? ''),
          content: String(item?.lastMessageContent ?? ''),
          sentAt: String(item?.lastMessageSentAt ?? ''),
          unreadCount: Number(item?.unreadCount ?? 0),
          iBlockedThem: !!item?.iBlockedThem,
          theyBlockedMe: !!item?.theyBlockedMe
        }))
      )
    } catch (e) {
      console.error('Inbox load failed:', e)
      if (!silent) setError('Failed to load inbox.')
    } finally {
      if (!silent) setLoadingInbox(false)
    }
  }

  const loadThread = async (otherUserId: string, silent = false) => {
    if (!otherUserId) {
      setThread([])
      return
    }

    if (!silent) setLoadingThread(true)
    try {
      const res = await api.get(`/messages/thread/${otherUserId}`)
      const data = res.data
      const rawMessages = Array.isArray(data?.messages) ? data.messages : []

      setThread(
        rawMessages.map((msg: any) => ({
          id: Number(msg?.id ?? 0),
          senderUserId: String(msg?.senderUserId ?? ''),
          receiverUserId: String(msg?.receiverUserId ?? ''),
          senderUserName: msg?.senderUserName ? String(msg.senderUserName) : undefined,
          receiverUserName: msg?.receiverUserName ? String(msg.receiverUserName) : undefined,
          subject: String(msg?.subject ?? ''),
          content: String(msg?.content ?? ''),
          sentAt: String(msg?.sentAt ?? ''),
          isRead: Boolean(msg?.isRead),
        }))
      )
      setIBlockedThem(!!data?.iBlockedThem)
      setTheyBlockedMe(!!data?.theyBlockedMe)
    } catch (e) {
      console.error('Thread load failed:', e)
      if (!silent) {
        setThread([])
        setError('Failed to load thread.')
      }
    } finally {
      if (!silent) setLoadingThread(false)
    }
  }

  // Initial loads
  useEffect(() => {
    void loadInbox()
  }, [])

  useEffect(() => {
    if (selectedOtherId) {
      void loadThread(selectedOtherId)
    }
  }, [selectedOtherId])

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      void loadInbox(true)
      if (selectedOtherId) {
        void loadThread(selectedOtherId, true)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [selectedOtherId])

  const sendMessage = async () => {
    if (!selectedOtherId) return
    if (!draftContent.trim()) return

    setSending(true)
    setError('')

    try {
      await api.post('/messages', {
        receiverUserId: selectedOtherId,
        subject: 'Chat Message', // Providing a default subject just in case backend requires it
        content: draftContent.trim(),
      })

      setDraftContent('')

      await loadThread(selectedOtherId, true)
      await loadInbox(true)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const threadWithDividers = useMemo(() => {
    const items: (ThreadItem | { type: 'divider'; label: string })[] = []
    let lastDateLabel = ''

    for (const msg of thread) {
      const date = new Date(msg.sentAt)
      const label = getDayLabel(date)
      if (label !== lastDateLabel) {
        items.push({ type: 'divider', label })
        lastDateLabel = label
      }
      items.push(msg)
    }

    return items
  }, [thread])

  return (
    <Box>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <Paper sx={{ width: { xs: '100%', md: 320 }, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Inbox</Typography>
            <Typography sx={{ opacity: 0.75, fontSize: '0.85rem' }}>{inbox.length} conversation(s)</Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

          {loadingInbox && inbox.length === 0 ? (
            <Box sx={{ p: 2 }}>Loading…</Box>
          ) : inbox.length === 0 ? (
            <Box sx={{ p: 2 }}>No messages yet.</Box>
          ) : (
            <Box sx={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {inbox.map((item) => (
                <Box
                  key={item.otherUserId}
                  onClick={() => setSelectedOtherId(item.otherUserId)}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    borderLeft: selectedOtherId === item.otherUserId ? '4px solid' : '4px solid transparent',
                    borderColor: selectedOtherId === item.otherUserId ? 'primary.main' : 'transparent',
                    backgroundColor: selectedOtherId === item.otherUserId ? 'rgba(255,255,255,0.05)' : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        {item.otherUserName || `User ${item.otherUserId}`}
                      </Typography>
                      <Typography noWrap sx={{ opacity: 0.7, mt: 0.5, fontSize: '0.85rem' }}>
                        {item.content}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, item.otherUserId)}
                      sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography sx={{ opacity: 0.5, fontSize: '0.75rem' }}>
                      {getDayLabel(new Date(item.sentAt))}
                    </Typography>
                    {item.unreadCount > 0 ? (
                      <Box sx={{ 
                        backgroundColor: 'primary.main', 
                        color: 'background.default', 
                        px: 1, 
                        borderRadius: 1,
                        fontSize: '0.75rem',
                        fontWeight: 900
                      }}>
                        {item.unreadCount}
                      </Box>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Paper sx={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selectedOtherId ? (selectedConversation?.otherUserName || `User ${selectedOtherId}`) : 'Select a conversation'}
              </Typography>
              <Typography sx={{ opacity: 0.6, fontSize: '0.85rem' }}>
                {selectedOtherId ? 'Active Conversation' : 'Pick a conversation to start chatting'}
              </Typography>
            </Box>
            
            {selectedOtherId && (
              <IconButton onClick={(e) => handleMenuOpen(e, selectedOtherId)}>
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>

          <Box sx={{ p: 2, minHeight: 450, maxHeight: 600, overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.15)' }}>
            {!selectedOtherId ? (
              <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ opacity: 0.4 }}>Select a user on the left to view messages</Typography>
              </Box>
            ) : (
              <>
                {(iBlockedThem || theyBlockedMe) && (
                  <Alert severity="warning" sx={{ mb: 2, fontWeight: 700 }}>
                    {iBlockedThem ? 'You have blocked this user.' : 'This user has blocked you.'} Messaging is disabled.
                  </Alert>
                )}
                {loadingThread && thread.length === 0 ? (
                  <Typography sx={{ opacity: 0.5, textAlign: 'center' }}>Loading messages…</Typography>
                ) : thread.length === 0 ? (
                  <Typography sx={{ opacity: 0.5, textAlign: 'center' }}>No messages in this thread yet.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {threadWithDividers.map((item, idx) => {
                  if ('type' in item && item.type === 'divider') {
                    return (
                      <Box key={`divider-${idx}`} sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                        <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                        <Typography sx={{ mx: 2, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          {item.label}
                        </Typography>
                        <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                      </Box>
                    )
                  }

                  const msg = item as ThreadItem
                  const isMine = msg.receiverUserId === selectedOtherId

                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Paper
                        sx={{
                          p: '10px 14px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: isMine ? 'primary.dark' : 'background.paper',
                          color: 'white',
                          maxWidth: '75%',
                          position: 'relative',
                          borderRadius: isMine ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        }}
                      >
                        <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.4 }}>
                          {msg.content}
                        </Typography>
                        
                        <Typography 
                          sx={{ 
                            fontSize: '0.65rem', 
                            opacity: 0.5, 
                            mt: 0.5,
                            textAlign: isMine ? 'left' : 'right',
                            display: 'block',
                            fontWeight: 600
                          }}
                        >
                          {format24h(new Date(msg.sentAt))}
                        </Typography>
                      </Paper>
                    </Box>
                  )
                })}
              </Stack>
            )}
          </>
        )}
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                fullWidth
                placeholder={(iBlockedThem || theyBlockedMe) ? "Messaging disabled" : "Write a message..."}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                multiline
                maxRows={6}
                disabled={!selectedOtherId || sending || iBlockedThem || theyBlockedMe}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendMessage()
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.03)'
                  }
                }}
              />
              <Button
                variant="contained"
                disabled={!selectedOtherId || !draftContent.trim() || sending || iBlockedThem || theyBlockedMe}
                onClick={() => void sendMessage()}
                sx={{ 
                  borderRadius: 3, 
                  height: 48, 
                  px: 3,
                  fontWeight: 900
                }}
              >
                {sending ? '...' : 'Send'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>

      {/* Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            border: '1px solid rgba(255,255,255,0.08)',
            minWidth: 160,
          }
        }}
      >
        <MenuItem onClick={viewProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          View Profile
        </MenuItem>
        <Divider sx={{ opacity: 0.1 }} />
        <MenuItem onClick={blockUser}>
          <ListItemIcon>
            <BlockIcon fontSize="small" />
          </ListItemIcon>
          {inbox.find(i => i.otherUserId === menuUserId)?.iBlockedThem ? 'Unblock User' : 'Block User'}
        </MenuItem>
        <MenuItem onClick={reportUser}>
          <ListItemIcon>
            <FlagIcon fontSize="small" />
          </ListItemIcon>
          Report User
        </MenuItem>
        <Divider sx={{ opacity: 0.1 }} />
        <MenuItem onClick={handleDeleteChat} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete Chat
        </MenuItem>
      </Menu>

      <Dialog open={openProfile} onClose={() => setOpenProfile(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>User Profile</DialogTitle>
        <DialogContent dividers>
          {selectedOtherProfile ? (
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <Avatar 
                  src={selectedOtherProfile.avatarUrl} 
                  sx={{ width: 80, height: 80, fontSize: '2rem', fontWeight: 900, backgroundColor: 'primary.main', color: 'background.default' }}
                >
                  {selectedOtherProfile.firstName?.[0]}{selectedOtherProfile.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{selectedOtherProfile.firstName} {selectedOtherProfile.lastName}</Typography>
                  <Typography sx={{ opacity: 0.7 }}>{selectedOtherProfile.professionalTitle || (selectedOtherProfile.companyName ? selectedOtherProfile.companyName : 'Professional')}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.5 }}>{selectedOtherProfile.city}, {selectedOtherProfile.country}</Typography>
                </Box>
              </Stack>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>About</Typography>
              <Typography sx={{ opacity: 0.8, lineHeight: 1.7 }}>{selectedOtherProfile.bio || 'No bio provided.'}</Typography>
              
              {selectedOtherProfile.companyName && (
                <>
                  <Divider sx={{ my: 2, opacity: 0.1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>Company Info</Typography>
                  <Typography sx={{ opacity: 0.8 }}>{selectedOtherProfile.companyName}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.6 }}>{selectedOtherProfile.industry} • {selectedOtherProfile.companySize}</Typography>
                </>
              )}
            </Box>
          ) : <Typography>Loading profile...</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProfile(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
