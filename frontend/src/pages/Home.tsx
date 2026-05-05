import { useEffect, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { formatSalary } from '../utils'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import BoltIcon from '@mui/icons-material/Bolt'
import { Select as MuiSelect, MenuItem } from '@mui/material'

type JobPosting = {
  id: number
  title: string
  company: string
  companyDescription?: string
  description: string
  location: string
  salary: string
  jobType?: string
  tags: string[]
}

export default function Home() {
  const { user } = useAuth()
  const loc = useLocation()
  const [searchType, setSearchType] = useState<'jobs' | 'people'>('jobs')
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [people, setPeople] = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null)
  const [savedJobIds, setSavedJobIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [snack, setSnack] = useState({ open: false, message: '' })
  const [friendStatus, setFriendStatus] = useState({ isFriend: false, requestSent: false, requestReceived: false })

  const isEmployee = !!user?.roles?.includes('Employee')

  useEffect(() => {
    if (selectedPerson && user) {
      if (selectedPerson.id === user.id) {
        setFriendStatus({ isFriend: false, requestSent: false, requestReceived: false })
        return
      }
      const check = async () => {
        try {
          const res = await api.get(`/friendships/status/${selectedPerson.id}`)
          setFriendStatus(res.data)
        } catch { /* ignore */ }
      }
      void check()
    }
  }, [selectedPerson, user])

  const sendFriendRequest = async () => {
    if (!selectedPerson) return
    try {
      if (friendStatus.requestReceived) {
        const res = await api.get(`/friendships/requests`)
        const req = res.data.find((r: any) => r.senderId === selectedPerson.id)
        if (req) {
          await api.post(`/friendships/requests/${req.id}/accept`)
          setFriendStatus({ ...friendStatus, isFriend: true, requestReceived: false })
          alert('Friend request accepted!')
          return
        }
      }

      await api.post(`/friendships/request/${selectedPerson.id}`)
      setFriendStatus({ ...friendStatus, requestSent: true })
      alert('Friend request sent!')
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to send request.')
    }
  }

  useEffect(() => {
    if (loc.pathname === '/' && !loc.search) {
      setHasSearched(false)
      setQuery('')
    }
  }, [loc])

  const performSearch = async (search = '') => {
    setLoading(true)
    try {
      if (searchType === 'jobs') {
        const res = await api.get('/jobs', {
          params: search.trim() ? { search } : {},
        })
        const data = res.data ?? []
        setJobs(data)
        setPeople([])
        if (data.length > 0) setSelectedJob(data[0])
        else setSelectedJob(null)
      } else {
        const res = await api.get('/profiles/search', {
          params: { search },
        })
        const data = res.data ?? []
        setPeople(data)
        setJobs([])
        if (data.length > 0) setSelectedPerson(data[0])
        else setSelectedPerson(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadSaved = async () => {
    if (!isEmployee) {
      setSavedJobIds([])
      return
    }

    try {
      const res = await api.get('/savedjobs/mine')
      setSavedJobIds((res.data ?? []).map((x: any) => x.jobPostingId))
    } catch {
      setSavedJobIds([])
    }
  }

  useEffect(() => {
    void loadSaved()
  }, [isEmployee])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setHasSearched(true)
    await performSearch(query)
  }

  const saveJob = async (jobId: number) => {
    try {
      await api.post('/savedjobs', { jobId })
      setSavedJobIds((prev) => [...prev, jobId])
      setSnack({ open: true, message: 'Job saved successfully!' })
    } catch (e: any) {
      setSnack({
        open: true,
        message: e?.response?.data?.message ?? 'Could not save job.',
      })
    }
  }

  const trending = ['Remote', 'React', 'Frontend', 'Engineer', 'Internship']

  // --- Initial Centered View ---
  if (!hasSearched) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Stack spacing={4} sx={{ width: '100%', maxWidth: 700, textAlign: 'center' }}>
          <Box>
            <Typography variant="h1" sx={{ fontWeight: 900, mb: 1, background: 'linear-gradient(90deg, #00e5ff, #1200ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Find your next job.
            </Typography>
            <Typography variant="h5" sx={{ opacity: 0.6, fontWeight: 500 }}>
              The most efficient job board for modern engineers.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSearch} sx={{ width: '100%' }}>
            <Paper sx={{ p: '4px 8px', display: 'flex', alignItems: 'center', borderRadius: 4, border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <MuiSelect
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                variant="standard"
                disableUnderline
                sx={{ ml: 2, fontWeight: 800, minWidth: 80 }}
              >
                <MenuItem value="jobs">Jobs</MenuItem>
                <MenuItem value="people">People</MenuItem>
              </MuiSelect>
              <Divider sx={{ height: 28, m: 0.5, mx: 1 }} orientation="vertical" />
              <TextField
                fullWidth
                variant="standard"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchType === 'jobs' ? "Search by role, skill, or company..." : "Search by name, email, or phone..."}
                sx={{
                  '& .MuiInput-root': { py: 1.5, fontSize: '1.2rem', '&:before, &:after': { display: 'none' } }
                }}
              />
              <Button type="submit" variant="contained" size="large" sx={{ borderRadius: 3, px: 4, py: 1.5, fontWeight: 900 }}>
                Search
              </Button>
            </Paper>
          </Box>

          <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
            <Typography variant="body2" sx={{ opacity: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Trending:
            </Typography>
            {trending.map(tag => (
              <Chip 
                key={tag} 
                label={tag} 
                onClick={() => { setQuery(tag); setHasSearched(true); void performSearch(tag); }}
                sx={{ backgroundColor: 'rgba(255,255,255,0.05)', fontWeight: 700, '&:hover': { backgroundColor: 'primary.main', color: 'background.default' } }} 
              />
            ))}
          </Stack>
        </Stack>
      </Box>
    )
  }

  // --- Search Results Split View ---
  return (
    <Box sx={{ mt: -2 }}>
      {/* Top Search Bar (Compact) */}
      <Paper sx={{ p: 1, mb: 3, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'background.paper', position: 'sticky', top: 16, zIndex: 10 }}>
        <Stack direction="row" spacing={2} component="form" onSubmit={handleSearch} alignItems="center">
          <MuiSelect
            size="small"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            sx={{ fontWeight: 800, minWidth: 100 }}
          >
            <MenuItem value="jobs">Jobs</MenuItem>
            <MenuItem value="people">People</MenuItem>
          </MuiSelect>
          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchType === 'jobs' ? "Search jobs..." : "Search people..."}
            InputProps={{
              startAdornment: <SearchIcon sx={{ opacity: 0.5, mr: 1 }} />
            }}
          />
          <Button type="submit" variant="contained" sx={{ px: 4, fontWeight: 800 }}>Search</Button>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ py: 12, textAlign: 'center' }}><CircularProgress /></Box>
      ) : (jobs.length === 0 && people.length === 0) ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>No results found.</Typography>
          <Button onClick={() => { setQuery(''); void performSearch(); }}>Clear search</Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Left Column: List */}
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
            <Stack spacing={2}>
              {searchType === 'jobs' ? jobs.map((job) => (
                <Card 
                  key={job.id} 
                  onClick={() => setSelectedJob(job)}
                  sx={{ 
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedJob?.id === job.id ? 'primary.main' : 'rgba(255,255,255,0.08)',
                    backgroundColor: selectedJob?.id === job.id ? 'rgba(0,229,255,0.03)' : 'background.paper',
                    '&:hover': { borderColor: 'primary.main', backgroundColor: 'rgba(0,229,255,0.01)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>{job.title}</Typography>
                    <Typography sx={{ mt: 0.5, opacity: 0.7, fontWeight: 700 }}>{job.company}</Typography>
                    
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                      {(job.tags || []).slice(0, 3).map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.05)' }} />
                      ))}
                    </Stack>

                    <Stack direction="row" spacing={1.5} sx={{ mt: 2, opacity: 0.6 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <LocationOnIcon sx={{ fontSize: '1rem' }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{job.location}</Typography>
                      </Stack>
                    </Stack>
                    
                    {job.salary && (
                      <Typography variant="body2" sx={{ mt: 1.5, color: 'primary.main', fontWeight: 800 }}>
                        {formatSalary(job.salary)}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              )) : people.map((person) => (
                <Card 
                  key={person.id} 
                  onClick={() => setSelectedPerson(person)}
                  sx={{ 
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedPerson?.id === person.id ? 'primary.main' : 'rgba(255,255,255,0.08)',
                    backgroundColor: selectedPerson?.id === person.id ? 'rgba(0,229,255,0.03)' : 'background.paper',
                    '&:hover': { borderColor: 'primary.main', backgroundColor: 'rgba(0,229,255,0.01)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'primary.main', color: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 900, backgroundImage: person.avatarUrl ? `url(${person.avatarUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                      {!person.avatarUrl && `${person.firstName?.[0]}${person.lastName?.[0]}`}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>{person.firstName} {person.lastName}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 700 }}>{person.professionalTitle || (person.companyName ? person.companyName : 'Professional')}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.5 }}>{person.city}, {person.country}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Grid>

          {/* Right Column: Details (Sticky) */}
          <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Paper sx={{ p: 4, borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 88, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              {searchType === 'jobs' ? (
                !selectedJob ? (
                  <Box sx={{ py: 10, textAlign: 'center', opacity: 0.3 }}>
                    <Typography variant="h5">Select a job to see details</Typography>
                  </Box>
                ) : (
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>{selectedJob.title}</Typography>
                        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 800 }}>{selectedJob.company}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        {isEmployee && (
                          <Button 
                            variant="outlined" 
                            disabled={savedJobIds.includes(selectedJob.id)}
                            onClick={() => void saveJob(selectedJob.id)}
                            sx={{ fontWeight: 800 }}
                          >
                            {savedJobIds.includes(selectedJob.id) ? 'Saved' : 'Save'}
                          </Button>
                        )}
                        <Button variant="contained" component={RouterLink} to={`/apply/${selectedJob.id}`} sx={{ fontWeight: 900, px: 4 }}>
                          Apply Now
                        </Button>
                      </Stack>
                    </Stack>

                    <Divider sx={{ mb: 3, opacity: 0.1 }} />

                    <Grid container spacing={3} sx={{ mb: 4 }}>
                      <Grid size={4}>
                        <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>Location</Typography>
                        <Typography sx={{ fontWeight: 700 }}>{selectedJob.location}</Typography>
                      </Grid>
                      <Grid size={4}>
                        <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>Salary</Typography>
                        <Typography sx={{ fontWeight: 700 }}>{formatSalary(selectedJob.salary) || 'Not specified'}</Typography>
                      </Grid>
                      <Grid size={4}>
                        <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>Job Type</Typography>
                        <Typography sx={{ fontWeight: 700 }}>{selectedJob.jobType || 'Full-time'}</Typography>
                      </Grid>                    </Grid>

                    <Box sx={{ mb: 4 }}>
                      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center' }}>
                        <BoltIcon sx={{ mr: 1, color: 'primary.main' }} /> Job Description
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
                        {(selectedJob.tags || []).map(tag => (
                          <Chip key={tag} label={tag} color="primary" variant="outlined" sx={{ fontWeight: 800 }} />
                        ))}
                      </Stack>

                      <Typography sx={{ lineHeight: 1.8, opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                        {selectedJob.description}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ p: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <Typography sx={{ fontWeight: 800, mb: 1 }}>About {selectedJob.company}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.6 }}>
                        {selectedJob.companyDescription || 'No company description available.'}
                      </Typography>
                    </Box>
                  </Box>
                )
              ) : (
                !selectedPerson ? (
                  <Box sx={{ py: 10, textAlign: 'center', opacity: 0.3 }}>
                    <Typography variant="h5">Select a person to see details</Typography>
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ height: 120, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 1, mb: -8, backgroundImage: selectedPerson.bannerUrl ? `url(${selectedPerson.bannerUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    <Box sx={{ px: 2 }}>
                      <Box sx={{ width: 100, height: 100, borderRadius: '50%', border: '4px solid #02060d', backgroundColor: 'primary.main', color: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, backgroundImage: selectedPerson.avatarUrl ? `url(${selectedPerson.avatarUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', mb: 2 }}>
                        {!selectedPerson.avatarUrl && `${selectedPerson.firstName?.[0]}${selectedPerson.lastName?.[0]}`}
                      </Box>
                      
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900 }}>{selectedPerson.firstName} {selectedPerson.lastName}</Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9 }}>{selectedPerson.professionalTitle || (selectedPerson.companyName ? selectedPerson.companyName : 'Professional')}</Typography>
                          <Typography sx={{ opacity: 0.6 }}>{selectedPerson.city}, {selectedPerson.country}</Typography>
                        </Box>

                        <Stack direction="row" spacing={1}>
                          {user?.id !== selectedPerson.id && (
                            <>
                              {friendStatus.isFriend ? (
                                <Button variant="outlined" disabled sx={{ borderRadius: 20, fontWeight: 900 }}>Friends</Button>
                              ) : friendStatus.requestSent ? (
                                <Button variant="outlined" disabled sx={{ borderRadius: 20, fontWeight: 900 }}>Request Sent</Button>
                              ) : (
                                <Button variant="contained" sx={{ borderRadius: 20, fontWeight: 900 }} onClick={sendFriendRequest}>
                                  {friendStatus.requestReceived ? 'Accept Request' : 'Add Friend'}
                                </Button>
                              )}
                              <Button variant="outlined" component={RouterLink} to={`/messages?user=${selectedPerson.id}`} sx={{ borderRadius: 20, fontWeight: 900 }}>Message</Button>
                            </>
                          )}
                        </Stack>
                      </Stack>

                      <Divider sx={{ my: 3, opacity: 0.1 }} />

                      <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>About</Typography>
                      <Typography sx={{ opacity: 0.8, lineHeight: 1.7 }}>{selectedPerson.bio || 'No bio provided.'}</Typography>

                      {selectedPerson.companyName && (
                        <>
                          <Divider sx={{ my: 3, opacity: 0.1 }} />
                          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>Company Details</Typography>
                          <Grid container spacing={2}>
                            <Grid size={6}>
                              <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800 }}>Company Size</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{selectedPerson.companySize || 'Not specified'}</Typography>
                            </Grid>
                            <Grid size={6}>
                              <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800 }}>Industry</Typography>
                              <Typography sx={{ fontWeight: 700 }}>{selectedPerson.industry || 'Not specified'}</Typography>
                            </Grid>
                          </Grid>
                        </>
                      )}

                      <Stack direction="row" spacing={1} sx={{ mt: 4, justifyContent: 'flex-end' }}>
                        <Button size="small" variant="text" color="error" sx={{ fontWeight: 700 }}>Report</Button>
                        <Button size="small" variant="text" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Block</Button>
                      </Stack>
                    </Box>
                  </Box>
                )
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={2000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSnack((s) => ({ ...s, open: false }))} sx={{ fontWeight: 700 }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
