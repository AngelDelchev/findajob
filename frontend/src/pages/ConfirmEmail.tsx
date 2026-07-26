import { useEffect, useRef, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

type Status = 'loading' | 'success' | 'error'

export default function ConfirmEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('Verifying your email address…')

  // StrictMode mounts effects twice in development; the guard stops the token being
  // spent by the first pass and reported as already used by the second.
  const attempted = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('This confirmation link is missing its token.')
      return
    }

    if (attempted.current) return
    attempted.current = true

    api
      .get<{ message: string }>('/auth/confirm-email', { params: { token } })
      .then((response) => {
        setStatus('success')
        setMessage(response.data.message || 'Email confirmed.')
      })
      .catch((error) => {
        setStatus('error')
        setMessage(errorMessage(error, 'Verification failed. The link may have expired.'))
      })
  }, [token])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
      <Paper
        sx={{
          maxWidth: 500,
          width: '100%',
          p: 5,
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Stack spacing={2} alignItems="center">
          {status === 'loading' ? (
            <>
              <CircularProgress />
              <Typography>{message}</Typography>
            </>
          ) : null}

          {status === 'success' ? (
            <>
              <CheckCircleOutlineIcon sx={{ fontSize: '3.5rem', color: 'primary.main' }} />
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
                All set
              </Typography>
              <Typography sx={{ opacity: 0.8 }}>{message}</Typography>
              <Button
                variant="contained"
                component={RouterLink}
                to="/login"
                fullWidth
                sx={{ mt: 2, fontWeight: 800 }}
              >
                Go to login
              </Button>
            </>
          ) : null}

          {status === 'error' ? (
            <>
              <ErrorOutlineIcon sx={{ fontSize: '3.5rem', color: 'error.main' }} />
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'error.main' }}>
                Link not valid
              </Typography>
              <Typography sx={{ opacity: 0.8 }}>{message}</Typography>
              <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                <Button variant="contained" component={RouterLink} to="/register">
                  Register again
                </Button>
                <Button variant="outlined" component={RouterLink} to="/login">
                  Back to login
                </Button>
              </Stack>
            </>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  )
}
