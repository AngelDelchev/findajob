import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { homePathFor, useAuth } from '../auth'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = (location.state as { from?: string } | null)?.from

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const result = await login(loginName, password)

      if (!result.ok) {
        setError(result.error)
        return
      }

      // The signed-in user comes back from the login call itself. This used to make a
      // second request to a hard-coded https://localhost:7001 URL, which could only
      // ever work on the developer's own machine.
      navigate(redirectTo ?? homePathFor(result.user), { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Paper sx={{ maxWidth: 460, mx: 'auto', p: 4, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        Welcome back
      </Typography>
      <Typography sx={{ mt: 0.5, opacity: 0.7 }}>Sign in to continue to FindAJob.</Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Stack spacing={2.5}>
          <TextField
            label="Email or username"
            value={loginName}
            onChange={(event) => setLoginName(event.target.value)}
            autoComplete="username"
            autoFocus
            required
            fullWidth
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
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

          <Box sx={{ textAlign: 'right', mt: -1 }}>
            <Typography
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
            >
              Forgot your password?
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !loginName || !password}
            sx={{ fontWeight: 900, py: 1.2 }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>

          <Typography sx={{ opacity: 0.8, textAlign: 'center' }}>
            No account yet?{' '}
            <Typography
              component={RouterLink}
              to="/register"
              sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
            >
              Create one
            </Typography>
          </Typography>
        </Stack>
      </Box>
    </Paper>
  )
}
