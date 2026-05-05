import { useEffect, useState } from 'react'
import { api } from '../../api'
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
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
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

const emptyJob: JobFormState = {
  title: '',
  company: '',
  description: '',
  location: '',
  salary: '$ 0',
  jobType: 'Full-time',
  tags: [],
}

export default function AdminJobs({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number>(0)
  const [form, setForm] = useState<JobFormState>(emptyJob)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await api.get('/admin/jobs')
    setJobs(res.data ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  const create = () => {
    setError('')
    setEditingId(0)
    setForm(emptyJob)
    setOpen(true)
  }

  const edit = (job: JobPosting) => {
    setError('')
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
    setError('')
    if (!form.title.trim() || !form.company.trim()) {
      setError('Title and company are required.')
      return
    }

    setSaving(true)
    try {
      if (editingId === 0) {
        await api.post('/jobs', form)
      } else {
        await api.put(`/jobs/${editingId}`, { ...form, id: editingId })
      }

      setOpen(false)
      await load()
      await Promise.resolve(onChanged?.())
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const toggleVisibility = async (job: JobPosting) => {
    const nextIsDeleted = !job.isDeleted
    const ok = window.confirm(nextIsDeleted ? 'Archive this job?' : 'Restore this job?')
    if (!ok) return

    await api.put(`/admin/jobs/${job.id}/visibility`, { isDeleted: nextIsDeleted })
    await load()
    await Promise.resolve(onChanged?.())
  }

  const deleteJob = async (id: number) => {
    const ok = window.confirm('Delete this job permanently?')
    if (!ok) return
    try {
      await api.delete(`/admin/jobs/${id}`)
      await load()
      await Promise.resolve(onChanged?.())
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Delete failed.')
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Jobs</Typography>
        <Button variant="contained" onClick={create} sx={{ fontWeight: 800 }}>Create job</Button>
      </Stack>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>ID</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Title</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Type</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Salary</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800, width: 280 }}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} hover>
                <TableCell>{job.id}</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>{job.title}</TableCell>
                <TableCell>{job.company}</TableCell>
                <TableCell><Chip label={job.jobType} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} /></TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{job.salary}</TableCell>
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
                    <Button size="small" variant="outlined" onClick={() => edit(job)}>Edit</Button>
                    <Button size="small" variant="outlined" color={job.isDeleted ? 'success' : 'warning'} onClick={() => void toggleVisibility(job)}>
                      {job.isDeleted ? 'Restore' : 'Archive'}
                    </Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => void deleteJob(job.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 ? <TableRow><TableCell colSpan={7} sx={{ py: 4, textAlign: 'center' }}>No jobs found.</TableCell></TableRow> : null}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>{editingId === 0 ? 'Create job' : `Edit job #${editingId}`}</DialogTitle>
        <DialogContent dividers>
          <JobFormFields form={form} setForm={setForm} />
          {error && <Typography color="error" sx={{ fontWeight: 700, mt: 2 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
          <Button variant="contained" disabled={saving} onClick={() => void save()} sx={{ px: 4, fontWeight: 900 }}>
            {saving ? 'Saving...' : 'Save Job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
