import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../api'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [message, setMessage] = useState('')
  const [developmentToken, setDevelopmentToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await api.post<{ message: string; developmentToken?: string }>(
        '/auth/forgot-password',
        { email: email.trim() }
      )

      setMessage(response.data.message)
      setDevelopmentToken(response.data.developmentToken ?? null)
      setSent(true)
    } catch (err) {
      setError(errorMessage(err, 'Could not start the password reset.'))
    } finally {
      setSaving(false)
    }
  }

  if (sent) {
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
          <MarkEmailReadIcon sx={{ fontSize: '3.5rem', color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Check your inbox
          </Typography>
          <Typography sx={{ opacity: 0.8 }}>{message}</Typography>

          {developmentToken ? (
            <Alert severity="info" sx={{ textAlign: 'left', width: '100%' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                Development mode
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                No mail server is configured locally, so the reset link is shown here
                instead.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                component={RouterLink}
                to={`/reset-password?email=${encodeURIComponent(email.trim())}&token=${encodeURIComponent(developmentToken)}`}
              >
                Reset now
              </Button>
            </Alert>
          ) : null}

          <Button variant="outlined" component={RouterLink} to="/login" sx={{ mt: 1 }}>
            Back to login
          </Button>
        </Stack>
      </Paper>
    )
  }

  return (
    <Paper sx={{ maxWidth: 460, mx: 'auto', p: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        Forgot your password?
      </Typography>
      <Typography sx={{ mt: 0.5, opacity: 0.7 }}>
        Enter the address you signed up with and we will send you a link to choose a new
        password.
      </Typography>

      <Box component="form" onSubmit={submit} sx={{ mt: 3 }}>
        <Stack spacing={2.5}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoFocus
            required
            fullWidth
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={saving || !email.trim()}
            sx={{ fontWeight: 900, py: 1.2 }}
          >
            {saving ? 'Sending…' : 'Send reset link'}
          </Button>

          <Typography sx={{ opacity: 0.8, textAlign: 'center' }}>
            Remembered it?{' '}
            <Typography
              component={RouterLink}
              to="/login"
              sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
            >
              Back to login
            </Typography>
          </Typography>
        </Stack>
      </Box>
    </Paper>
  )
}
