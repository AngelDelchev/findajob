import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
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

type JobPosting = {
  id: number
  title: string
  company: string
  description: string
  location: string
  salary: string
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
    if (job.salary) items.push({ label: 'Salary', value: job.salary })
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
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
              {job.title}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ opacity: 0.9, fontWeight: 700 }}>{job.company}</Typography>
              {job.location ? <Chip size="small" label={job.location} variant="outlined" /> : null}
              {job.salary ? <Chip size="small" label={job.salary} variant="outlined" /> : null}
            </Stack>

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
              About the role
            </Typography>

            <Typography sx={{ opacity: 0.9, whiteSpace: 'pre-wrap' }}>
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
        <Grid item xs={12} md={4}>
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
                  >
                    Apply
                  </Button>
                ) : (
                  <Button variant="contained" component={RouterLink} to="/login" fullWidth>
                    Login to apply
                  </Button>
                )}

                {isEmployee ? (
                  <Button
                    variant={saved ? 'outlined' : 'text'}
                    onClick={() => void toggleSave()}
                    fullWidth
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
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Company</Typography>
              <Typography sx={{ opacity: 0.85 }}>
                {job.company}
              </Typography>
              <Typography sx={{ opacity: 0.7, mt: 1 }}>
                Company pages, benefits, tech stack, and more coming soon.
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
        >
          {snack.text}
        </Alert>
      </Snackbar>
    </Box>
  )
}
