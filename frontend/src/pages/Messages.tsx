import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { useConfirm } from '../confirm'
import ProfileDialog from '../components/ProfileDialog'
import type { Conversation, ThreadMessage } from '../types'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import BlockIcon from '@mui/icons-material/Block'
import DeleteIcon from '@mui/icons-material/Delete'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PersonIcon from '@mui/icons-material/Person'

/** How often the open thread is refreshed. */
const POLL_INTERVAL_MS = 15_000

const dayLabel = (date: Date) => {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' })

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}

const timeLabel = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })

export default function Messages() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [inbox, setInbox] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState(params.get('userId') ?? '')
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [iBlockedThem, setIBlockedThem] = useState(false)
  const [theyBlockedMe, setTheyBlockedMe] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [sending, setSending] = useState(false)

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [menuUserId, setMenuUserId] = useState<string | null>(null)
  const [viewingProfileOf, setViewingProfileOf] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)

  const loadInbox = useCallback(async (silent = false) => {
    if (!silent) setLoadingInbox(true)

    try {
      const response = await api.get<Conversation[]>('/messages/inbox')
      setInbox(response.data)
    } catch (err) {
      if (!silent) setError(errorMessage(err, 'Could not load your inbox.'))
    } finally {
      if (!silent) setLoadingInbox(false)
    }
  }, [])

  const loadThread = useCallback(async (otherUserId: string) => {
    if (!otherUserId) {
      setThread([])
      return
    }

    try {
      const response = await api.get<{
        messages: ThreadMessage[]
        iBlockedThem: boolean
        theyBlockedMe: boolean
      }>(`/messages/thread/${otherUserId}`)

      setThread(response.data.messages)
      setIBlockedThem(response.data.iBlockedThem)
      setTheyBlockedMe(response.data.theyBlockedMe)
    } catch (err) {
      setError(errorMessage(err, 'Could not load this conversation.'))
    }
  }, [])

  useEffect(() => {
    void loadInbox()
  }, [loadInbox])

  useEffect(() => {
    if (selectedId) void loadThread(selectedId)
  }, [selectedId, loadThread])

  /**
   * Polling replaces a real-time connection. It runs every 15 seconds rather than
   * every 4, which was refetching the entire inbox and thread fifteen times a minute
   * per open tab, and it pauses while the tab is hidden.
   */
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return
      void loadInbox(true)
      if (selectedId) void loadThread(selectedId)
    }

    const interval = window.setInterval(tick, POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [selectedId, loadInbox, loadThread])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const selectedConversation = useMemo(
    () => inbox.find((conversation) => conversation.otherUserId === selectedId) ?? null,
    [inbox, selectedId]
  )

  const closeMenu = () => {
    setAnchorEl(null)
    setMenuUserId(null)
  }

  const openMenu = (event: MouseEvent<HTMLElement>, userId: string) => {
    event.stopPropagation()
    setAnchorEl(event.currentTarget)
    setMenuUserId(userId)
  }

  const sendMessage = async () => {
    if (!selectedId || !draft.trim()) return

    setSending(true)
    setError('')

    try {
      await api.post('/messages', { receiverUserId: selectedId, content: draft.trim() })
      setDraft('')
      await loadThread(selectedId)
      await loadInbox(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not send your message.'))
    } finally {
      setSending(false)
    }
  }

  const viewProfile = () => {
    setViewingProfileOf(menuUserId)
    closeMenu()
  }

  const toggleBlock = async () => {
    if (!menuUserId) return
    const id = menuUserId
    const conversation = inbox.find((item) => item.otherUserId === id)
    const blocked = conversation?.iBlockedThem ?? iBlockedThem
    closeMenu()

    if (!blocked) {
      const confirmed = await confirm({
        title: 'Block this user?',
        description: 'You will no longer receive messages from them.',
        confirmLabel: 'Block',
        destructive: true,
      })

      if (!confirmed) return
    }

    try {
      if (blocked) {
        await api.delete(`/messages/block/${id}`)
        showSuccess('User unblocked.')
      } else {
        await api.post(`/messages/block/${id}`)
        showSuccess('User blocked.')
      }

      if (selectedId === id) setIBlockedThem(!blocked)
      await loadInbox(true)
    } catch (err) {
      showError(errorMessage(err, 'Could not update the block list.'))
    }
  }

  const deleteConversation = async () => {
    if (!menuUserId) return
    const id = menuUserId
    closeMenu()

    const confirmed = await confirm({
      title: 'Delete this conversation?',
      description:
        'It will be removed from your inbox. The other person keeps their own copy of the messages.',
      confirmLabel: 'Delete',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/messages/conversation/${id}`)
      setInbox((previous) => previous.filter((item) => item.otherUserId !== id))

      if (selectedId === id) {
        setSelectedId('')
        setThread([])
      }

      showSuccess('Conversation deleted.')
    } catch (err) {
      showError(errorMessage(err, 'Could not delete this conversation.'))
    }
  }

  // Insert a date separator whenever the day changes.
  const threadWithSeparators = useMemo(() => {
    const entries: ({ kind: 'divider'; label: string } | { kind: 'message'; message: ThreadMessage })[] = []
    let lastLabel = ''

    for (const message of thread) {
      const label = dayLabel(new Date(message.sentAt))
      if (label !== lastLabel) {
        entries.push({ kind: 'divider', label })
        lastLabel = label
      }
      entries.push({ kind: 'message', message })
    }

    return entries
  }, [thread])

  const messagingDisabled = iBlockedThem || theyBlockedMe

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <Paper
          sx={{
            width: { xs: '100%', md: 320 },
            flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Inbox
            </Typography>
            <Typography sx={{ opacity: 0.6, fontSize: '0.85rem' }}>
              {inbox.length} conversation{inbox.length === 1 ? '' : 's'}
            </Typography>
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

          {loadingInbox && inbox.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', opacity: 0.6 }}>Loading…</Box>
          ) : inbox.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', opacity: 0.6 }}>
              No messages yet. Start one from someone's profile.
            </Box>
          ) : (
            <Box sx={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
              {inbox.map((conversation) => (
                <Box
                  key={conversation.otherUserId}
                  onClick={() => setSelectedId(conversation.otherUserId)}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    borderLeft: '4px solid',
                    borderLeftColor:
                      selectedId === conversation.otherUserId ? 'primary.main' : 'transparent',
                    backgroundColor:
                      selectedId === conversation.otherUserId
                        ? 'rgba(255,255,255,0.05)'
                        : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                    transition: 'all 0.2s',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Stack direction="row" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.08)' }}>
                        {conversation.otherUserName?.[0]?.toUpperCase() ?? '?'}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 800 }} noWrap>
                          {conversation.otherUserName}
                        </Typography>
                        <Typography noWrap sx={{ opacity: 0.7, fontSize: '0.85rem' }}>
                          {conversation.lastMessageContent}
                        </Typography>
                      </Box>
                    </Stack>

                    <IconButton
                      size="small"
                      onClick={(event) => openMenu(event, conversation.otherUserId)}
                      aria-label="Conversation options"
                      sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mt: 0.5, pl: 6 }}
                  >
                    <Typography sx={{ opacity: 0.5, fontSize: '0.75rem' }}>
                      {dayLabel(new Date(conversation.lastMessageSentAt))}
                    </Typography>
                    {conversation.unreadCount > 0 ? (
                      <Box
                        sx={{
                          backgroundColor: 'primary.main',
                          color: 'background.default',
                          px: 1,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 900,
                        }}
                      >
                        {conversation.unreadCount}
                      </Box>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Paper
          sx={{
            flex: 1,
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }} noWrap>
                {selectedId
                  ? (selectedConversation?.otherUserName ?? 'Conversation')
                  : 'Select a conversation'}
              </Typography>
              <Typography sx={{ opacity: 0.6, fontSize: '0.85rem' }} noWrap>
                {selectedConversation?.otherUserTitle ||
                  selectedConversation?.otherUserCompany ||
                  (selectedId ? '' : 'Pick a conversation on the left to start chatting')}
              </Typography>
            </Box>

            {selectedId ? (
              <IconButton onClick={(event) => openMenu(event, selectedId)} aria-label="Conversation options">
                <MoreVertIcon />
              </IconButton>
            ) : null}
          </Box>

          <Box
            sx={{
              p: 2,
              minHeight: 450,
              maxHeight: 600,
              overflowY: 'auto',
              backgroundColor: 'rgba(0,0,0,0.15)',
            }}
          >
            {!selectedId ? (
              <Box
                sx={{
                  height: '100%',
                  minHeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ opacity: 0.4 }}>No conversation selected</Typography>
              </Box>
            ) : (
              <>
                {messagingDisabled ? (
                  <Alert severity="warning" sx={{ mb: 2, fontWeight: 700 }}>
                    {iBlockedThem
                      ? 'You have blocked this user.'
                      : 'This user has blocked you.'}{' '}
                    Messaging is disabled.
                  </Alert>
                ) : null}

                {thread.length === 0 ? (
                  <Typography sx={{ opacity: 0.5, textAlign: 'center', py: 6 }}>
                    No messages yet. Say hello.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {threadWithSeparators.map((entry, index) => {
                      if (entry.kind === 'divider') {
                        return (
                          <Box
                            key={`divider-${entry.label}-${index}`}
                            sx={{ display: 'flex', alignItems: 'center', my: 2 }}
                          >
                            <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                            <Typography
                              sx={{
                                mx: 2,
                                fontSize: '0.7rem',
                                color: 'rgba(255,255,255,0.4)',
                                fontWeight: 600,
                                letterSpacing: 0.5,
                                textTransform: 'uppercase',
                              }}
                            >
                              {entry.label}
                            </Typography>
                            <Box sx={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />
                          </Box>
                        )
                      }

                      const message = entry.message
                      const mine = message.senderUserId === user?.id

                      return (
                        <Box
                          key={message.id}
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: mine ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Paper
                            sx={{
                              p: '10px 14px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              backgroundColor: mine ? 'primary.dark' : 'background.paper',
                              maxWidth: '75%',
                              borderRadius: mine ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            }}
                          >
                            <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.4 }}>
                              {message.content}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: '0.65rem',
                                opacity: 0.5,
                                mt: 0.5,
                                textAlign: 'right',
                                fontWeight: 600,
                              }}
                            >
                              {timeLabel(new Date(message.sentAt))}
                            </Typography>
                          </Paper>
                        </Box>
                      )
                    })}
                    <div ref={bottomRef} />
                  </Stack>
                )}
              </>
            )}
          </Box>

          <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                fullWidth
                placeholder={messagingDisabled ? 'Messaging is disabled' : 'Write a message…'}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                multiline
                maxRows={6}
                disabled={!selectedId || sending || messagingDisabled}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage()
                  }
                }}
                slotProps={{ htmlInput: { 'aria-label': 'Message' } }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  },
                }}
              />
              <Button
                variant="contained"
                disabled={!selectedId || !draft.trim() || sending || messagingDisabled}
                onClick={() => void sendMessage()}
                sx={{ borderRadius: 3, height: 48, px: 3, fontWeight: 900 }}
              >
                {sending ? '…' : 'Send'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'background.paper',
              border: '1px solid rgba(255,255,255,0.08)',
              minWidth: 180,
            },
          },
        }}
      >
        <MenuItem onClick={viewProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          View profile
        </MenuItem>

        <Divider sx={{ opacity: 0.1 }} />

        <MenuItem onClick={() => void toggleBlock()}>
          <ListItemIcon>
            <BlockIcon fontSize="small" />
          </ListItemIcon>
          {inbox.find((item) => item.otherUserId === menuUserId)?.iBlockedThem
            ? 'Unblock user'
            : 'Block user'}
        </MenuItem>

        <MenuItem onClick={() => void deleteConversation()} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          Delete conversation
        </MenuItem>
      </Menu>

      <ProfileDialog userId={viewingProfileOf} onClose={() => setViewingProfileOf(null)} />
    </Box>
  )
}
