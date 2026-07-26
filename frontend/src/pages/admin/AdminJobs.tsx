import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import { formatSalary } from '../../utils'
import JobFormFields from '../../components/JobFormFields'
import type { JobFormState } from '../../components/JobFormFields'
import type { AdminJob } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

const emptyJob: JobFormState = {
  title: '',
  company: '',
  description: '',
  location: '',
  salary: '$ 0',
  jobType: 'Full-time',
  tags: [],
}

type Props = {
  onChanged?: () => void | Promise<void>
}

export default function AdminJobs({ onChanged }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState(0)
  const [form, setForm] = useState<JobFormState>(emptyJob)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get<AdminJob[]>('/admin/jobs')
      setJobs(response.data)
    } catch (err) {
      showError(errorMessage(err, 'Could not load jobs.'))
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    void load()
  }, [load])

  const create = () => {
    setError('')
    setEditingId(0)
    setForm(emptyJob)
    setOpen(true)
  }

  const edit = (job: AdminJob) => {
    setError('')
    setEditingId(job.id)
    setForm({
      title: job.title ?? '',
      company: job.company ?? '',
      description: job.description ?? '',
      location: job.location ?? '',
      salary: job.salary || '$ 0',
      jobType: job.jobType ?? 'Full-time',
      // The list endpoint now returns the real tags. It used to project the
      // [NotMapped] Tags property, which was always empty, so saving from this
      // dialog silently removed every tag the posting had.
      tags: job.tags ?? [],
    })
    setOpen(true)
  }

  const save = async () => {
    setError('')

    if (!form.title.trim() || !form.company.trim()) {
      setError('A title and company are required.')
      return
    }

    setSaving(true)
    try {
      if (editingId === 0) {
        await api.post('/jobs', form)
      } else {
        await api.put(`/jobs/${editingId}`, form)
      }

      setOpen(false)
      await load()
      await onChanged?.()
      showSuccess(editingId === 0 ? 'Job created.' : 'Job updated.')
    } catch (err) {
      setError(errorMessage(err, 'Could not save this job.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = async (job: AdminJob) => {
    const archiving = !job.isDeleted

    const confirmed = await confirm({
      title: archiving ? 'Archive this job?' : 'Restore this job?',
      description: archiving
        ? 'It will stop appearing in search results. Existing applications are kept.'
        : 'It will appear in search results again.',
      confirmLabel: archiving ? 'Archive' : 'Restore',
    })

    if (!confirmed) return

    try {
      await api.put(`/admin/jobs/${job.id}/visibility`, { isDeleted: archiving })
      await load()
      await onChanged?.()
      showSuccess(archiving ? 'Job archived.' : 'Job restored.')
    } catch (err) {
      showError(errorMessage(err, 'Could not change visibility.'))
    }
  }

  const remove = async (job: AdminJob) => {
    const confirmed = await confirm({
      title: 'Delete this job permanently?',
      description: `"${job.title}" and every application submitted to it will be removed. Archiving is usually the better option.`,
      confirmLabel: 'Delete permanently',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/admin/jobs/${job.id}`)
      await load()
      await onChanged?.()
      showSuccess('Job deleted.')
    } catch (err) {
      showError(errorMessage(err, 'Could not delete this job.'))
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Jobs
        </Typography>
        <Button variant="contained" onClick={create} sx={{ fontWeight: 800 }}>
          Create job
        </Button>
      </Stack>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>ID</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Title</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Type</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Salary</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Tags</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800, width: 260 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    Loading…
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job.id} hover>
                    <TableCell>{job.id}</TableCell>
                    <TableCell sx={{ fontWeight: 900 }}>{job.title}</TableCell>
                    <TableCell>{job.company}</TableCell>
                    <TableCell>
                      <Chip
                        label={job.jobType}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {formatSalary(job.salary)}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {job.tags.slice(0, 3).map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            sx={{ height: 18, fontSize: '0.6rem' }}
                          />
                        ))}
                        {job.tags.length > 3 ? (
                          <Chip
                            label={`+${job.tags.length - 3}`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.6rem' }}
                          />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={job.isDeleted ? 'Archived' : 'Active'}
                        color={job.isDeleted ? 'warning' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => edit(job)}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color={job.isDeleted ? 'success' : 'warning'}
                          onClick={() => void toggleVisibility(job)}
                        >
                          {job.isDeleted ? 'Restore' : 'Archive'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => void remove(job)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {editingId === 0 ? 'Create job' : `Edit job #${editingId}`}
        </DialogTitle>
        <DialogContent dividers>
          <JobFormFields form={form} setForm={setForm} />
          {error ? (
            <Typography color="error" sx={{ fontWeight: 700, mt: 2 }}>
              {error}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void save()}
            sx={{ px: 4, fontWeight: 900 }}
          >
            {saving ? 'Saving…' : 'Save job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
