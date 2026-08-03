import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
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
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SearchIcon from '@mui/icons-material/Search'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import BoltIcon from '@mui/icons-material/Bolt'

type SearchType = 'jobs' | 'people'

const TRENDING = ['Remote', 'React', 'Frontend', 'Engineer', 'Internship']

const isExpired = (job: JobPosting): boolean =>
  job.deadline ? new Date(job.deadline) < new Date() : false

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
  const navigate = useNavigate()

  /*
   * The detail pane is hidden below `md`, so on a phone selecting a result used to
   * do nothing at all: the card set state that nothing on screen was rendering.
   * Below that breakpoint a job now opens its own page and a person opens a dialog.
   */
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('md'))
  const [personDialogOpen, setPersonDialogOpen] = useState(false)

  /*
   * The search lives in the query string rather than in component state, so a result
   * page can be linked to, bookmarked and reached with the browser's back button.
   * Previously all of it was local state: every search produced the same URL, and Back
   * left the site instead of returning to the previous results.
   */
  const [params, setParams] = useSearchParams()

  const searchType: SearchType = params.get('type') === 'people' ? 'people' : 'jobs'
  const query = params.get('q') ?? ''
  const page = Math.max(Number(params.get('page') ?? '1') || 1, 1)
  const hasSearched = params.has('q') || params.has('type')

  // The text field is uncontrolled by the URL while it is being typed in; only
  // submitting commits it.
  const [queryInput, setQueryInput] = useState(query)

  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [people, setPeople] = useState<PublicProfile[]>([])
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PublicProfile | null>(null)

  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)

  const [latestJobs, setLatestJobs] = useState<JobPosting[]>([])
  const [savedJobIds, setSavedJobIds] = useState<number[]>([])
  const [friendStatus, setFriendStatus] = useState<FriendshipStatus>(emptyStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEmployee = hasRole('Employee')

  /** Writes the search into the URL; the effect below reacts to it. */
  const updateSearch = (next: { q?: string; type?: SearchType; page?: number }) => {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)

        if (next.q !== undefined) updated.set('q', next.q)
        if (next.type !== undefined) updated.set('type', next.type)
        updated.set('page', String(next.page ?? 1))

        return updated
      },
      { replace: false }
    )
  }

  // Keep the box in step when the URL changes underneath it, which is what happens
  // when the back button moves between two searches.
  useEffect(() => {
    setQueryInput(query)
  }, [query])

  useEffect(() => {
    if (!hasSearched) return

    let cancelled = false

    // Both endpoints return a paged envelope. They used to return every row, which
    // meant a few hundred full job records on each search.
    const run = async () => {
      setLoading(true)
      setError('')

      const config = { params: { search: query.trim() || undefined, page, pageSize: 20 } }

      try {
        if (searchType === 'jobs') {
          const { data } = await api.get<Paged<JobPosting>>('/jobs', config)
          if (cancelled) return

          setJobs(data.items)
          setPeople([])
          setSelectedJob(data.items[0] ?? null)
          setTotalPages(data.totalPages)
          setTotal(data.total)
        } else {
          const { data } = await api.get<Paged<PublicProfile>>('/profiles/search', config)
          if (cancelled) return

          setPeople(data.items)
          setJobs([])
          setSelectedPerson(data.items[0] ?? null)
          setTotalPages(data.totalPages)
          setTotal(data.total)
        }
      } catch (err) {
        if (cancelled) return

        setError(errorMessage(err, 'Could not load results.'))
        setJobs([])
        setPeople([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [hasSearched, searchType, query, page])

  // The most recent postings, shown on the landing page. A job board whose front page
  // lists nothing until you type gives a first-time visitor nothing to look at.
  useEffect(() => {
    if (hasSearched) return

    let cancelled = false

    api
      .get<Paged<JobPosting>>('/jobs', { params: { page: 1, pageSize: 6 } })
      .then((response) => {
        if (!cancelled) setLatestJobs(response.data.items)
      })
      .catch(() => {
        if (!cancelled) setLatestJobs([])
      })

    return () => {
      cancelled = true
    }
  }, [hasSearched])

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
    updateSearch({ q: queryInput, type: searchType, page: 1 })
  }

  const runTrending = (tag: string) => {
    setQueryInput(tag)
    updateSearch({ q: tag, type: searchType, page: 1 })
  }

  const changeType = (type: SearchType) => {
    updateSearch({ q: queryInput, type, page: 1 })
  }

  const changePage = (nextPage: number) => {
    updateSearch({ page: nextPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openJob = (job: JobPosting) => {
    if (isCompact) {
      navigate(`/jobs/${job.id}`)
      return
    }

    setSelectedJob(job)
  }

  const openPerson = (person: PublicProfile) => {
    setSelectedPerson(person)
    if (isCompact) setPersonDialogOpen(true)
  }

  /** Lets a card be reached with the keyboard, the way a button would be. */
  const activateOnKey = (action: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action()
    }
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
                onChange={(event) => changeType(event.target.value as SearchType)}
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
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
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

          {latestJobs.length > 0 ? (
            <Box sx={{ pt: 4, textAlign: 'left' }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Latest openings
                </Typography>
                <Button
                  size="small"
                  onClick={() => updateSearch({ q: '', type: 'jobs', page: 1 })}
                  sx={{ fontWeight: 800 }}
                >
                  Browse all
                </Button>
              </Stack>

              <Stack spacing={1.5}>
                {latestJobs.map((job) => (
                  <Card
                    key={job.id}
                    component={RouterLink}
                    to={`/jobs/${job.id}`}
                    sx={{
                      display: 'block',
                      textDecoration: 'none',
                      border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'border-color 0.2s',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="baseline"
                        sx={{ gap: 2 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }} noWrap>
                            {job.title}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.65 }} noWrap>
                            {[job.company, job.location].filter(Boolean).join(' • ')}
                          </Typography>
                        </Box>

                        {job.salary ? (
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'primary.main',
                              fontWeight: 800,
                              flexShrink: 0,
                              display: { xs: 'none', sm: 'block' },
                            }}
                          >
                            {formatSalary(job.salary)}
                          </Typography>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </Box>
    )
  }

  // --- Results view -------------------------------------------------------

  const hasResults = jobs.length > 0 || people.length > 0

  /**
   * The selected person's profile and the actions on them. Rendered in the detail
   * pane on a wide screen and in a dialog on a narrow one, so both routes stay in
   * step rather than growing two copies of the same buttons.
   */
  const personDetail = !selectedPerson ? null : (
    <Box>
      <PublicProfileView profile={selectedPerson} />

      {user && user.id !== selectedPerson.id ? (
        <Stack direction="row" spacing={1} sx={{ px: 1, mt: 3, flexWrap: 'wrap', gap: 1 }}>
          {friendStatus.isFriend ? (
            <Button variant="outlined" disabled sx={{ borderRadius: 20, fontWeight: 900 }}>
              Connected
            </Button>
          ) : friendStatus.requestSent ? (
            <Button variant="outlined" disabled sx={{ borderRadius: 20, fontWeight: 900 }}>
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
  )

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
            onChange={(event) => changeType(event.target.value as SearchType)}
            sx={{ fontWeight: 800, minWidth: 100 }}
            inputProps={{ 'aria-label': 'What to search for' }}
          >
            <MenuItem value="jobs">Jobs</MenuItem>
            <MenuItem value="people">People</MenuItem>
          </Select>

          <TextField
            fullWidth
            size="small"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
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
              setQueryInput('')
              updateSearch({ q: '', page: 1 })
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
                        onClick={() => openJob(job)}
                        onKeyDown={activateOnKey(() => openJob(job))}
                        role="button"
                        tabIndex={0}
                        aria-label={`${job.title} at ${job.company}`}
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
                        onClick={() => openPerson(person)}
                        onKeyDown={activateOnKey(() => openPerson(person))}
                        role="button"
                        tabIndex={0}
                        aria-label={`${person.firstName} ${person.lastName}`.trim() || 'Profile'}
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

                          {/*
                            Matches the gating on the job page. This used to send every
                            signed-in visitor to /apply, so an employer or administrator
                            clicking Apply landed on a permission-denied screen.
                          */}
                          {!user ? (
                            <Button
                              variant="contained"
                              component={RouterLink}
                              to="/login"
                              sx={{ fontWeight: 900, px: 4 }}
                            >
                              Log in to apply
                            </Button>
                          ) : !isEmployee ? (
                            <Button
                              variant="outlined"
                              component={RouterLink}
                              to={`/jobs/${selectedJob.id}`}
                              sx={{ fontWeight: 900, px: 4 }}
                            >
                              View details
                            </Button>
                          ) : isExpired(selectedJob) ? (
                            <Button variant="contained" disabled sx={{ fontWeight: 900, px: 4 }}>
                              Deadline passed
                            </Button>
                          ) : (
                            <Button
                              variant="contained"
                              component={RouterLink}
                              to={`/apply/${selectedJob.id}`}
                              sx={{ fontWeight: 900, px: 4 }}
                            >
                              Apply now
                            </Button>
                          )}
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
                  personDetail
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Below `md` the pane above is hidden, so the profile opens here instead. */}
          <Dialog
            open={personDialogOpen && isCompact}
            onClose={() => setPersonDialogOpen(false)}
            fullWidth
            maxWidth="sm"
            scroll="body"
          >
            <DialogContent>{personDetail}</DialogContent>
          </Dialog>
        </>
      )}
    </Box>
  )
}
