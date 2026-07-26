import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { formatDate, formatSalary } from '../../utils'
import type { SavedJob } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type Props = {
  savedJobs: SavedJob[]
  onRefresh: () => Promise<void>
}

export default function EmployeeSavedJobs({ savedJobs, onRefresh }: Props) {
  const { showSuccess, showError } = useToast()

  const unsave = async (jobId: number) => {
    try {
      await api.delete(`/savedjobs/${jobId}`)
      await onRefresh()
      showSuccess('Removed from saved jobs.')
    } catch (error) {
      showError(errorMessage(error, 'Could not remove this job.'))
    }
  }

  if (savedJobs.length === 0) {
    return (
      <Paper
        sx={{ p: 6, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.12)' }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          Nothing saved yet
        </Typography>
        <Typography sx={{ opacity: 0.6, mb: 3 }}>
          Save a posting while browsing and it will show up here.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/" sx={{ fontWeight: 800 }}>
          Browse jobs
        </Button>
      </Paper>
    )
  }

  return (
    <Grid container spacing={2}>
      {savedJobs.map((item) => {
        // The posting can be missing if an administrator deleted it outright. The
        // list used to inner-join, so those entries vanished with no explanation.
        const job = item.job

        return (
          <Grid size={12} key={item.id}>
            <Paper
              sx={{
                p: 2.5,
                border: '1px solid rgba(255,255,255,0.08)',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
                transition: 'background-color 0.2s',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={2}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {job?.title ?? 'This posting is no longer available'}
                    </Typography>
                    {job?.isDeleted ? (
                      <Chip
                        size="small"
                        label="Archived"
                        color="warning"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                      />
                    ) : null}
                    {!job ? (
                      <Chip
                        size="small"
                        label="Removed"
                        color="error"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                      />
                    ) : null}
                  </Stack>

                  {job ? (
                    <>
                      <Typography sx={{ fontWeight: 700, opacity: 0.8 }}>{job.company}</Typography>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ mt: 0.5, opacity: 0.6, fontSize: '0.85rem', flexWrap: 'wrap' }}
                      >
                        <Typography variant="body2">{job.location}</Typography>
                        <Typography variant="body2">•</Typography>
                        <Typography variant="body2">{formatSalary(job.salary)}</Typography>
                      </Stack>
                    </>
                  ) : null}
                </Box>

                <Stack direction="row" spacing={1}>
                  {job ? (
                    <Button
                      variant="contained"
                      size="small"
                      component={RouterLink}
                      to={`/jobs/${item.jobPostingId}`}
                      sx={{ fontWeight: 800 }}
                    >
                      View details
                    </Button>
                  ) : null}
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => void unsave(item.jobPostingId)}
                  >
                    Remove
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.05)' }} />
              <Typography variant="caption" sx={{ opacity: 0.4 }}>
                Saved on {formatDate(item.savedAt)}
              </Typography>
            </Paper>
          </Grid>
        )
      })}
    </Grid>
  )
}
