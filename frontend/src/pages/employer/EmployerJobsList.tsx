import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import { formatSalary } from '../../utils'
import JobFormFields from '../../components/JobFormFields'
import { emptyJobForm, jobFormFrom, toJobRequest } from '../../jobForm'
import type { JobFormState } from '../../jobForm'
import type { JobPosting } from '../../types'
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

type Props = {
  jobs: JobPosting[]
  onRefresh: () => Promise<void>
}

export default function EmployerJobsList({ jobs, onRefresh }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<JobFormState>(emptyJobForm)

  const openEdit = (job: JobPosting) => {
    setError('')
    setEditingId(job.id)
    // Every field is copied across, because saving replaces the whole posting.
    setForm(jobFormFrom(job))
    setOpen(true)
  }

  const save = async () => {
    setError('')

    if (!form.title.trim() || !form.description.trim()) {
      setError('A title and description are required.')
      return
    }

    setSaving(true)
    try {
      await api.put(`/jobs/${editingId}`, toJobRequest(form))
      setOpen(false)
      await onRefresh()
      showSuccess('Job updated.')
    } catch (err) {
      setError(errorMessage(err, 'Could not save this job.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = async (job: JobPosting) => {
    const archiving = !job.isDeleted

    const confirmed = await confirm({
      title: archiving ? 'Archive this job?' : 'Restore this job?',
      description: archiving
        ? 'It will stop appearing in search results. Applications you have already received are kept.'
        : 'It will appear in search results again.',
      confirmLabel: archiving ? 'Archive' : 'Restore',
    })

    if (!confirmed) return

    try {
      await api.put(`/jobs/${job.id}/visibility`, { isDeleted: archiving })
      await onRefresh()
      showSuccess(archiving ? 'Job archived.' : 'Job restored.')
    } catch (err) {
      showError(errorMessage(err, 'Could not change visibility.'))
    }
  }

  if (jobs.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.12)' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
          No postings yet
        </Typography>
        <Typography sx={{ opacity: 0.6 }}>
          Use “Post a job” above to publish your first opening.
        </Typography>
      </Paper>
    )
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {jobs.map((job) => (
          <Grid size={{ xs: 12, md: 6 }} key={job.id}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                sx={{ mb: 1, gap: 1 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  {job.title}
                </Typography>
                <Chip
                  label={job.isDeleted ? 'Archived' : 'Active'}
                  size="small"
                  variant="outlined"
                  color={job.isDeleted ? 'warning' : 'success'}
                  sx={{ flexShrink: 0 }}
                />
              </Stack>

              <Typography sx={{ opacity: 0.8, fontWeight: 700 }}>{job.company}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.6, mt: 0.5 }}>
                {[job.location, job.jobType, formatSalary(job.salary)].filter(Boolean).join(' • ')}
              </Typography>

              {job.tags.length > 0 ? (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                  {job.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                    />
                  ))}
                </Stack>
              ) : null}

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
                }}
              >
                {job.description}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1 }}>
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
                  Preview
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color={job.isDeleted ? 'success' : 'warning'}
                  onClick={() => void toggleVisibility(job)}
                  sx={{ fontWeight: 800 }}
                >
                  {job.isDeleted ? 'Restore' : 'Archive'}
                </Button>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit job posting</DialogTitle>
        <DialogContent dividers>
          <JobFormFields form={form} setForm={setForm} />
          {error ? (
            <Typography color="error" sx={{ fontWeight: 700, mt: 2 }}>
              {error}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void save()}
            sx={{ fontWeight: 900, px: 4 }}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
