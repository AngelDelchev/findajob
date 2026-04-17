import { useEffect, useState } from 'react'
import { api } from '../api'
import { Link as RouterLink } from 'react-router-dom'
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
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

type AppItem = {
  id: number
  jobId: number
  jobTitle: string
  companyName: string
  applicantName: string
  applicantEmail: string
  message: string
  appliedAt: string
  status?: string | null
}

const STATUSES = ['Pending', 'Reviewed', 'Accepted', 'Rejected'] as const

export default function Employer() {
  const [apps, setApps] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await api.get('/applications/employer')
    setApps(res.data)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const setStatus = async (id: number, status: string) => {
    await api.put(`/applications/${id}/status`, { status })
    await load()
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Employer Dashboard
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button component={RouterLink} to="/employer/jobs" variant="contained">
            My Jobs
          </Button>
          <Button variant="outlined" onClick={() => void load()}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Job</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Applicant</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Applied</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Message</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading…</TableCell>
              </TableRow>
            ) : apps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No applications yet.</TableCell>
              </TableRow>
            ) : (
              apps.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell sx={{ fontWeight: 900 }}>{a.jobTitle}</TableCell>
                  <TableCell>{a.applicantEmail}</TableCell>
                  <TableCell>{new Date(a.appliedAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={(a.status ?? 'Pending') as any}
                      onChange={(e) => void setStatus(a.id, String(e.target.value))}
                      sx={{ minWidth: 160 }}
                    >
                      {STATUSES.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => window.alert(a.message || '(no message)')}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
