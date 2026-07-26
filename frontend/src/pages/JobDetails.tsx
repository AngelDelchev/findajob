import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { formatDate, formatSalary } from '../utils'
import NotFound from './NotFound'
import type { JobPosting } from '../types'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BoltIcon from '@mui/icons-material/Bolt'

export default function JobDetails() {
  const { id } = useParams()
  const jobId = Number(id)
  const navigate = useNavigate()
  const { user, hasRole } = useAuth()
  const { showSuccess, showError } = useToast()

  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saved, setSaved] = useState(false)

  const isEmployee = hasRole('Employee')

  const facts = useMemo(() => {
    if (!job) return []

    return [
      job.location ? { label: 'Location', value: job.location } : null,
      job.salary ? { label: 'Salary', value: formatSalary(job.salary) } : null,
      job.jobType ? { label: 'Job type', value: job.jobType } : null,
      job.workMode ? { label: 'Work mode', value: job.workMode } : null,
      job.seniorityLevel ? { label: 'Seniority', value: job.seniorityLevel } : null,
      job.deadline ? { label: 'Apply before', value: formatDate(job.deadline) } : null,
    ].filter((fact): fact is { label: string; value: string } => fact !== null)
  }, [job])

  const loadSavedState = useCallback(async () => {
    if (!isEmployee || !Number.isFinite(jobId)) {
      setSaved(false)
      return
    }

    try {
      const response = await api.get<{ jobPostingId: number }[]>('/savedjobs/mine')
      setSaved(response.data.some((item) => item.jobPostingId === jobId))
    } catch {
      setSaved(false)
    }
  }, [isEmployee, jobId])

  useEffect(() => {
    if (!Number.isFinite(jobId)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    api
      .get<JobPosting>(`/jobs/${jobId}`)
      .then((response) => {
        if (!cancelled) setJob(response.data)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [jobId])

  useEffect(() => {
    void loadSavedState()
  }, [loadSavedState])

  const toggleSave = async () => {
    if (!job) return

    try {
      if (saved) {
        await api.delete(`/savedjobs/${job.id}`)
        setSaved(false)
        showSuccess('Removed from saved jobs.')
      } else {
        await api.post('/savedjobs', { jobId: job.id })
        setSaved(true)
        showSuccess('Job saved.')
      }
    } catch (error) {
      showError(errorMessage(error, 'Could not update your saved jobs.'))
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (notFound || !job) {
    return <NotFound />
  }

  const expired = job.deadline ? new Date(job.deadline) < new Date() : false

  return (
    <Box>
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
              {job.title}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
              <Typography sx={{ opacity: 0.9, fontWeight: 700 }}>{job.company}</Typography>
              {job.location ? <Chip size="small" label={job.location} variant="outlined" /> : null}
              {job.jobType ? (
                <Chip size="small" label={job.jobType} variant="outlined" color="primary" />
              ) : null}
              {job.salary ? (
                <Chip size="small" label={formatSalary(job.salary)} variant="outlined" />
              ) : null}
            </Stack>

            {job.tags.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.5 }}>
                {job.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ fontWeight: 800 }} />
                ))}
              </Stack>
            ) : null}

            <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Typography
              variant="h6"
              sx={{ fontWeight: 900, mb: 1, display: 'flex', alignItems: 'center' }}
            >
              <BoltIcon sx={{ mr: 1, color: 'primary.main' }} /> About the role
            </Typography>
            <Typography sx={{ opacity: 0.9, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
              {job.description}
            </Typography>

            {job.responsibilities ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 900, mt: 3, mb: 1 }}>
                  Responsibilities
                </Typography>
                <Typography sx={{ opacity: 0.9, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {job.responsibilities}
                </Typography>
              </>
            ) : null}

            {job.requirements ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 900, mt: 3, mb: 1 }}>
                  Requirements
                </Typography>
                <Typography sx={{ opacity: 0.9, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {job.requirements}
                </Typography>
              </>
            ) : null}

            {job.benefits ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 900, mt: 3, mb: 1 }}>
                  Benefits
                </Typography>
                <Typography sx={{ opacity: 0.9, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {job.benefits}
                </Typography>
              </>
            ) : null}

            <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Back
              </Button>
              <Button variant="outlined" component={RouterLink} to="/">
                Browse more jobs
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
            <Paper sx={{ p: 2.5, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>
                Quick facts
              </Typography>

              <Stack spacing={1.25}>
                {facts.length === 0 ? (
                  <Typography sx={{ opacity: 0.8 }}>No additional details provided.</Typography>
                ) : (
                  facts.map((fact) => (
                    <Box
                      key={fact.label}
                      sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                    >
                      <Typography sx={{ opacity: 0.75 }}>{fact.label}</Typography>
                      <Typography sx={{ fontWeight: 800, textAlign: 'right' }}>
                        {fact.value}
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>

              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

              <Stack spacing={1}>
                {!user ? (
                  <Button
                    variant="contained"
                    component={RouterLink}
                    to="/login"
                    fullWidth
                    sx={{ fontWeight: 900 }}
                  >
                    Log in to apply
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    disabled={!isEmployee || expired}
                    onClick={() => navigate(`/apply/${job.id}`)}
                    fullWidth
                    sx={{ fontWeight: 900, py: 1.2 }}
                  >
                    {expired ? 'Deadline passed' : 'Apply now'}
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
                  Only job seeker accounts can apply or save jobs.
                </Alert>
              ) : null}
            </Paper>

            <Paper
              sx={{
                p: 2.5,
                mt: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
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
    </Box>
  )
}
