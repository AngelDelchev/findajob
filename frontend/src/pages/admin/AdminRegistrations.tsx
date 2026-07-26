import { useCallback, useEffect, useState } from 'react'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import { formatDateTime, fullName } from '../../utils'
import type { PendingRegistration } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
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

export default function AdminRegistrations({ onChanged }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [registrations, setRegistrations] = useState<PendingRegistration[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get<PendingRegistration[]>('/admin/registrations')
      setRegistrations(response.data)
    } catch (error) {
      showError(errorMessage(error, 'Could not load pending registrations.'))
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    void load()
  }, [load])

  const remove = async (registration: PendingRegistration) => {
    const confirmed = await confirm({
      title: 'Remove this registration request?',
      description: `${registration.email} will have to sign up again to create an account.`,
      confirmLabel: 'Remove',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/admin/registrations/${registration.id}`)
      await load()
      await onChanged?.()
      showSuccess('Registration request removed.')
    } catch (error) {
      showError(errorMessage(error, 'Could not remove the request.'))
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
        Pending registrations
      </Typography>
      <Typography sx={{ opacity: 0.6, mb: 2 }}>
        Sign-ups waiting for the user to confirm their email address.
      </Typography>

      <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Email</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Name</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Role</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Requested</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Expires</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 800 }}>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    Loading…
                  </TableCell>
                </TableRow>
              ) : registrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4, textAlign: 'center', opacity: 0.6 }}>
                    No pending registrations.
                  </TableCell>
                </TableRow>
              ) : (
                registrations.map((registration) => {
                  const expired = new Date(registration.expiresAt) < new Date()

                  return (
                    <TableRow key={registration.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{registration.email}</TableCell>
                      <TableCell>
                        {fullName(registration.firstName, registration.lastName) || '—'}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={registration.role} variant="outlined" />
                      </TableCell>
                      <TableCell>{formatDateTime(registration.createdAt)}</TableCell>
                      <TableCell>
                        {expired ? (
                          <Chip size="small" label="Expired" color="warning" variant="outlined" />
                        ) : (
                          formatDateTime(registration.expiresAt)
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => void remove(registration)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
