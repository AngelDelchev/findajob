import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

export default function Login() {
  const { login, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const success = await login(loginName, password)
    if (!success) {
      setError('Invalid credentials.')
      return
    }

    await refreshUser()

    try {
      const res = await fetch('https://localhost:7001/api/auth/me', {
        credentials: 'include',
      })
      const user = await res.json()

      if (user.roles?.includes('Admin')) navigate('/admin')
      else if (user.roles?.includes('Employer')) navigate('/employer')
      else navigate('/employee')
    } catch {
      navigate('/')
    }
  }

  return (
    <Paper sx={{ maxWidth: 460, mx: 'auto', p: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        Login
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <Stack spacing={2}>
          <TextField
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            placeholder="Email or username"
          />

          <TextField
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Button type="submit" variant="contained">
            Login
          </Button>
        </Stack>
      </Box>
    </Paper>
  )
}
