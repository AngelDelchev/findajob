import { useEffect, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import AdminJobs from './admin/AdminJobs'
import AdminUsers from './admin/AdminUsers'
import AdminApplications from './admin/AdminApplications'
import AdminRegistrations from './admin/AdminRegistrations'

type AdminStats = {
  totalUsers: number
  totalJobs: number
  activeJobs: number
  deletedJobs: number
  totalApplications: number
  employers: number
  employees: number
  admins: number
}

export default function Admin() {
  const [tab, setTab] = useState(0)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadStats = async () => {
    const res = await api.get('/admin/stats')
    setStats(res.data)
  }

  const refreshAll = async () => {
    await loadStats()
    setRefreshKey((prev) => prev + 1)
  }

  useEffect(() => {
    void loadStats()
  }, [])

  const statCards = stats
    ? [
        ['Total users', stats.totalUsers ?? 0],
        ['Total jobs', stats.totalJobs ?? 0],
        ['Active jobs', stats.activeJobs ?? 0],
        ['Applications', stats.totalApplications ?? 0],
        ['Employers', stats.employers ?? 0],
        ['Employees', stats.employees ?? 0],
        ['Admins', stats.admins ?? 0],
        ['Deleted jobs', stats.deletedJobs ?? 0],
      ]
    : []

  return (
    <Box>
      <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>
        Admin Terminal
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats ? (
          statCards.map(([label, value]) => (
            <Grid key={String(label)} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <CardContent>
                  <Typography sx={{ opacity: 0.75 }}>{label}</Typography>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 900, color: 'primary.main', mt: 1 }}
                  >
                    {String(value ?? 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid size={12}>
            <Typography sx={{ opacity: 0.5 }}>Loading stats...</Typography>
          </Grid>
        )}
      </Grid>

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Jobs" />
          <Tab label="Users" />
          <Tab label="Applications" />
          <Tab label="Registrations" />
        </Tabs>

        <Button variant="outlined" onClick={() => void refreshAll()}>
          Refresh
        </Button>
      </Stack>

      {tab === 0 ? (
        <AdminJobs key={`admin-jobs-${refreshKey}`} onChanged={refreshAll} />
      ) : null}

      {tab === 1 ? (
        <AdminUsers key={`admin-users-${refreshKey}`} onChanged={refreshAll} />
      ) : null}

      {tab === 2 ? (
        <AdminApplications
          key={`admin-applications-${refreshKey}`}
          onChanged={refreshAll}
        />
      ) : null}

      {tab === 3 ? (
        <AdminRegistrations
          key={`admin-registrations-${refreshKey}`}
          onChanged={refreshAll}
        />
      ) : null}
    </Box>
  )
}
