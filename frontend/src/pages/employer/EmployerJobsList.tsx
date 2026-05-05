import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../../api'
import { formatSalary } from '../../utils'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import JobFormFields from '../../components/JobFormFields'
import type { JobFormState } from '../../components/JobFormFields'

type JobPosting = {
  id: number
  title: string
  company: string
  description: string
  location: string
  salary: string
  jobType: string
  tags: string[]
  isDeleted?: boolean
}

export default function EmployerJobsList({ 
  jobs, 
  onRefresh 
}: { 
  jobs: JobPosting[], 
  onRefresh: () => Promise<void> 
}) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number>(0)
  const [form, setForm] = useState<JobFormState>({
    title: '',
    company: '',
    description: '',
    location: '',
    salary: '$ 0',
    jobType: 'Full-time',
    tags: [],
  })
  const [isSaving, setIsSaving] = useState(false)

  const openEdit = (job: JobPosting) => {
    setEditingId(job.id)
    setForm({
      title: job.title ?? '',
      company: job.company ?? '',
      description: job.description ?? '',
      location: job.location ?? '',
      salary: job.salary ?? '$ 0',
      jobType: job.jobType ?? 'Full-time',
      tags: job.tags ?? [],
    })
    setOpen(true)
  }

  const save = async () => {
    setIsSaving(true)
    try {
      await api.put(`/jobs/${editingId}`, { ...form, id: editingId })
      setOpen(false)
      await onRefresh()
    } catch (e) {
      console.error('Save failed:', e)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleVisibility = async (job: JobPosting) => {
    const ok = window.confirm(job.isDeleted ? 'Restore this job?' : 'Archive this job?')
    if (!ok) return
    try {
      await api.put(`/jobs/${job.id}/visibility`, { isDeleted: !job.isDeleted })
      await onRefresh()
    } catch (e) {
      console.error('Visibility toggle failed:', e)
    }
  }

  const deleteJob = async (id: number) => {
    const ok = window.confirm('Permanently delete this job?')
    if (!ok) return
    try {
      await api.delete(`/jobs/${id}`)
      await onRefresh()
    } catch (e) {
      console.error('Delete failed:', e)
    }
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {jobs.length === 0 ? (
          <Grid size={12}>
            <Paper sx={{ p: 4, textAlign: 'center', opacity: 0.6, border: '1px solid rgba(255,255,255,0.08)' }}>
              No jobs posted yet.
            </Paper>
          </Grid>
        ) : (
          jobs.map((job) => (
            <Grid size={{ xs: 12, md: 6 }} key={job.id}>
              <Paper sx={{ p: 3, height: '100%', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>{job.title}</Typography>
                  <Chip 
                    label={job.isDeleted ? 'Archived' : 'Active'} 
                    size="small" 
                    variant="outlined" 
                    color={job.isDeleted ? 'warning' : 'success'} 
                  />
                </Stack>
                <Typography sx={{ opacity: 0.8, fontWeight: 700 }}>{job.company}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.6, mt: 0.5 }}>{job.location} • {job.jobType} • {formatSalary(job.salary)}</Typography>
                
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                  {(job.tags || []).map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                  ))}
                </Stack>

                <Typography 
                  variant="body2" 
                  sx={{ 
                    mt: 1.5, 
                    opacity: 0.8, 
                    display: '-webkit-box', 
                    WebkitLineClamp: 3, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden',
                    flex: 1,
                    textAlign: 'left'
                  }}
                >
                  {job.description}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mt: 2.5, justifyContent: 'flex-start' }}>
                  <Button 
                    size="small" 
                    variant="contained" 
                    onClick={() => openEdit(job)}
                    sx={{ fontWeight: 800 }}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    component={RouterLink}
                    to={`/jobs/${job.id}`}
                    sx={{ fontWeight: 800 }}
                  >
                    Details
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    onClick={() => void toggleVisibility(job)}
                    sx={{ fontWeight: 800 }}
                  >
                    {job.isDeleted ? 'Restore' : 'Archive'}
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="error" 
                    onClick={() => void deleteJob(job.id)}
                    sx={{ fontWeight: 800 }}
                  >
                    Delete
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit Job Posting</DialogTitle>
        <DialogContent dividers>
          <JobFormFields form={form} setForm={setForm} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={isSaving} onClick={() => void save()} sx={{ fontWeight: 900, px: 4 }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
