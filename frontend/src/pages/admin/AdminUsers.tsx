import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import ProfileDialog from '../../components/ProfileDialog'
import { fullName } from '../../utils'
import type { AdminUser, Role } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

const ALL_ROLES: Role[] = ['Admin', 'Employer', 'Employee']

type Props = {
  onChanged?: () => void | Promise<void>
}

export default function AdminUsers({ onChanged }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([])
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [viewingProfileOf, setViewingProfileOf] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get<AdminUser[]>('/admin/users')
      setUsers(response.data)
    } catch (error) {
      showError(errorMessage(error, 'Could not load users.'))
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    void load()
  }, [load])

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setSelectedRoles(user.roles ?? [])
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
    })
  }

  const toggleRole = (role: Role) => {
    setSelectedRoles((previous) =>
      previous.includes(role) ? previous.filter((r) => r !== role) : [...previous, role]
    )
  }

  const save = async () => {
    if (!editing) return

    setSaving(true)
    try {
      await api.put(`/admin/users/${editing.id}`, form)
      await api.put(`/admin/users/${editing.id}/roles`, { roles: selectedRoles })

      setEditing(null)
      await load()
      await onChanged?.()
      showSuccess('User updated.')
    } catch (error) {
      showError(errorMessage(error, 'Could not save this user.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleDisabled = async (user: AdminUser) => {
    try {
      await api.put(`/admin/users/${user.id}/status`, { disabled: !user.isDisabled })
      await load()
      await onChanged?.()
      showSuccess(user.isDisabled ? 'User enabled.' : 'User disabled.')
    } catch (error) {
      showError(errorMessage(error, 'Could not change the account status.'))
    }
  }

  const remove = async (user: AdminUser) => {
    const confirmed = await confirm({
      title: 'Delete this user?',
      description: `${user.email} and all of their applications, messages and uploads will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete permanently',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/admin/users/${user.id}`)
      await load()
      await onChanged?.()
      showSuccess('User deleted.')
    } catch (error) {
      showError(errorMessage(error, 'Could not delete this user.'))
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
        Users
      </Typography>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Email</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company / title</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Roles</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800, width: 340 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    Loading…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ fontWeight: 800 }}>
                      {user.email}
                      {user.isDisabled ? (
                        <Chip size="small" label="Disabled" color="warning" sx={{ ml: 1 }} />
                      ) : null}
                    </TableCell>
                    <TableCell>{fullName(user.firstName, user.lastName) || '—'}</TableCell>
                    <TableCell>{user.companyName || user.professionalTitle || '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {(user.roles ?? []).map((role) => (
                          <Chip key={role} size="small" label={role} variant="outlined" />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setViewingProfileOf(user.id)}
                        >
                          Profile
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => openEdit(user)}>
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color={user.isDisabled ? 'success' : 'warning'}
                          onClick={() => void toggleDisabled(user)}
                        >
                          {user.isDisabled ? 'Enable' : 'Disable'}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => void remove(user)}
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

      <ProfileDialog userId={viewingProfileOf} onClose={() => setViewingProfileOf(null)} />

      <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Edit user{editing ? ` — ${editing.email}` : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="First name"
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              fullWidth
            />
            <TextField
              label="Last name"
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              helperText="Changing this also changes the username used to sign in."
              fullWidth
            />

            <Box>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Roles</Typography>
              {ALL_ROLES.map((role) => (
                <FormControlLabel
                  key={role}
                  control={
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                  }
                  label={role}
                />
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saving || selectedRoles.length === 0}
            onClick={() => void save()}
            sx={{ fontWeight: 800, px: 3 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
