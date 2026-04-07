import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

type InboxItem = {
  otherUserId: string
  otherEmail: string
  lastSubject: string
  lastMessage: string
  lastAt: string
}

type ThreadMessage = {
  id: number
  senderUserId: string
  receiverUserId: string
  subject: string
  content: string
  isRead: boolean
  sentAt: string
  jobApplicationId?: number | null
}

export default function Messages() {
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [loadingInbox, setLoadingInbox] = useState(true)

  const [selectedOtherId, setSelectedOtherId] = useState<string | null>(null)
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)

  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(
    () => inbox.find(i => i.otherUserId === selectedOtherId) ?? null,
    [inbox, selectedOtherId]
  )

  const loadInbox = async () => {
    setLoadingInbox(true)
    setError('')
    try {
      const res = await api.get('/messages/inbox')
      setInbox(res.data)
      if (!selectedOtherId && res.data.length > 0) {
        setSelectedOtherId(res.data[0].otherUserId)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load inbox.')
    } finally {
      setLoadingInbox(false)
    }
  }

  const loadThread = async (otherId: string) => {
    setLoadingThread(true)
    setError('')
    try {
      const res = await api.get(`/messages/thread/${otherId}`)
      setThread(res.data)
      const last = res.data?.[res.data.length - 1]
      if (last?.subject) setSubject(last.subject)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load thread.')
    } finally {
      setLoadingThread(false)
    }
  }

  useEffect(() => {
    void loadInbox()
  }, [])

  useEffect(() => {
    if (selectedOtherId) void loadThread(selectedOtherId)
  }, [selectedOtherId])

  const send = async () => {
    if (!selectedOtherId) return
    if (!content.trim()) {
      setError('Message content is required.')
      return
    }

    setSending(true)
    setError('')
    try {
      await api.post('/messages/send', {
        receiverUserId: selectedOtherId,
        subject: subject.trim(),
        content: content.trim(),
        jobApplicationId: null
      })
      setContent('')
      await loadThread(selectedOtherId)
      await loadInbox()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to send.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>Messages</Typography>
        <Button variant="outlined" onClick={() => void loadInbox()}>Refresh</Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>Inbox</Typography>
              <Typography sx={{ opacity: 0.75, mt: 0.5 }}>
                {loadingInbox ? 'Loading…' : `${inbox.length} conversation(s)`}
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            {loadingInbox ? (
              <Box sx={{ p: 2 }}>Loading…</Box>
            ) : inbox.length === 0 ? (
              <Box sx={{ p: 2, opacity: 0.85 }}>No messages yet.</Box>
            ) : (
              <Box>
                {inbox.map((i) => {
                  const active = i.otherUserId === selectedOtherId
                  return (
                    <Box
                      key={i.otherUserId}
                      onClick={() => setSelectedOtherId(i.otherUserId)}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        background: active ? 'rgba(0,240,255,0.08)' : 'transparent',
                        borderTop: '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <Typography sx={{ fontWeight: 900 }}>{i.otherEmail}</Typography>
                      <Typography sx={{ opacity: 0.8, fontSize: 13 }}>
                        {i.lastSubject ? i.lastSubject : 'No subject'}
                      </Typography>
                      <Typography sx={{ opacity: 0.7, mt: 0.5, fontSize: 13 }}>
                        {i.lastMessage?.length > 80 ? i.lastMessage.slice(0, 80) + '…' : i.lastMessage}
                      </Typography>
                      <Typography sx={{ opacity: 0.55, mt: 0.5, fontSize: 12 }}>
                        {new Date(i.lastAt).toLocaleString()}
                      </Typography>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 900 }}>
                {selected ? selected.otherEmail : 'Select a conversation'}
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            <Box sx={{ p: 2, height: { xs: 'auto', md: 420 }, overflowY: { md: 'auto' } }}>
              {!selectedOtherId ? (
                <Box sx={{ opacity: 0.85 }}>Pick a conversation from the left.</Box>
              ) : loadingThread ? (
                <Box>Loading…</Box>
              ) : thread.length === 0 ? (
                <Box sx={{ opacity: 0.85 }}>No messages in this conversation yet.</Box>
              ) : (
                <Stack spacing={1.25}>
                  {thread.map((m) => (
                    <Paper
                      key={m.id}
                      sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontWeight: 900 }}>{m.subject ? m.subject : 'No subject'}</Typography>
                        <Typography sx={{ opacity: 0.6, fontSize: 12 }}>
                          {new Date(m.sentAt).toLocaleString()}
                        </Typography>
                      </Stack>
                      <Typography sx={{ opacity: 0.9, whiteSpace: 'pre-wrap', mt: 0.5 }}>
                        {m.content}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            <Box sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <TextField
                  label="Subject (optional)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={!selectedOtherId}
                />
                <TextField
                  label="Message"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  multiline
                  minRows={3}
                  disabled={!selectedOtherId}
                />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" disabled={!selectedOtherId} onClick={() => setContent('')}>
                    Clear
                  </Button>
                  <Button variant="contained" disabled={!selectedOtherId || sending} onClick={() => void send()}>
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
