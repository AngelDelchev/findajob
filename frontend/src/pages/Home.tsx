import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActions from '@mui/material/CardActions'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import BookmarkIcon from '@mui/icons-material/Bookmark'

type JobPosting = {
  id: number
  title: string
  company: string
  description: string
  location: string
  salary: string
}

export default function Home() {
  const nav = useNavigate()
  const { user } = useAuth()
  const isEmployee = !!user?.roles?.includes('Employee')

  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [snack, setSnack] = useState<{ open: boolean; text: string; type: 'success' | 'info' | 'error' }>({
    open: false,
    text: '',
    type: 'success'
  })

  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)

  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const loadJobs = async (term: string) => {
    setLoading(true)
    const res = await api.get('/jobs', { params: { search: term } })
    setJobs(res.data)
    setLoading(false)
  }

  useEffect(() => {
    void loadJobs('')
  }, [])

  const performSearch = async () => {
    const term = searchInput.trim()
    setSearchTerm(term)
    await loadJobs(term)
  }

  const title = useMemo(
    () => (searchTerm ? `Results for "${searchTerm}"` : 'Recent jobs'),
    [searchTerm]
  )

  useEffect(() => {
  const loadSaved = async () => {
    if (!isEmployee) {
      setSavedIds(new Set())
      return
    }
    try {
      const res = await api.get('/savedjobs/mine')
      setSavedIds(new Set<number>(res.data.map((x: any) => x.jobPostingId)))
    } catch {
      setSavedIds(new Set())
    }
  }

  void loadSaved()
}, [isEmployee])

  const toggleSave = async (jobId: number) => {
  try {
    if (savedIds.has(jobId)) {
      await api.delete(`/savedjobs/${jobId}`)
      const next = new Set(savedIds)
      next.delete(jobId)
      setSavedIds(next)
      setSnack({ open: true, text: 'Removed from saved', type: 'info' })
    } else {
      await api.post('/savedjobs', { jobId })
      const next = new Set(savedIds)
      next.add(jobId)
      setSavedIds(next)
      setSnack({ open: true, text: 'Saved job', type: 'success' })
    }
  } catch {
    setSnack({ open: true, text: 'Action failed', type: 'error' })
  }
}

  return (
    <Box>
      <Paper
        sx={{
          p: 4,
          mb: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          background:
            'linear-gradient(135deg, rgba(0,240,255,0.14), rgba(124,58,237,0.08))'
        }}
      >
        <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
          Find your next big thing
        </Typography>
        <Typography sx={{ opacity: 0.85, mb: 3 }}>
          Fast search, clean flow, role-based dashboards.
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <TextField
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search jobs (e.g. .NET Developer)"
            fullWidth
            onKeyDown={(e) => {
              if (e.key === 'Enter') void performSearch()
            }}
          />
          <Button variant="contained" onClick={() => void performSearch()} sx={{ minWidth: 140 }}>
            Search
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {loading ? <Typography sx={{ opacity: 0.7 }}>Loading…</Typography> : null}
      </Box>

      <Grid container spacing={2}>
        {jobs.map((j) => (
          <Grid item xs={12} sm={6} md={4} key={j.id}>
            <Card sx={{ height: '100%', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>
                  {j.title}
                </Typography>
                <Typography sx={{ opacity: 0.85, mb: 1 }}>{j.company}</Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {j.location ? <Chip size="small" label={j.location} variant="outlined" /> : null}
                  {j.salary ? <Chip size="small" label={j.salary} variant="outlined" /> : null}
                </Box>

                <Typography sx={{ opacity: 0.8 }}>
                  {j.description?.length > 140 ? `${j.description.slice(0, 140)}…` : j.description}
                </Typography>
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2, display: 'flex', alignItems: 'center' }}>
                <Button size="small" variant="outlined" component={RouterLink} to={`/job/${j.id}`}>
                  Details
                </Button>

                <Button size="small" variant="contained" component={RouterLink} to={`/apply/${j.id}`}>
                  Apply
                </Button>

                {isEmployee ? (
                <IconButton
                  onClick={() => void toggleSave(j.id)}
                  sx={{ marginLeft: 'auto' }}
                  aria-label="save job"
                >
                {savedIds.has(j.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                </IconButton>
                ) : null}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {!loading && jobs.length === 0 ? (
        <Paper sx={{ p: 3, mt: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography sx={{ opacity: 0.85 }}>No jobs found. Try a different search.</Typography>
        </Paper>
      ) : null}

      {user && !isEmployee ? (
        <Paper sx={{ p: 2, mt: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography sx={{ opacity: 0.85 }}>
            Only <b>Employee</b> accounts can apply. (You can still browse jobs.)
          </Typography>
        </Paper>
      ) : null}

      <Snackbar
      open={snack.open}
      autoHideDuration={1600}
      onClose={() => setSnack(s => ({ ...s, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        severity={snack.type}
        variant="filled"
        onClose={() => setSnack(s => ({ ...s, open: false }))}
      >
        {snack.text}
      </Alert>
    </Snackbar>
    </Box>

  )
}
