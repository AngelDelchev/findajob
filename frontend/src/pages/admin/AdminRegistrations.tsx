import { useEffect, useState } from 'react'
import { api } from '../../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

type Registration = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
}

export default function AdminRegistrations({ onChanged }: { onChanged?: () => void }) {
  const [list, setList] = useState<Registration[]>([])

  const load = async () => {
    try {
      const res = await api.get('/admin/registrations')
      setList(res.data ?? [])
    } catch {
      setList([])
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const deleteReg = async (id: string) => {
    if (!window.confirm('Remove this registration request?')) return
    try {
      await api.delete(`/admin/registrations/${id}`)
      await load()
      onChanged?.()
    } catch (e: any) {
      alert('Delete failed.')
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Pending Registrations</Typography>
      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Email</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Name</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Role</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Requested At</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.email}</TableCell>
                <TableCell>{r.firstName} {r.lastName}</TableCell>
                <TableCell>{r.role}</TableCell>
                <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" color="error" onClick={() => void deleteReg(r.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow><TableCell colSpan={5}>No pending registrations.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
