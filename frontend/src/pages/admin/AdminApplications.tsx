import { useState } from 'react'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import { ListPagination, ListSearch } from '../../components/ListControls'
import { usePagedList } from '../../usePagedList'
import { formatDate, formatDateTime } from '../../utils'
import { APPLICATION_STATUSES } from '../../types'
import type { ApplicationStatus, JobApplication } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
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
  onChanged?: () => void | Promise<void>
}

export default function AdminApplications({ onChanged }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [selected, setSelected] = useState<JobApplication | null>(null)

  const {
    items: applications,
    page,
    setPage,
    total,
    totalPages,
    loading,
    applySearch,
    reload,
    reloadAfterRemoval,
  } = usePagedList<JobApplication>('/admin/applications', showError)

  const updateStatus = async (id: number, status: ApplicationStatus) => {
    try {
      await api.put(`/admin/applications/${id}/status`, { status })
      reload()
      await onChanged?.()
      showSuccess('Status updated.')
    } catch (error) {
      showError(errorMessage(error, 'Could not update the status.'))
    }
  }

  const remove = async (application: JobApplication) => {
    const confirmed = await confirm({
      title: 'Delete this application?',
      description: `${application.applicantName}'s application for "${application.jobTitle}" will be permanently removed.`,
      confirmLabel: 'Delete',
      destructive: true,
    })

    if (!confirmed) return

    try {
      // Note the plural: this used to call /admin/application/{id}, which does not
      // exist, so deleting an application always failed with a 404.
      await api.delete(`/admin/applications/${application.id}`)
      reloadAfterRemoval()
      await onChanged?.()
      showSuccess('Application deleted.')
    } catch (error) {
      showError(errorMessage(error, 'Could not delete the application.'))
    }
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Applications
        </Typography>
        <ListSearch placeholder="Search by job, company or applicant" onSearch={applySearch} />
      </Stack>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Job</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Company</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Applicant</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Applied</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800, width: 200 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    Loading…
                  </TableCell>
                </TableRow>
              ) : applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    No applications found.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((application) => (
                  <TableRow key={application.id} hover>
                    <TableCell sx={{ fontWeight: 900 }}>{application.jobTitle}</TableCell>
                    <TableCell>{application.companyName}</TableCell>
                    <TableCell>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {application.applicantName}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                          {application.applicantEmail}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{formatDate(application.appliedAt)}</TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={application.status}
                        onChange={(event) =>
                          void updateStatus(application.id, event.target.value as ApplicationStatus)
                        }
                        sx={{ fontSize: '0.8rem', minWidth: 130 }}
                        inputProps={{ 'aria-label': 'Application status' }}
                      >
                        {APPLICATION_STATUSES.map((status) => (
                          <MenuItem key={status} value={status}>
                            {status}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => setSelected(application)}>
                          View
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => void remove(application)}
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

        <ListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          noun="application"
          onChange={setPage}
        />
      </Paper>

      <Dialog open={selected !== null} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Application details</DialogTitle>
        <DialogContent dividers>
          {selected ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 900 }}>{selected.jobTitle}</Typography>
                <Typography sx={{ opacity: 0.8 }}>{selected.companyName}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800 }}>
                  APPLICANT
                </Typography>
                <Typography>
                  <b>{selected.applicantName}</b> — {selected.applicantEmail}
                </Typography>
              </Box>

              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800 }}>
                    STATUS
                  </Typography>
                  <Box>
                    <Chip size="small" label={selected.status} variant="outlined" color="primary" />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800 }}>
                    APPLIED
                  </Typography>
                  <Typography variant="body2">{formatDateTime(selected.appliedAt)}</Typography>
                </Box>
              </Stack>

              <Box>
                <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800 }}>
                  MESSAGE
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                  {selected.message || 'No message was attached.'}
                </Typography>
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
