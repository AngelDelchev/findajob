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

type AdminApp = {
  id: number
  userId: string
  jobId: number
  jobTitle: string
  companyName: string
  applicantName: string
  applicantEmail: string
  message: string
  appliedAt: string
  status?: string | null
}

export default function AdminApplications({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [apps, setApps] = useState<AdminApp[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<AdminApp | null>(null)

  // User Edit State
  const [userEditOpen, setUserEditOpen] = useState(false)
  const [userForm, setUserForm] = useState({ id: '', firstName: '', lastName: '', email: '' })
  const [isSavingUser, setIsSavingUser] = useState(false)

  const load = async () => {
    const res = await api.get('/admin/applications')
    setApps(res.data)
  }

  useEffect(() => { void load() }, [])

  const view = (a: AdminApp) => {
    setSelected(a)
    setOpen(true)
  }

  const openEditUser = (a: AdminApp) => {
    const [first, ...last] = (a.applicantName || '').split(' ')
    setUserForm({
      id: a.userId,
      firstName: first || '',
      lastName: last.join(' ') || '',
      email: a.applicantEmail || ''
    })
    setUserEditOpen(true)
  }

  const saveUser = async () => {
    setIsSavingUser(true)
    try {
      await api.put(`/admin/users/${userForm.id}`, {
        firstName: userForm.firstName,
        lastName: userForm.lastName,
        email: userForm.email
      })
      setUserEditOpen(false)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to save user.')
    } finally {
      setIsSavingUser(false)
    }
  }

  const remove = async (id: number) => {
    const ok = window.confirm('Delete this application?')
    if (!ok) return
    await api.delete(`/admin/application/${id}`)
    await load()
    await Promise.resolve(onChanged?.())
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Applications</Typography>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Job</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Applicant</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Date</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800, width: 280 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apps.map(a => (
              <TableRow key={a.id} hover>
                <TableCell sx={{ fontWeight: 900 }}>{a.jobTitle}</TableCell>
                <TableCell>{a.companyName}</TableCell>
                <TableCell>{a.applicantEmail}</TableCell>
                <TableCell>{new Date(a.appliedAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => view(a)}>View App</Button>
                    <Button size="small" variant="outlined" onClick={() => openEditUser(a)}>Edit User</Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => void remove(a.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {apps.length === 0 ? (
              <TableRow><TableCell colSpan={5}>No applications found.</TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Application details</DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontWeight: 900 }}>{selected.jobTitle}</Typography>
              <Typography sx={{ opacity: 0.8 }}>{selected.companyName}</Typography>
              <Typography sx={{ mt: 2, opacity: 0.8 }}>
                <b>{selected.applicantName}</b> — {selected.applicantEmail}
              </Typography>
              <Typography sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{selected.message}</Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={userEditOpen} onClose={() => setUserEditOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit User Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="First Name" value={userForm.firstName} onChange={(e) => setUserForm({...userForm, firstName: e.target.value})} fullWidth />
            <TextField label="Last Name" value={userForm.lastName} onChange={(e) => setUserForm({...userForm, lastName: e.target.value})} fullWidth />
            <TextField label="Email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserEditOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={isSavingUser} onClick={() => void saveUser()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
