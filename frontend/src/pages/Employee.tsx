import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import { useToast } from '../toast'
import EmployeeApplications from './employee/EmployeeApplications'
import EmployeeSavedJobs from './employee/EmployeeSavedJobs'
import EmployeeProfile from './employee/EmployeeProfile'
import FriendsList from './employee/FriendsList'
import type { JobApplication, MyProfile, SavedJob } from '../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

export default function Employee() {
  const { showError } = useToast()

  const [tab, setTab] = useState(0)
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // allSettled so one failing panel does not blank the whole dashboard.
      const [applicationsResult, savedResult, profileResult] = await Promise.allSettled([
        api.get<JobApplication[]>('/application/mine'),
        api.get<SavedJob[]>('/savedjobs/mine'),
        api.get<MyProfile>('/profiles/me'),
      ])

      if (applicationsResult.status === 'fulfilled') setApplications(applicationsResult.value.data)
      if (savedResult.status === 'fulfilled') setSavedJobs(savedResult.value.data)
      if (profileResult.status === 'fulfilled') setProfile(profileResult.value.data)

      const failure = [applicationsResult, savedResult, profileResult].find(
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
            Your dashboard
          </Typography>
          <Typography sx={{ opacity: 0.6 }}>Track your applications and keep your profile sharp</Typography>
        </Box>

        <Button variant="outlined" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label={`Applications (${applications.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Saved jobs (${savedJobs.length})`} sx={{ fontWeight: 700 }} />
        <Tab label="Connections" sx={{ fontWeight: 700 }} />
        <Tab label="Requests" sx={{ fontWeight: 700 }} />
        <Tab label="My profile" sx={{ fontWeight: 700 }} />
      </Tabs>

      {loading && !profile ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {tab === 0 ? <EmployeeApplications applications={applications} onRefresh={load} /> : null}
          {tab === 1 ? <EmployeeSavedJobs savedJobs={savedJobs} onRefresh={load} /> : null}
          {tab === 2 ? <FriendsList mode="friends" /> : null}
          {tab === 3 ? <FriendsList mode="requests" /> : null}
          {tab === 4 ? <EmployeeProfile profile={profile} onRefresh={load} /> : null}
        </>
      )}
    </Box>
  )
}
