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

  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)

  // IMPORTANT: input vs committed search (fixes the “title changes while typing” bug)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const isEmployee = !!user?.roles?.includes('Employee')

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

              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button size="small" variant="outlined" component={RouterLink} to={`/job/${j.id}`}>
                  Details
                </Button>

                <Button
                  size="small"
                  variant="contained"
                  disabled={!isEmployee}
                  onClick={() => nav(`/apply/${j.id}`)}
                >
                  Apply
                </Button>
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
    </Box>
  )
}
