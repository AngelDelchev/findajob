import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../../api'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

type Application = {
  id: number
  jobTitle: string
  applicantName: string
  applicantEmail: string
  appliedAt: string
  status: string
  message: string
  userId: string
}

export default function EmployerApplications({ 
  applications, 
  onRefresh 
}: { 
  applications: Application[], 
  onRefresh: () => Promise<void> 
}) {
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id)
    try {
      await api.put(`/application/${id}/status`, { status })
      await onRefresh()
    } catch (e) {
      console.error('Status update failed:', e)
    } finally {
      setUpdatingId(null)
    }
  }

  const viewCv = async (id: number) => {
    try {
      const res = await api.get(`/application/${id}/cv`)
      const { url } = res.data
      if (url) {
        window.open(url, '_blank')
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to open CV.')
    }
  }

  return (
    <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>Job</TableCell>
            <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>Applicant</TableCell>
            <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>Applied</TableCell>
            <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 800, color: 'primary.main' }}>Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {applications.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                No applications yet.
              </TableCell>
            </TableRow>
          ) : (
            applications.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{a.jobTitle}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography sx={{ fontWeight: 600 }}>{a.applicantName}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>{a.applicantEmail}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: '0.85rem' }}>
                  {new Date(a.appliedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <Select
                      value={a.status || 'Applied'}
                      disabled={updatingId === a.id}
                      onChange={(e) => void updateStatus(a.id, e.target.value)}
                      sx={{ fontSize: '0.85rem' }}
                    >
                      <MenuItem value="Applied">Applied</MenuItem>
                      <MenuItem value="Reviewed">Reviewed</MenuItem>
                      <MenuItem value="Interviewing">Interviewing</MenuItem>
                      <MenuItem value="Accepted">Accepted</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void viewCv(a.id)}
                    >
                      View CV
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      component={RouterLink}
                      to={`/messages?userId=${encodeURIComponent(a.userId)}`}
                    >
                      Message
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  )
}
