import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { formatSalary } from '../utils'
import NotFound from './NotFound'
import type { JobPosting } from '../types'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

export default function Apply() {
  const { id } = useParams()
  const jobId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showSuccess } = useToast()

  const [job, setJob] = useState<JobPosting | null>(null)
  const [loadingJob, setLoadingJob] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [applicantName, setApplicantName] = useState('')
  const [applicantEmail, setApplicantEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setApplicantName(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim())
    setApplicantEmail(user?.email ?? '')
  }, [user])

  // The posting is loaded so the form can show what is being applied for, rather
  // than a bare form with no context.
  useEffect(() => {
    if (!Number.isFinite(jobId)) {
      setNotFound(true)
      setLoadingJob(false)
      return
    }

    let cancelled = false

    api
      .get<JobPosting>(`/jobs/${jobId}`)
      .then((response) => {
        if (!cancelled) setJob(response.data)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoadingJob(false)
      })

    return () => {
      cancelled = true
    }
  }, [jobId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await api.post('/application', { jobId, applicantName, applicantEmail, message })
      showSuccess('Application submitted.')
      navigate('/employee')
    } catch (err) {
      setError(errorMessage(err, 'Could not submit your application.'))
    } finally {
      setSaving(false)
    }
  }

  if (notFound) return <NotFound />

  if (loadingJob) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Paper sx={{ maxWidth: 700, mx: 'auto', p: { xs: 3, md: 4 }, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        Apply
      </Typography>

      {job ? (
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
            {job.title}
          </Typography>
          <Typography sx={{ opacity: 0.8, fontWeight: 700 }}>{job.company}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {job.location ? <Chip size="small" label={job.location} variant="outlined" /> : null}
            {job.jobType ? <Chip size="small" label={job.jobType} variant="outlined" /> : null}
            {job.salary ? (
              <Chip size="small" label={formatSalary(job.salary)} variant="outlined" />
            ) : null}
          </Stack>
        </Box>
      ) : null}

      <Divider sx={{ mb: 3, borderColor: 'rgba(255,255,255,0.08)' }} />

      <Box component="form" onSubmit={submit}>
        <Stack spacing={2.5}>
          <TextField
            label="Full name"
            value={applicantName}
            onChange={(event) => setApplicantName(event.target.value)}
            required
            fullWidth
            autoComplete="name"
          />
          <TextField
            label="Email"
            type="email"
            value={applicantEmail}
            onChange={(event) => setApplicantEmail(event.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Cover message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            multiline
            minRows={6}
            fullWidth
            helperText="Tell them why you are a good fit. Your CV is attached automatically from your profile."
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !applicantName.trim() || !applicantEmail.trim()}
              sx={{ fontWeight: 800, px: 3 }}
            >
              {saving ? 'Submitting…' : 'Submit application'}
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="text" component={RouterLink} to="/employee" sx={{ opacity: 0.7 }}>
              My applications
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  )
}
