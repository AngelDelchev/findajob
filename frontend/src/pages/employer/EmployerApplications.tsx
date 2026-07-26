import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import ProfileDialog from '../../components/ProfileDialog'
import { formatDate } from '../../utils'
import { APPLICATION_STATUSES } from '../../types'
import type { ApplicationStatus, JobApplication } from '../../types'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

type Props = {
  applications: JobApplication[]
  onRefresh: () => Promise<void>
}

export default function EmployerApplications({ applications, onRefresh }: Props) {
  const { showSuccess, showError } = useToast()
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [viewingProfileOf, setViewingProfileOf] = useState<string | null>(null)

  const updateStatus = async (id: number, status: ApplicationStatus) => {
    setUpdatingId(id)
    try {
      await api.put(`/application/${id}/status`, { status })
      await onRefresh()
      showSuccess(`Application marked as ${status.toLowerCase()}.`)
    } catch (error) {
      showError(errorMessage(error, 'Could not update the application status.'))
    } finally {
      setUpdatingId(null)
    }
  }

  const viewCv = async (id: number) => {
    try {
      // The URL points at the authorised CV endpoint; opening it sends the session
      // cookie. It used to be a direct path into wwwroot that needed no auth at all.
      const response = await api.get<{ url: string }>(`/application/${id}/cv`)
      window.open(response.data.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      showError(errorMessage(error, 'Could not open the CV.'))
    }
  }

  return (
    <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <TableContainer>
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
              applications.map((application) => (
                <TableRow key={application.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{application.jobTitle}</TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography sx={{ fontWeight: 600 }}>{application.applicantName}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {application.applicantEmail}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>
                    {formatDate(application.appliedAt)}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      {/*
                        The options come from the shared status list. This dropdown used
                        to omit "Pending", which is the status every new application
                        starts in, so a fresh row rendered with an empty selection.
                      */}
                      <Select
                        value={application.status}
                        disabled={updatingId === application.id}
                        onChange={(event) =>
                          void updateStatus(application.id, event.target.value as ApplicationStatus)
                        }
                        sx={{ fontSize: '0.85rem' }}
                        inputProps={{ 'aria-label': 'Application status' }}
                      >
                        {APPLICATION_STATUSES.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setViewingProfileOf(application.userId)}
                      >
                        Profile
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => void viewCv(application.id)}>
                        View CV
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        component={RouterLink}
                        to={`/messages?userId=${encodeURIComponent(application.userId)}`}
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
      </TableContainer>

      <ProfileDialog userId={viewingProfileOf} onClose={() => setViewingProfileOf(null)} />
    </Paper>
  )
}
