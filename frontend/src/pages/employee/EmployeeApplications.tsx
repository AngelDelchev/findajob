import { useState } from 'react'
import { api } from '../../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type Application = {
  id: number
  jobTitle: string
  companyName: string
  appliedAt: string
  status: string
  message: string
}

export default function EmployeeApplications({ 
  applications, 
  onRefresh 
}: { 
  applications: Application[], 
  onRefresh: () => Promise<void> 
}) {
  const [selectedId, setSelectedId] = useState<number | null>(
    applications.length > 0 ? applications[0].id : null
  )

  const selected = applications.find(a => a.id === selectedId)

  const withdraw = async (id: number) => {
    const ok = window.confirm('Withdraw this application? This action cannot be undone.')
    if (!ok) return
    try {
      await api.delete(`/application/${id}`)
      await onRefresh()
      setSelectedId(null)
    } catch (e) {
      console.error('Withdraw failed:', e)
    }
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
      {/* Left List */}
      <Paper sx={{ width: { xs: '100%', md: 320 }, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>My Applications</Typography>
        </Box>
        <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
          {applications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', opacity: 0.6 }}>No applications found.</Box>
          ) : (
            applications.map((a) => (
              <Box
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: selectedId === a.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderLeft: selectedId === a.id ? '4px solid' : '4px solid transparent',
                  borderColor: selectedId === a.id ? 'primary.main' : 'transparent',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  transition: 'all 0.2s'
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>{a.jobTitle}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>{a.companyName}</Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.5 }}>
                    {new Date(a.appliedAt).toLocaleDateString()}
                  </Typography>
                  <Chip label={a.status} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                </Stack>
              </Box>
            ))
          )}
        </Box>
      </Paper>

      {/* Right Detail */}
      <Paper sx={{ flex: 1, p: 3, border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        {!selected ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
            <Typography>Select an application to view details</Typography>
          </Box>
        ) : (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>{selected.jobTitle}</Typography>
                <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 700 }}>{selected.companyName}</Typography>
              </Box>
              <Button variant="outlined" color="error" onClick={() => void withdraw(selected.id)}>
                Withdraw Application
              </Button>
            </Stack>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ opacity: 0.5, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', mb: 0.5 }}>
                  Status
                </Typography>
                <Chip label={selected.status} color="primary" variant="outlined" sx={{ fontWeight: 900 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography sx={{ opacity: 0.5, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', mb: 0.5 }}>
                  Applied On
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{new Date(selected.appliedAt).toLocaleString()}</Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
              <Typography sx={{ opacity: 0.5, fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', mb: 1.5 }}>
                Your Message
              </Typography>
              <Paper sx={{ p: 2, backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {selected.message || "No message attached to this application."}
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}
