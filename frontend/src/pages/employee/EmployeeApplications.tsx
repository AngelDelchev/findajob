import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import { formatDate, formatDateTime } from '../../utils'
import type { ApplicationStatus, JobApplication } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type Props = {
  applications: JobApplication[]
  onRefresh: () => Promise<void>
}

const statusColor = (
  status: ApplicationStatus
): 'default' | 'info' | 'warning' | 'success' | 'error' => {
  switch (status) {
    case 'Reviewed':
      return 'info'
    case 'Interviewing':
      return 'warning'
    case 'Accepted':
      return 'success'
    case 'Rejected':
      return 'error'
    default:
      return 'default'
  }
}

export default function EmployeeApplications({ applications, onRefresh }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [selectedId, setSelectedId] = useState<number | null>(applications[0]?.id ?? null)

  // Keep the selection valid when the list is refreshed or an entry is withdrawn.
  useEffect(() => {
    if (applications.length === 0) {
      setSelectedId(null)
      return
    }

    if (!applications.some((application) => application.id === selectedId)) {
      setSelectedId(applications[0].id)
    }
  }, [applications, selectedId])

  const selected = applications.find((application) => application.id === selectedId) ?? null

  const withdraw = async (application: JobApplication) => {
    const confirmed = await confirm({
      title: 'Withdraw this application?',
      description: `Your application for "${application.jobTitle}" will be removed. You can apply again later.`,
      confirmLabel: 'Withdraw',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/application/${application.id}`)
      await onRefresh()
      showSuccess('Application withdrawn.')
    } catch (error) {
      showError(errorMessage(error, 'Could not withdraw this application.'))
    }
  }

  if (applications.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.12)' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          No applications yet
        </Typography>
        <Typography sx={{ opacity: 0.6, mb: 3 }}>
          When you apply for a job it will show up here so you can track its progress.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/" sx={{ fontWeight: 800 }}>
          Find a job
        </Button>
      </Paper>
    )
  }

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
      <Paper
        sx={{
          width: { xs: '100%', md: 320 },
          flexShrink: 0,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            My applications
          </Typography>
        </Box>

        <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
          {applications.map((application) => (
            <Box
              key={application.id}
              onClick={() => setSelectedId(application.id)}
              sx={{
                p: 2,
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backgroundColor:
                  selectedId === application.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderLeft: '4px solid',
                borderLeftColor: selectedId === application.id ? 'primary.main' : 'transparent',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                transition: 'all 0.2s',
              }}
            >
              <Typography sx={{ fontWeight: 800 }}>{application.jobTitle}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                {application.companyName}
              </Typography>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Typography variant="caption" sx={{ opacity: 0.5 }}>
                  {formatDate(application.appliedAt)}
                </Typography>
                <Chip
                  label={application.status}
                  size="small"
                  color={statusColor(application.status)}
                  variant="outlined"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              </Stack>
            </Box>
          ))}
        </Box>
      </Paper>

      <Paper
        sx={{
          flex: 1,
          p: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(255,255,255,0.02)',
        }}
      >
        {!selected ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.4,
            }}
          >
            <Typography>Select an application to view its details</Typography>
          </Box>
        ) : (
          <Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
                  {selected.jobTitle}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 700 }}>
                  {selected.companyName}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button
                  variant="outlined"
                  component={RouterLink}
                  to={`/jobs/${selected.jobId}`}
                  sx={{ fontWeight: 700 }}
                >
                  View job
                </Button>
                <Button variant="outlined" color="error" onClick={() => void withdraw(selected)}>
                  Withdraw
                </Button>
              </Stack>
            </Stack>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Grid container spacing={4}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography
                  sx={{
                    opacity: 0.5,
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    mb: 0.5,
                  }}
                >
                  Status
                </Typography>
                <Chip
                  label={selected.status}
                  color={statusColor(selected.status)}
                  variant="outlined"
                  sx={{ fontWeight: 900 }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography
                  sx={{
                    opacity: 0.5,
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    mb: 0.5,
                  }}
                >
                  Applied on
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {formatDateTime(selected.appliedAt)}
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
              <Typography
                sx={{
                  opacity: 0.5,
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                Your message
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {selected.message || 'No message was attached to this application.'}
                </Typography>
              </Paper>
            </Box>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}
