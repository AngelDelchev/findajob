import { useEffect, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import EmployerApplications from './employer/EmployerApplications'
import EmployerJobsList from './employer/EmployerJobsList'
import EmployerProfile from './employer/EmployerProfile'
import FriendsList from './employee/FriendsList'
import JobFormFields from '../components/JobFormFields'
import type { JobFormState } from '../components/JobFormFields'

export default function Employer() {
  const [tab, setTab] = useState(0)
  const [applications, setApplications] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [jobForm, setJobForm] = useState<JobFormState>({
    title: '',
    company: '',
    location: '',
    salary: '$ 0',
    jobType: 'Full-time',
    description: '',
    tags: [],
  })

  const load = async () => {
    try {
      const [appsRes, jobsRes, profileRes] = await Promise.all([
        api.get('/application/employer'),
        api.get('/jobs/mine'),
        api.get('/profiles/me')
      ])

      setApplications(appsRes.data ?? [])
      setJobs(jobsRes.data ?? [])
      setProfile(profileRes.data ?? null)
    } catch (e) {
      console.error('Failed to load employer data:', e)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const createJob = async () => {
    if (!jobForm.title) return
    setIsSaving(true)
    try {
      await api.post('/jobs', jobForm)
      setOpenCreate(false)
      setJobForm({
        title: '',
        company: '',
        location: '',
        salary: '$ 0',
        jobType: 'Full-time',
        description: '',
        tags: [],
      })
      await load()
    } catch (e) {
      console.error('Create job failed:', e)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            Employer Terminal
          </Typography>
          <Typography sx={{ opacity: 0.6 }}>Manage your postings and track applications</Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => void load()}>
            Refresh
          </Button>
          <Button variant="contained" size="large" onClick={() => setOpenCreate(true)} sx={{ fontWeight: 900 }}>
            Post a Job
          </Button>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Applications (${applications.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`My Jobs (${jobs.length})`} sx={{ fontWeight: 700 }} />
        <Tab label="Friends" sx={{ fontWeight: 700 }} />
        <Tab label="Requests" sx={{ fontWeight: 700 }} />
        <Tab label="Company Profile" sx={{ fontWeight: 700 }} />
      </Tabs>

      {tab === 0 && <EmployerApplications applications={applications} onRefresh={load} />}
      {tab === 1 && <EmployerJobsList jobs={jobs} onRefresh={load} />}
      {tab === 2 && <FriendsList mode="friends" />}
      {tab === 3 && <FriendsList mode="requests" />}
      {tab === 4 && <EmployerProfile profile={profile} onRefresh={load} />}

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 900 }}>Post New Job</DialogTitle>
        <DialogContent dividers>
          <JobFormFields form={jobForm} setForm={setJobForm} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" disabled={isSaving} onClick={() => void createJob()} sx={{ px: 4, fontWeight: 900 }}>
            {isSaving ? 'Posting...' : 'Post Job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
