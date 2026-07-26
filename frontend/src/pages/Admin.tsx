import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../api'
import { useToast } from '../toast'
import AdminJobs from './admin/AdminJobs'
import AdminUsers from './admin/AdminUsers'
import AdminApplications from './admin/AdminApplications'
import AdminRegistrations from './admin/AdminRegistrations'
import type { AdminStats } from '../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

export default function Admin() {
  const { showError } = useToast()

  const [tab, setTab] = useState(0)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get<AdminStats>('/admin/stats')
      setStats(response.data)
    } catch (error) {
      showError(errorMessage(error, 'Could not load statistics.'))
    }
  }, [showError])

  const refreshAll = useCallback(async () => {
    await loadStats()
    setRefreshKey((previous) => previous + 1)
  }, [loadStats])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  const statCards: [string, number][] = stats
    ? [
        ['Total users', stats.totalUsers],
        ['Total jobs', stats.totalJobs],
        ['Active jobs', stats.activeJobs],
        ['Applications', stats.totalApplications],
        ['Employers', stats.employers],
        ['Job seekers', stats.employees],
        ['Admins', stats.admins],
        ['Archived jobs', stats.deletedJobs],
      ]
    : []

  return (
    <Box>
      <Typography
        variant="h3"
        sx={{ fontWeight: 900, mb: 3, fontSize: { xs: '2rem', md: '3rem' } }}
      >
        Administration
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats ? (
          statCards.map(([label, value]) => (
            <Grid key={label} size={{ xs: 6, sm: 4, md: 3 }}>
              <Card sx={{ border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
                <CardContent>
                  <Typography sx={{ opacity: 0.75, fontSize: '0.9rem' }}>{label}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mt: 1 }}>
                    {value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid size={12}>
            <Typography sx={{ opacity: 0.5 }}>Loading statistics…</Typography>
          </Grid>
        )}
      </Grid>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Jobs" sx={{ fontWeight: 700 }} />
          <Tab label="Users" sx={{ fontWeight: 700 }} />
          <Tab label="Applications" sx={{ fontWeight: 700 }} />
          <Tab label="Registrations" sx={{ fontWeight: 700 }} />
        </Tabs>

        <Button variant="outlined" onClick={() => void refreshAll()} sx={{ flexShrink: 0 }}>
          Refresh
        </Button>
      </Stack>

      {tab === 0 ? <AdminJobs key={`jobs-${refreshKey}`} onChanged={refreshAll} /> : null}
      {tab === 1 ? <AdminUsers key={`users-${refreshKey}`} onChanged={refreshAll} /> : null}
      {tab === 2 ? (
        <AdminApplications key={`applications-${refreshKey}`} onChanged={refreshAll} />
      ) : null}
      {tab === 3 ? (
        <AdminRegistrations key={`registrations-${refreshKey}`} onChanged={refreshAll} />
      ) : null}
    </Box>
  )
}
