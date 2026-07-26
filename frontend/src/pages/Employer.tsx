import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import { useToast } from '../toast'
import EmployerApplications from './employer/EmployerApplications'
import EmployerJobsList from './employer/EmployerJobsList'
import EmployerProfile from './employer/EmployerProfile'
import FriendsList from './employee/FriendsList'
import JobFormFields from '../components/JobFormFields'
import type { JobFormState } from '../components/JobFormFields'
import type { JobApplication, JobPosting, MyProfile } from '../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

const emptyJob: JobFormState = {
  title: '',
  company: '',
  location: '',
  salary: '$ 0',
  jobType: 'Full-time',
  description: '',
  tags: [],
}

export default function Employer() {
  const { showSuccess, showError } = useToast()

  const [tab, setTab] = useState(0)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [openCreate, setOpenCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [jobForm, setJobForm] = useState<JobFormState>(emptyJob)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [applicationsResult, jobsResult, profileResult] = await Promise.allSettled([
        api.get<JobApplication[]>('/application/employer'),
        api.get<JobPosting[]>('/jobs/mine'),
        api.get<MyProfile>('/profiles/me'),
      ])

      if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value.data)
      if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value.data)
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value.data)

      const failure = [applicationsResult, jobsResult, profileResult].find(
        (result) => result.status === 'rejected'
      )

      if (failure?.status === 'rejected') {
        showError(errorMessage(failure.reason, 'Some of your dashboard could not be loaded.'))
      }
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    void load()
  }, [load])

  const openCreateDialog = () => {
    setFormError('')
    setJobForm({ ...emptyJob, company: profile?.companyName ?? '' })
    setOpenCreate(true)
  }

  const createJob = async () => {
    setFormError('')

    if (!jobForm.title.trim() || !jobForm.description.trim()) {
      setFormError('A title and description are required.')
      return
    }

    setSaving(true)
    try {
      await api.post('/jobs', jobForm)
      setOpenCreate(false)
      setJobForm(emptyJob)
      await load()
      showSuccess('Job posted.')
    } catch (error) {
      setFormError(errorMessage(error, 'Could not post this job.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3rem' } }}>
            Employer dashboard
          </Typography>
          <Typography sx={{ opacity: 0.6 }}>Manage your postings and track applications</Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={openCreateDialog}
            sx={{ fontWeight: 900 }}
          >
            Post a job
          </Button>
        </Stack>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label={`Applications (${applications.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`My jobs (${jobs.length})`} sx={{ fontWeight: 700 }} />
        <Tab label="Connections" sx={{ fontWeight: 700 }} />
        <Tab label="Requests" sx={{ fontWeight: 700 }} />
        <Tab label="Company profile" sx={{ fontWeight: 700 }} />
      </Tabs>

      {loading && !profile ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tab === 0 ? <EmployerApplications applications={applications} onRefresh={load} /> : null}
          {tab === 1 ? <EmployerJobsList jobs={jobs} onRefresh={load} /> : null}
          {tab === 2 ? <FriendsList mode="friends" /> : null}
          {tab === 3 ? <FriendsList mode="requests" /> : null}
          {tab === 4 ? <EmployerProfile profile={profile} onRefresh={load} /> : null}
        </>
      )}

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>Post a new job</DialogTitle>
        <DialogContent dividers>
          <JobFormFields form={jobForm} setForm={setJobForm} />
          {formError ? (
            <Typography color="error" sx={{ fontWeight: 700, mt: 2 }}>
              {formError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void createJob()}
            sx={{ px: 4, fontWeight: 900 }}
          >
            {saving ? 'Posting…' : 'Post job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
