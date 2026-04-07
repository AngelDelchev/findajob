import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

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

  const isEmployee = !!user?.roles?.includes('Employee')

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
      } catch (e: any) {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [jobId])

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
      <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
          {job.title}
        </Typography>
        <Typography sx={{ opacity: 0.9, mt: 0.5 }}>{job.company}</Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          {job.location ? <Chip label={job.location} variant="outlined" /> : null}
          {job.salary ? <Chip label={job.salary} variant="outlined" /> : null}
        </Stack>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

        <Typography sx={{ opacity: 0.9, whiteSpace: 'pre-wrap' }}>
          {job.description}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
          <Button variant="outlined" onClick={() => nav(-1)}>
            Back
          </Button>

          {user ? (
            <Button
              variant="contained"
              disabled={!isEmployee}
              onClick={() => nav(`/apply/${job.id}`)}
            >
              Apply
            </Button>
          ) : (
            <Button variant="contained" component={RouterLink} to="/login">
              Login to apply
            </Button>
          )}
        </Stack>

        {user && !isEmployee ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            Only Employee accounts can apply to jobs.
          </Alert>
        ) : null}
      </Paper>
    </Box>
  )
}
