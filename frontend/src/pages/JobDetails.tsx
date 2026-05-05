import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { formatSalary } from '../utils'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BoltIcon from '@mui/icons-material/Bolt'

type JobPosting = {
  id: number
  title: string
  company: string
  companyDescription?: string
  description: string
  location: string
  salary: string
  jobType: string
  tags: string[]
}

export default function JobDetails() {
  const { id } = useParams()
  const jobId = Number(id)
  const nav = useNavigate()
  const { user } = useAuth()

  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [saved, setSaved] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; text: string; type: 'success' | 'info' | 'error' }>({
    open: false,
    text: '',
    type: 'success'
  })

  const isEmployee = !!user?.roles?.includes('Employee')

  const facts = useMemo(() => {
    if (!job) return []
    const items: { label: string; value: string }[] = []
    if (job.location) items.push({ label: 'Location', value: job.location })
    if (job.salary) items.push({ label: 'Salary', value: formatSalary(job.salary) })
    if (job.jobType) items.push({ label: 'Job Type', value: job.jobType })
    return items
  }, [job])

  const loadSaved = async (id: number) => {
    if (!isEmployee) {
      setSaved(false)
      return
    }
    try {
      const res = await api.get('/savedjobs/mine')
      const ids = new Set<number>(res.data.map((x: any) => x.jobPostingId))
      setSaved(ids.has(id))
    } catch {
      setSaved(false)
    }
  }

  const toggleSave = async () => {
    if (!job) return
    if (!isEmployee) {
      setSnack({ open: true, text: 'Only Employee accounts can save jobs.', type: 'info' })
      return
    }

    try {
      if (saved) {
        await api.delete(`/savedjobs/${job.id}`)
        setSaved(false)
        setSnack({ open: true, text: 'Removed from saved jobs', type: 'info' })
      } else {
        await api.post('/savedjobs', { jobId: job.id })
        setSaved(true)
        setSnack({ open: true, text: 'Saved job', type: 'success' })
      }
    } catch {
      setSnack({ open: true, text: 'Action failed', type: 'error' })
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!Number.isFinite(jobId)) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setLoading(true)
      setNotFound(false)

      try {
        const res = await api.get(`/jobs/${jobId}`)
        setJob(res.data)
        await loadSaved(res.data.id)
      } catch (e: any) {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [jobId, isEmployee])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (notFound || !job) {
    return (
      <Alert severity="error">
        Job not found. <Button onClick={() => nav('/')}>Back to Home</Button>
      </Alert>
    )
  }

  return (
    <Box>
      <Grid container spacing={2.5}>
        {/* LEFT: Main content */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
              {job.title}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ opacity: 0.9, fontWeight: 700 }}>{job.company}</Typography>
              {job.location ? <Chip size="small" label={job.location} variant="outlined" /> : null}
              {job.jobType ? <Chip size="small" label={job.jobType} variant="outlined" color="primary" /> : null}
              {job.salary ? <Chip size="small" label={formatSalary(job.salary)} variant="outlined" /> : null}
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
              {(job.tags || []).map(tag => (
                <Chip key={tag} label={tag} size="small" sx={{ fontWeight: 800 }} />
              ))}
            </Stack>

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, display: 'flex', alignItems: 'center' }}>
              <BoltIcon sx={{ mr: 1, color: 'primary.main' }} /> About the role
            </Typography>

            <Typography sx={{ opacity: 0.9, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {job.description}
            </Typography>

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="outlined" onClick={() => nav(-1)}>
                Back
              </Button>

              <Button variant="outlined" component={RouterLink} to="/">
                Browse more
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* RIGHT: Sticky sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
            <Paper sx={{ p: 2.5, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                Quick facts
              </Typography>

              <Stack spacing={1.25}>
                {facts.length === 0 ? (
                  <Typography sx={{ opacity: 0.8 }}>No additional details provided.</Typography>
                ) : (
                  facts.map((f) => (
                    <Box key={f.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography sx={{ opacity: 0.75 }}>{f.label}</Typography>
                      <Typography sx={{ fontWeight: 800 }}>{f.value}</Typography>
                    </Box>
                  ))
                )}
              </Stack>

              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

              <Stack spacing={1}>
                {user ? (
                  <Button
                    variant="contained"
                    disabled={!isEmployee}
                    onClick={() => nav(`/apply/${job.id}`)}
                    fullWidth
                    sx={{ fontWeight: 900, py: 1.2 }}
                  >
                    Apply Now
                  </Button>
                ) : (
                  <Button variant="contained" component={RouterLink} to="/login" fullWidth sx={{ fontWeight: 900 }}>
                    Login to apply
                  </Button>
                )}

                {isEmployee ? (
                  <Button
                    variant={saved ? 'outlined' : 'text'}
                    onClick={() => void toggleSave()}
                    fullWidth
                    sx={{ fontWeight: 800 }}
                  >
                  {saved ? 'Saved' : 'Save job'}
                  </Button>
                ) : null}
              </Stack>

              {user && !isEmployee ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Only Employee accounts can apply or save jobs.
                </Alert>
              ) : null}
            </Paper>

            <Paper
              sx={{
                p: 2.5,
                mt: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)'
              }}
            >
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>About {job.company}</Typography>
              <Typography sx={{ opacity: 0.85 }}>
                {job.companyDescription || 'No company description available.'}
              </Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>

      <Snackbar
        open={snack.open}
        autoHideDuration={1800}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.type}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ fontWeight: 700 }}
        >
          {snack.text}
        </Alert>
      </Snackbar>
    </Box>
  )
}
