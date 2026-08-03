import { useMemo, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { isPasswordValid, passwordChecks } from '../constants'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function ResetPassword() {
  const [params] = useSearchParams()

  // useSearchParams decodes for us, so these are the raw values the email carried.
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const checks = useMemo(
    () => passwordChecks(password, confirmPassword),
    [password, confirmPassword]
  )

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!isPasswordValid(password, confirmPassword)) {
      setError('Please satisfy every password requirement before continuing.')
      return
    }

    setSaving(true)
    try {
      await api.post('/auth/reset-password', {
        email,
        token,
        password,
        confirmPassword,
      })

      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not reset your password.'))
    } finally {
      setSaving(false)
    }
  }

  if (!email || !token) {
    return (
      <Paper
        sx={{
          maxWidth: 480,
          mx: 'auto',
          p: 5,
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 900, color: 'error.main', mb: 1 }}>
          Link not valid
        </Typography>
        <Typography sx={{ opacity: 0.8, mb: 3 }}>
          This password reset link is incomplete. Please request a new one.
        </Typography>
        <Button variant="contained" component={RouterLink} to="/forgot-password">
          Request a new link
        </Button>
      </Paper>
    )
  }

  if (done) {
    return (
      <Paper
        sx={{
          maxWidth: 480,
          mx: 'auto',
          p: 5,
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CheckCircleOutlineIcon sx={{ fontSize: '3.5rem', color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Password changed
          </Typography>
          <Typography sx={{ opacity: 0.8 }}>
            You can now sign in with your new password. Any other devices that were signed
            in have been signed out.
          </Typography>
          <Button variant="contained" component={RouterLink} to="/login" sx={{ mt: 1 }} fullWidth>
            Go to login
          </Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper sx={{ maxWidth: 480, mx: 'auto', p: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        Choose a new password
      </Typography>
      <Typography sx={{ mt: 0.5, opacity: 0.7 }}>
        Setting a new password for <b>{email}</b>.
      </Typography>

      <Box component="form" onSubmit={submit} sx={{ mt: 3 }}>
        <Stack spacing={2.5}>
          <TextField
            label="New password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            autoFocus
            required
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((visible) => !visible)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            label="Confirm new password"
            type={showPassword ? 'text' : 'password'}
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
            <Box
              sx={{
                mt: 1,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 0.5,
              }}
            >
              {checks.map((check) => (
                <Stack key={check.label} direction="row" spacing={1} alignItems="center">
                  {check.ok ? (
                    <CheckCircleIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                  ) : (
                    <RadioButtonUncheckedIcon sx={{ fontSize: '1rem', opacity: 0.3 }} />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: 600, opacity: check.ok ? 1 : 0.55 }}>
                    {check.label}
                  </Typography>
                </Stack>
              ))}
            </Box>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || !isPasswordValid(password, confirmPassword)}
            sx={{ fontWeight: 900, py: 1.2 }}
          >
            {saving ? 'Saving…' : 'Set new password'}
          </Button>

          <Button variant="text" component={RouterLink} to="/login" sx={{ opacity: 0.8 }}>
            Back to login
          </Button>
        </Stack>
      </Box>
    </Paper>
  )
}
