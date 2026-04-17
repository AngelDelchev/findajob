import { useEffect, useState } from 'react'
import { api } from '../../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
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
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

type JobPosting = {
  id: number
  title: string
  company: string
  description: string
  location: string
  salary: string
}

const emptyJob: JobPosting = { id: 0, title: '', company: '', description: '', location: '', salary: '' }

export default function AdminJobs({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [open, setOpen] = useState(false)
  const [model, setModel] = useState<JobPosting>(emptyJob)

  const [error, setError] = useState('')

  const load = async () => {
  const res = await api.get('/jobs')
  setJobs(res.data)
}

  useEffect(() => { void load() }, [])

  const create = () => {
    setModel(emptyJob)
    setOpen(true)
  }

  const edit = (j: JobPosting) => {
    setModel(j)
    setOpen(true)
  }

  const save = async () => {
  setError('')
  if (!model.title.trim() || !model.company.trim()) {
    setError('Title and company are required.')
    return
  }

  try {
    if (model.id === 0) {
      await api.post('/jobs', model)
    } else {
      await api.put(`/jobs/${model.id}`, model)
    }
    setOpen(false)
    await load()
    await Promise.resolve(onChanged?.())
  } catch (e: any) {
    const status = e?.response?.status
    const msg = e?.response?.data?.message || 'Save failed.'
    setError(`${msg}${status ? ` (HTTP ${status})` : ''}`)
  }
}

  const remove = async (id: number) => {
  const ok = window.confirm('Delete this job?')
  if (!ok) return
  await api.delete(`/jobs/${id}`)
  await load()
  await Promise.resolve(onChanged?.())
}

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Jobs</Typography>
        <Button variant="contained" onClick={create}>Create job</Button>
      </Stack>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>ID</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Title</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Location</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800, width: 220 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map(j => (
              <TableRow key={j.id} hover>
                <TableCell>{j.id}</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>{j.title}</TableCell>
                <TableCell>{j.company}</TableCell>
                <TableCell>{j.location}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => edit(j)}>Edit</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => void remove(j.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 ? (
              <TableRow><TableCell colSpan={5}>No jobs found.</TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {model.id === 0 ? 'Create job' : `Edit job #${model.id}`}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={model.title} onChange={(e) => setModel({ ...model, title: e.target.value })} />
            <TextField label="Company" value={model.company} onChange={(e) => setModel({ ...model, company: e.target.value })} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Location" value={model.location} onChange={(e) => setModel({ ...model, location: e.target.value })} fullWidth />
              <TextField label="Salary" value={model.salary} onChange={(e) => setModel({ ...model, salary: e.target.value })} fullWidth />
            </Stack>
            <TextField
              label="Description"
              value={model.description}
              onChange={(e) => setModel({ ...model, description: e.target.value })}
              multiline
              minRows={6}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void save()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
