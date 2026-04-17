import { useEffect, useState } from 'react'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

type MyApp = {
  id: number
  jobId: number
  jobTitle: string
  companyName: string
  message: string
  appliedAt: string
  status?: string | null
}

export default function Employee() {
  const [apps, setApps] = useState<MyApp[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await api.get('/applications/mine')
    setApps(res.data)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
        Employee Dashboard
      </Typography>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Job</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Applied</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5}>Loading…</TableCell></TableRow>
            ) : apps.length === 0 ? (
              <TableRow><TableCell colSpan={5}>No applications yet.</TableCell></TableRow>
            ) : (
              apps.map(a => (
                <TableRow key={a.id} hover>
                  <TableCell sx={{ fontWeight: 900 }}>{a.jobTitle}</TableCell>
                  <TableCell>{a.companyName}</TableCell>
                  <TableCell>{new Date(a.appliedAt).toLocaleDateString()}</TableCell>
                  <TableCell>{a.status ?? 'Pending'}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => alert(a.message || '(no message)')}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={() => void load()}>Refresh</Button>
      </Stack>
    </Box>
  )
}
