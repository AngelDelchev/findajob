import { useEffect, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

type JobPosting = {
  id: number
  title: string
  company: string
  description: string
  location: string
  salary: string
}

const emptyJob: JobPosting = { id: 0, title: '', company: '', description: '', location: '', salary: '' }

export default function EmployerJobs() {
  const [tab, setTab] = useState(0)

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>My Jobs</Typography>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label="My jobs" />
          <Tab label="Create job" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {tab === 0 ? <MyJobsTab /> : null}
        {tab === 1 ? <CreateJobTab onCreated={() => setTab(0)} /> : null}
      </Box>
    </Box>
  )
}

function MyJobsTab() {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [model, setModel] = useState<JobPosting>(emptyJob)

  const load = async () => {
    setLoading(true)
    const res = await api.get('/jobs/mine')
    setJobs(res.data)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const openEdit = (job: JobPosting) => {
    setModel(job)
    setOpen(true)
  }

  const save = async () => {
    await api.put(`/jobs/${model.id}`, { ...model })
    setOpen(false)
    await load()
  }

  const remove = async (id: number) => {
    const ok = window.confirm('Delete this job?')
    if (!ok) return
    await api.delete(`/jobs/${id}`)
    await load()
  }

  return (
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
          {loading ? (
            <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>
          ) : jobs.length === 0 ? (
            <TableRow><TableCell colSpan={5}>No jobs yet. Create one in the next tab.</TableCell></TableRow>
          ) : (
            jobs.map(j => (
              <TableRow key={j.id} hover>
                <TableCell>{j.id}</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>{j.title}</TableCell>
                <TableCell>{j.company}</TableCell>
                <TableCell>{j.location}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => openEdit(j)}>Edit</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => void remove(j.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit job #{model.id}</DialogTitle>
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
              minRows={5}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void save()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

function CreateJobTab({ onCreated }: { onCreated: () => void }) {
  const [model, setModel] = useState<JobPosting>(emptyJob)
  const [saving, setSaving] = useState(false)

  const create = async () => {
    if (!model.title.trim() || !model.company.trim()) return
    setSaving(true)
    try {
      await api.post('/jobs', {
        title: model.title,
        company: model.company,
        description: model.description,
        location: model.location,
        salary: model.salary
      })
      setModel(emptyJob)
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Create job</Typography>

      <Stack spacing={2}>
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

        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" disabled={saving} onClick={() => void create()}>
            {saving ? 'Creating…' : 'Create job'}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
