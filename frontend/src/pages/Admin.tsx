import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import AdminJobs from './admin/AdminJobs'
import AdminUsers from './admin/AdminUsers'
import AdminApplications from './admin/AdminApplications'

type Stats = {
  totalUsers: number
  totalJobs: number
  activeJobs: number
  deletedJobs: number
  totalApplications: number
  employers: number
  employees: number
  admins: number
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Paper sx={{ p: 2.5, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography sx={{ opacity: 0.75, fontWeight: 700 }}>{label}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main', mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  )
}

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [tab, setTab] = useState(0)

  const refreshStats = useCallback(async () => {
    const res = await api.get('/admin/stats')
    setStats(res.data)
  }, [])

  useEffect(() => {
    void refreshStats()
  }, [refreshStats])

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
        Admin Terminal
      </Typography>

      {!stats ? (
        <Typography sx={{ opacity: 0.8 }}>Loading…</Typography>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}><StatCard label="Total users" value={stats.totalUsers} /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard label="Total jobs" value={stats.totalJobs} /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard label="Active jobs" value={stats.activeJobs} /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard label="Applications" value={stats.totalApplications} /></Grid>

          <Grid item xs={12} sm={6} md={3}><StatCard label="Employers" value={stats.employers} /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard label="Employees" value={stats.employees} /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard label="Admins" value={stats.admins} /></Grid>
          <Grid item xs={12} sm={6} md={3}><StatCard label="Deleted jobs" value={stats.deletedJobs} /></Grid>
        </Grid>
      )}

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label="Jobs" />
          <Tab label="Users" />
          <Tab label="Applications" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {tab === 0 ? <AdminJobs onChanged={refreshStats} /> : null}
        {tab === 1 ? <AdminUsers onChanged={refreshStats} /> : null}
        {tab === 2 ? <AdminApplications onChanged={refreshStats} /> : null}
      </Box>
    </Box>
  )
}
