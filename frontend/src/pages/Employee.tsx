import { useEffect, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import EmployeeApplications from './employee/EmployeeApplications'
import EmployeeSavedJobs from './employee/EmployeeSavedJobs'
import EmployeeProfile from './employee/EmployeeProfile'
import FriendsList from './employee/FriendsList'

export default function Employee() {
  const [tab, setTab] = useState(0)
  const [applications, setApplications] = useState<any[]>([])
  const [savedJobs, setSavedJobs] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [appsRes, savedRes, profileRes] = await Promise.allSettled([
        api.get('/application/mine'),
        api.get('/savedjobs/mine'),
        api.get('/profiles/me'),
      ])

      if (appsRes.status === 'fulfilled') setApplications(appsRes.value.data ?? [])
      if (savedRes.status === 'fulfilled') setSavedJobs(savedRes.value.data ?? [])
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data ?? null)
    } catch (e) {
      console.error('Failed to load employee data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900 }}>
            Employee Dashboard
          </Typography>
          <Typography sx={{ opacity: 0.6 }}>Track your career journey and profile</Typography>
        </Box>

        <Button variant="outlined" onClick={() => void load()}>
          Refresh Data
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Applications (${applications.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Saved Jobs (${savedJobs.length})`} sx={{ fontWeight: 700 }} />
        <Tab label="Friends" sx={{ fontWeight: 700 }} />
        <Tab label="Requests" sx={{ fontWeight: 700 }} />
        <Tab label="My Profile" sx={{ fontWeight: 700 }} />
      </Tabs>

      {loading && applications.length === 0 && savedJobs.length === 0 && !profile ? (
        <Typography sx={{ py: 8, textAlign: 'center', opacity: 0.5 }}>Syncing your dashboard...</Typography>
      ) : (
        <>
          {tab === 0 && <EmployeeApplications applications={applications} onRefresh={load} />}
          {tab === 1 && <EmployeeSavedJobs savedJobs={savedJobs} onRefresh={load} />}
          {tab === 2 && <FriendsList mode="friends" />}
          {tab === 3 && <FriendsList mode="requests" />}
          {tab === 4 && <EmployeeProfile profile={profile} onRefresh={load} />}
        </>
      )}
    </Box>
  )
}
