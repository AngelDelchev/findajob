import { useEffect, useState } from 'react'
import { api } from '../../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

type AdminUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  companyName?: string | null
  professionalTitle?: string | null
  roles: string[]
  isDisabled: boolean
}

const ALL_ROLES = ['Admin', 'Employer', 'Employee'] as const

export default function AdminUsers({ onChanged }: { onChanged?: () => void | Promise<void> }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [open, setOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const load = async () => {
    const res = await api.get('/admin/users')
    setUsers(res.data)
  }

  useEffect(() => {
    void load()
  }, [])

  const openRoles = (u: AdminUser) => {
    setSelectedUser(u)
    setSelectedRoles(u.roles ?? [])
    setOpen(true)
  }

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => (prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]))
  }

  const saveRoles = async () => {
    if (!selectedUser) return
    await api.put(`/admin/users/${selectedUser.id}/roles`, { roles: selectedRoles })
    setOpen(false)
    await load()
    await Promise.resolve(onChanged?.())
  }

  const toggleDisable = async (u: AdminUser) => {
    await api.put(`/admin/users/${u.id}/status`, { disabled: !u.isDisabled })
    await load()
    await Promise.resolve(onChanged?.())
  }

  const deleteUser = async (id: string) => {
    const ok = window.confirm('Delete this user permanently? This cannot be undone.')
    if (!ok) return
    await api.delete(`/admin/users/${id}`)
    await load()
    await Promise.resolve(onChanged?.())
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Users</Typography>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Email</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Name</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company / Title</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Roles</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800, width: 260 }}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users.map(u => (
              <TableRow key={u.id} hover>
                <TableCell sx={{ fontWeight: 800 }}>
                  {u.email} {u.isDisabled ? <Chip size="small" label="Disabled" sx={{ ml: 1 }} /> : null}
                </TableCell>
                <TableCell>{(u.firstName || '') + ' ' + (u.lastName || '')}</TableCell>
                <TableCell>{u.companyName ? u.companyName : u.professionalTitle ? u.professionalTitle : '-'}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {(u.roles ?? []).map(r => (
                      <Chip key={r} size="small" label={r} variant="outlined" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" color="error" onClick={() => void deleteUser(u.id)}>Delete</Button>
                    <Button size="small" variant="outlined" onClick={() => openRoles(u)}>Edit roles</Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color={u.isDisabled ? 'success' : 'warning'}
                      onClick={() => void toggleDisable(u)}
                    >
                      {u.isDisabled ? 'Enable' : 'Disable'}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 ? (
              <TableRow><TableCell colSpan={5}>No users found.</TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Edit roles {selectedUser ? `— ${selectedUser.email}` : ''}
        </DialogTitle>
        <DialogContent>
          <Stack sx={{ mt: 1 }}>
            {ALL_ROLES.map(r => (
              <FormControlLabel
                key={r}
                control={<Checkbox checked={selectedRoles.includes(r)} onChange={() => toggleRole(r)} />}
                label={r}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveRoles()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
