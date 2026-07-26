import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { useConfirm } from '../confirm'
import { formatSalary, initials } from '../utils'
import PublicProfileView from '../components/PublicProfileView'
import type { FriendshipStatus, JobPosting, Paged, PublicProfile } from '../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchIcon from '@mui/icons-material/Search'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import BoltIcon from '@mui/icons-material/Bolt'

type SearchType = 'jobs' | 'people'

const TRENDING = ['Remote', 'React', 'Frontend', 'Engineer', 'Internship']

const emptyStatus: FriendshipStatus = {
  isFriend: false,
  requestSent: false,
  requestReceived: false,
  incomingRequestId: null,
}

export default function Home() {
  const { user, hasRole } = useAuth()
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [searchType, setSearchType] = useState<SearchType>('jobs')
  const [query, setQuery] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [people, setPeople] = useState<PublicProfile[]>([])
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PublicProfile | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)

  const [savedJobIds, setSavedJobIds] = useState<number[]>([])
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus>(emptyStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEmployee = hasRole('Employee')

  const performSearch = useCallback(async (term: string, type: SearchType, nextPage: number) => {
    setLoading(true)
    setError('')

    try {
      // Both endpoints return a paged envelope now. They used to return every row,
      // which meant a few hundred full job records on each search.
      if (type === 'jobs') {
        const response = await api.get<Paged<JobPosting>>('/jobs', {
          params: { search: term.trim() || undefined, page: nextPage, pageSize: 20 },
        })

        setJobs(response.data.items)
        setPeople([])
        setSelectedJob(response.data.items[0] ?? null)
        setTotalPages(response.data.totalPages)
        setTotal(response.data.total)
      } else {
        const response = await api.get<Paged<PublicProfile>>('/profiles/search', {
          params: { search: term.trim() || undefined, page: nextPage, pageSize: 20 },
        })

        setPeople(response.data.items)
        setJobs([])
        setSelectedPerson(response.data.items[0] ?? null)
        setTotalPages(response.data.totalPages)
        setTotal(response.data.total)
      }
    } catch (err) {
      setError(errorMessage(err, 'Could not load results.'))
      setJobs([])
      setPeople([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSavedJobs = useCallback(async () => {
    if (!isEmployee) {
      setSavedJobIds([])
      return
    }

    try {
      const response = await api.get<{ jobPostingId: number }[]>('/savedjobs/mine')
      setSavedJobIds(response.data.map((item) => item.jobPostingId))
    } catch {
      setSavedJobIds([])
    }
  }, [isEmployee])

  useEffect(() => {
    void loadSavedJobs()
  }, [loadSavedJobs])

  // Refresh the connection state whenever a different person is selected.
  useEffect(() => {
    if (!selectedPerson || !user || selectedPerson.id === user.id) {
      setFriendStatus(emptyStatus)
      return
    }

    let cancelled = false

    api
      .get<FriendshipStatus>(`/friendships/status/${selectedPerson.id}`)
      .then((response) => {
        if (!cancelled) setFriendStatus(response.data)
      })
      .catch(() => {
        if (!cancelled) setFriendStatus(emptyStatus)
      })

    return () => {
      cancelled = true
    }
  }, [selectedPerson, user])

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault()
    setHasSearched(true)
    setPage(1)
    void performSearch(query, searchType, 1)
  }

  const runTrending = (tag: string) => {
    setQuery(tag)
    setHasSearched(true)
    setPage(1)
    void performSearch(tag, searchType, 1)
  }

  const changePage = (nextPage: number) => {
    setPage(nextPage)
    void performSearch(query, searchType, nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveJob = async (jobId: number) => {
    try {
      await api.post('/savedjobs', { jobId })
      setSavedJobIds((previous) => [...previous, jobId])
      showSuccess('Job saved.')
    } catch (err) {
      showError(errorMessage(err, 'Could not save this job.'))
    }
  }

  const connect = async () => {
    if (!selectedPerson) return

    try {
      // Accept directly when they already asked to connect; the request id comes back
      // from the status call, so there is no need to re-fetch the whole request list.
      if (friendStatus.requestReceived && friendStatus.incomingRequestId) {
        await api.post(`/friendships/requests/${friendStatus.incomingRequestId}/accept`)
        setFriendStatus({ ...friendStatus, isFriend: true, requestReceived: false })
        showSuccess('Connection accepted.')
        return
      }

      await api.post(`/friendships/request/${selectedPerson.id}`)
      setFriendStatus({ ...friendStatus, requestSent: true })
      showSuccess('Connection request sent.')
    } catch (err) {
      showError(errorMessage(err, 'Could not send the request.'))
    }
  }

  const blockPerson = async () => {
    if (!selectedPerson) return

    const confirmed = await confirm({
      title: `Block ${selectedPerson.firstName || 'this user'}?`,
      description:
        'They will no longer be able to message you, and you will not see their messages.',
      confirmLabel: 'Block',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.post(`/messages/block/${selectedPerson.id}`)
      showSuccess('User blocked.')
    } catch (err) {
      showError(errorMessage(err, 'Could not block this user.'))
    }
  }

  // --- Landing view -------------------------------------------------------

  if (!hasSearched) {
    return (
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Stack spacing={4} sx={{ width: '100%', maxWidth: 700, textAlign: 'center' }}>
          <Box>
            <Typography
              variant="h1"
              sx={{
                fontWeight: 900,
                mb: 1,
                fontSize: { xs: '2.75rem', sm: '4rem' },
                background: 'linear-gradient(90deg, #00e5ff, #1200ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Find your next job.
            </Typography>
            <Typography variant="h5" sx={{ opacity: 0.6, fontWeight: 500 }}>
              The most efficient job board for modern engineers.
            </Typography>
          </Box>

          <Box component="form" onSubmit={submitSearch} sx={{ width: '100%' }}>
            <Paper
              sx={{
                p: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 4,
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                backgroundColor: 'rgba(255,255,255,0.03)',
              }}
            >
              <Select
                value={searchType}
                onChange={(event) => setSearchType(event.target.value as SearchType)}
                variant="standard"
                disableUnderline
                sx={{ ml: 2, fontWeight: 800, minWidth: 80 }}
                inputProps={{ 'aria-label': 'What to search for' }}
              >
                <MenuItem value="jobs">Jobs</MenuItem>
                <MenuItem value="people">People</MenuItem>
              </Select>

              <Divider sx={{ height: 28, m: 0.5, mx: 1 }} orientation="vertical" />

              <TextField
                fullWidth
                variant="standard"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  searchType === 'jobs'
                    ? 'Search by role, skill, or company…'
                    : 'Search by name, title, or company…'
                }
                slotProps={{ htmlInput: { 'aria-label': 'Search' } }}
                sx={{
                  '& .MuiInput-root': {
                    py: 1.5,
                    fontSize: '1.2rem',
                    '&:before, &:after': { display: 'none' },
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                sx={{ borderRadius: 3, px: 4, py: 1.5, fontWeight: 900 }}
              >
                Search
              </Button>
            </Paper>
          </Box>

          <Stack
            direction="row"
            spacing={1.5}
            justifyContent="center"
            alignItems="center"
            sx={{ flexWrap: 'wrap', gap: 1 }}
          >
            <Typography
              variant="body2"
              sx={{ opacity: 0.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}
            >
              Trending:
            </Typography>
            {TRENDING.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onClick={() => runTrending(tag)}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  fontWeight: 700,
                  '&:hover': { backgroundColor: 'primary.main', color: 'background.default' },
                }}
              />
            ))}
          </Stack>
        </Stack>
      </Box>
    )
  }

  // --- Results view -------------------------------------------------------

  const hasResults = jobs.length > 0 || people.length > 0

  return (
    <Box sx={{ mt: -2 }}>
      <Paper
        sx={{
          p: 1,
          mb: 3,
          borderRadius: 2,
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 16,
          zIndex: 10,
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          component="form"
          onSubmit={submitSearch}
          alignItems="center"
        >
          <Select
            size="small"
            value={searchType}
            onChange={(event) => setSearchType(event.target.value as SearchType)}
            sx={{ fontWeight: 800, minWidth: 100 }}
            inputProps={{ 'aria-label': 'What to search for' }}
          >
            <MenuItem value="jobs">Jobs</MenuItem>
            <MenuItem value="people">People</MenuItem>
          </Select>

          <TextField
            fullWidth
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchType === 'jobs' ? 'Search jobs…' : 'Search people…'}
            slotProps={{
              input: { startAdornment: <SearchIcon sx={{ opacity: 0.5, mr: 1 }} /> },
              htmlInput: { 'aria-label': 'Search' },
            }}
          />

          <Button type="submit" variant="contained" sx={{ px: 4, fontWeight: 800 }}>
            Search
          </Button>
        </Stack>
      </Paper>

      {error ? (
        <Paper sx={{ p: 3, mb: 3, border: '1px solid rgba(244,67,54,0.4)' }}>
          <Typography color="error" sx={{ fontWeight: 700 }}>
            {error}
          </Typography>
        </Paper>
      ) : null}

      {loading ? (
        <Box sx={{ py: 12, textAlign: 'center' }}>
          <CircularProgress />
        </Box>
      ) : !hasResults ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>
            No results found
          </Typography>
          <Typography sx={{ opacity: 0.6, mb: 3 }}>
            Try a different keyword, or clear the search to see everything.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              setQuery('')
              setPage(1)
              void performSearch('', searchType, 1)
            }}
          >
            Clear search
          </Button>
        </Box>
      ) : (
        <>
          <Typography sx={{ mb: 2, opacity: 0.6, fontWeight: 600 }}>
            {total} {searchType === 'jobs' ? 'job' : 'profile'}
            {total === 1 ? '' : 's'} found
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5, lg: 4 }}>
              <Stack spacing={2}>
                {searchType === 'jobs'
                  ? jobs.map((job) => (
                      <Card
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        sx={{
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor:
                            selectedJob?.id === job.id ? 'primary.main' : 'rgba(255,255,255,0.08)',
                          backgroundColor:
                            selectedJob?.id === job.id
                              ? 'rgba(0,229,255,0.03)'
                              : 'background.paper',
                          '&:hover': { borderColor: 'primary.main' },
                          transition: 'all 0.2s',
                        }}
                      >
                        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                            {job.title}
                          </Typography>
                          <Typography sx={{ mt: 0.5, opacity: 0.7, fontWeight: 700 }}>
                            {job.company}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}
                          >
                            {job.tags.slice(0, 3).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                }}
                              />
                            ))}
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{ mt: 2, opacity: 0.6 }}
                          >
                            <LocationOnIcon sx={{ fontSize: '1rem' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {job.location}
                            </Typography>
                          </Stack>

                          {job.salary ? (
                            <Typography
                              variant="body2"
                              sx={{ mt: 1.5, color: 'primary.main', fontWeight: 800 }}
                            >
                              {formatSalary(job.salary)}
                            </Typography>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))
                  : people.map((person) => (
                      <Card
                        key={person.id}
                        onClick={() => setSelectedPerson(person)}
                        sx={{
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor:
                            selectedPerson?.id === person.id
                              ? 'primary.main'
                              : 'rgba(255,255,255,0.08)',
                          backgroundColor:
                            selectedPerson?.id === person.id
                              ? 'rgba(0,229,255,0.03)'
                              : 'background.paper',
                          '&:hover': { borderColor: 'primary.main' },
                          transition: 'all 0.2s',
                        }}
                      >
                        <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              flexShrink: 0,
                              borderRadius: '50%',
                              backgroundColor: 'primary.main',
                              color: 'background.default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.4rem',
                              fontWeight: 900,
                              backgroundImage: person.avatarUrl
                                ? `url(${person.avatarUrl})`
                                : 'none',
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            {person.avatarUrl ? '' : initials(person.firstName, person.lastName)}
                          </Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                              {person.firstName} {person.lastName}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 700 }}>
                              {person.professionalTitle || person.companyName || 'Professional'}
                            </Typography>
                            {person.city || person.country ? (
                              <Typography variant="caption" sx={{ opacity: 0.5 }}>
                                {[person.city, person.country].filter(Boolean).join(', ')}
                              </Typography>
                            ) : null}
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
              </Stack>

              {totalPages > 1 ? (
                <Stack alignItems="center" sx={{ mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, value) => changePage(value)}
                    color="primary"
                    shape="rounded"
                  />
                </Stack>
              ) : null}
            </Grid>

            <Grid size={{ xs: 12, md: 7, lg: 8 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Paper
                sx={{
                  p: 4,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.08)',
                  position: 'sticky',
                  top: 88,
                  maxHeight: 'calc(100vh - 120px)',
                  overflowY: 'auto',
                }}
              >
                {searchType === 'jobs' ? (
                  !selectedJob ? (
                    <Box sx={{ py: 10, textAlign: 'center', opacity: 0.3 }}>
                      <Typography variant="h5">Select a job to see details</Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mb: 3, gap: 2 }}
                      >
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
                            {selectedJob.title}
                          </Typography>
                          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 800 }}>
                            {selectedJob.company}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                          {isEmployee ? (
                            <Button
                              variant="outlined"
                              disabled={savedJobIds.includes(selectedJob.id)}
                              onClick={() => void saveJob(selectedJob.id)}
                              sx={{ fontWeight: 800 }}
                            >
                              {savedJobIds.includes(selectedJob.id) ? 'Saved' : 'Save'}
                            </Button>
                          ) : null}

                          <Button
                            variant="contained"
                            component={RouterLink}
                            to={user ? `/apply/${selectedJob.id}` : '/login'}
                            sx={{ fontWeight: 900, px: 4 }}
                          >
                            {user ? 'Apply now' : 'Log in to apply'}
                          </Button>
                        </Stack>
                      </Stack>

                      <Divider sx={{ mb: 3, opacity: 0.1 }} />

                      <Grid container spacing={3} sx={{ mb: 4 }}>
                        {[
                          ['Location', selectedJob.location || 'Not specified'],
                          ['Salary', formatSalary(selectedJob.salary) || 'Not specified'],
                          ['Job type', selectedJob.jobType || 'Full-time'],
                        ].map(([label, value]) => (
                          <Grid size={{ xs: 12, sm: 4 }} key={label}>
                            <Typography
                              variant="caption"
                              sx={{ opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}
                            >
                              {label}
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
                          </Grid>
                        ))}
                      </Grid>

                      <Box sx={{ mb: 4 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center' }}
                        >
                          <BoltIcon sx={{ mr: 1, color: 'primary.main' }} /> Job description
                        </Typography>

                        {selectedJob.tags.length > 0 ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
                          >
                            {selectedJob.tags.map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 800 }}
                              />
                            ))}
                          </Stack>
                        ) : null}

                        <Typography sx={{ lineHeight: 1.8, opacity: 0.9, whiteSpace: 'pre-wrap' }}>
                          {selectedJob.description}
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          border: '1px dashed rgba(255,255,255,0.1)',
                        }}
                      >
                        <Typography sx={{ fontWeight: 800, mb: 1 }}>
                          About {selectedJob.company}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>
                          {selectedJob.companyDescription || 'No company description available.'}
                        </Typography>
                      </Box>
                    </Box>
                  )
                ) : !selectedPerson ? (
                  <Box sx={{ py: 10, textAlign: 'center', opacity: 0.3 }}>
                    <Typography variant="h5">Select a person to see their profile</Typography>
                  </Box>
                ) : (
                  <Box>
                    <PublicProfileView profile={selectedPerson} />

                    {user && user.id !== selectedPerson.id ? (
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ px: 1, mt: 3, flexWrap: 'wrap', gap: 1 }}
                      >
                        {friendStatus.isFriend ? (
                          <Button
                            variant="outlined"
                            disabled
                            sx={{ borderRadius: 20, fontWeight: 900 }}
                          >
                            Connected
                          </Button>
                        ) : friendStatus.requestSent ? (
                          <Button
                            variant="outlined"
                            disabled
                            sx={{ borderRadius: 20, fontWeight: 900 }}
                          >
                            Request sent
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            onClick={() => void connect()}
                            sx={{ borderRadius: 20, fontWeight: 900 }}
                          >
                            {friendStatus.requestReceived ? 'Accept request' : 'Connect'}
                          </Button>
                        )}

                        <Button
                          variant="outlined"
                          component={RouterLink}
                          to={`/messages?userId=${selectedPerson.id}`}
                          sx={{ borderRadius: 20, fontWeight: 900 }}
                        >
                          Message
                        </Button>

                        <Box sx={{ flexGrow: 1 }} />

                        <Button
                          size="small"
                          variant="text"
                          onClick={() => void blockPerson()}
                          sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}
                        >
                          Block
                        </Button>
                      </Stack>
                    ) : null}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  )
}
