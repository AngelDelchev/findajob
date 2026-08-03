import { useMemo, useState } from 'react'
import { api, errorMessage } from '../api'
import { useToast } from '../toast'
import { isPasswordValid, passwordChecks } from '../constants'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

type Props = {
  open: boolean
  onClose: () => void
}

/**
 * Lets a signed-in user change their own password.
 *
 * The only way to change a password used to be not having one — there was no reset
 * flow and no change form, so a password was whatever it had been at sign-up.
 */
export default function ChangePasswordDialog({ open, onClose }: Props) {
  const { showSuccess } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const checks = useMemo(
    () => passwordChecks(newPassword, confirmPassword),
    [newPassword, confirmPassword]
  )

  const close = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    onClose()
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      })

      showSuccess('Your password has been changed.')
      close()
    } catch (err) {
      setError(errorMessage(err, 'Could not change your password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={submit}>
        <DialogTitle sx={{ fontWeight: 900 }}>Change password</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
              fullWidth
            />
            <TextField
              label="New password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              required
              fullWidth
            />
            <TextField
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              fullWidth
            />

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: 'rgba(255,255,255,0.02)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.6 }}>
                PASSWORD REQUIREMENTS
              </Typography>
              <Stack sx={{ mt: 1 }} spacing={0.5}>
                {checks.map((check) => (
                  <Stack key={check.label} direction="row" spacing={1} alignItems="center">
                    {check.ok ? (
                      <CheckCircleIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: '1rem', opacity: 0.3 }} />
                    )}
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, opacity: check.ok ? 1 : 0.55 }}
                    >
                      {check.label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={close} sx={{ fontWeight: 800 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              saving || !currentPassword || !isPasswordValid(newPassword, confirmPassword)
            }
            sx={{ fontWeight: 900, px: 3 }}
          >
            {saving ? 'Saving…' : 'Change password'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
