import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

type JobPosting = {
  id: number
  title: string
  company: string
}

export default function Apply() {
  const { id } = useParams()
  const jobId = Number(id)
  const nav = useNavigate()
  const { user } = useAuth()

  const [job, setJob] = useState<JobPosting | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/jobs/${jobId}`)
        setJob(res.data)
      } catch {
        setJob(null)
      }
    }
    if (Number.isFinite(jobId)) void load()
  }, [jobId])

  const submit = async () => {
    setError('')
    setOk('')

    if (!Number.isFinite(jobId)) {
      setError('Invalid job id.')
      return
    }
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/applications', {
        jobId,
        applicantName: name,
        applicantEmail: email,
        message
      })
      setOk('Application sent.')
      setTimeout(() => nav('/employee'), 300)
    } catch (e: any) {
      const status = e?.response?.status
      const msg = e?.response?.data?.message || 'Application failed.'
      setError(`${msg}${status ? ` (HTTP ${status})` : ''}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, maxWidth: 720, width: '100%', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>Apply</Typography>
        <Typography sx={{ opacity: 0.85, mb: 2 }}>
          {job ? `${job.title} — ${job.company}` : `Job #${jobId}`}
        </Typography>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {ok ? <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert> : null}

        <Stack spacing={2}>
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            multiline
            minRows={4}
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="outlined" onClick={() => nav(-1)}>Back</Button>
            <Button variant="contained" disabled={submitting} onClick={() => void submit()}>
              {submitting ? 'Sending…' : 'Submit'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
