import { Link as RouterLink } from 'react-router-dom'
import { api } from '../../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type SavedJob = {
  id: number
  jobPostingId: number
  job: {
    id: number
    title: string
    company: string
    salary: string
    location: string
    isDeleted?: boolean
  }
  savedAt: string
}

export default function EmployeeSavedJobs({ 
  savedJobs, 
  onRefresh 
}: { 
  savedJobs: SavedJob[], 
  onRefresh: () => Promise<void> 
}) {
  const unsave = async (jobId: number) => {
    try {
      await api.delete(`/savedjobs/${jobId}`)
      await onRefresh()
    } catch (e) {
      console.error('Unsave failed:', e)
    }
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {savedJobs.length === 0 ? (
          <Grid size={12}>
            <Paper sx={{ p: 4, textAlign: 'center', opacity: 0.6, border: '1px solid rgba(255,255,255,0.08)' }}>
              You haven't saved any jobs yet.
            </Paper>
          </Grid>
        ) : (
          savedJobs.map((item) => (
            <Grid size={12} key={item.id}>
              <Paper sx={{ p: 2.5, border: '1px solid rgba(255,255,255,0.08)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' }, transition: 'background-color 0.2s' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {item.job?.title || 'Unknown Position'}
                      </Typography>
                      {item.job?.isDeleted && (
                        <Chip size="small" label="Archived" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />
                      )}
                    </Stack>
                    <Typography sx={{ fontWeight: 700, opacity: 0.8 }}>
                      {item.job?.company || 'Unknown Company'}
                    </Typography>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, opacity: 0.6, fontSize: '0.85rem' }}>
                      <Typography>{item.job?.location}</Typography>
                      <Typography>•</Typography>
                      <Typography>{item.job?.salary}</Typography>
                    </Stack>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button 
                      variant="contained" 
                      size="small" 
                      component={RouterLink} 
                      to={`/jobs/${item.jobPostingId}`}
                      sx={{ fontWeight: 800 }}
                    >
                      View Details
                    </Button>
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
                  Saved on {new Date(item.savedAt).toLocaleDateString()}
                </Typography>
              </Paper>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  )
}
