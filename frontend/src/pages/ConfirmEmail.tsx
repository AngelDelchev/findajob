import { useEffect, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'

export default function ConfirmEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing confirmation token.')
      return
    }

    const verify = async () => {
      try {
        const res = await api.get(`/auth/confirm-email?token=${token}`)
        setStatus('success')
        setMessage(res.data.message || 'Email confirmed successfully!')
      } catch (e: any) {
        setStatus('error')
        setMessage(e?.response?.data?.message || 'Verification failed. The link may be expired.')
      }
    }

    void verify()
  }, [token])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
      <Paper sx={{ maxWidth: 500, p: 4, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
        {status === 'loading' && (
          <>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography>{message}</Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, color: 'primary.main' }}>
              All set!
            </Typography>
            <Typography sx={{ mb: 4 }}>{message}</Typography>
            <Button variant="contained" component={RouterLink} to="/login" fullWidth>
              Go to Login
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, color: 'error.main' }}>
              Oops!
            </Typography>
            <Typography sx={{ mb: 4 }}>{message}</Typography>
            <Button variant="outlined" component={RouterLink} to="/register" fullWidth>
              Try Registering Again
            </Button>
          </>
        )}
      </Paper>
    </Box>
  )
}
