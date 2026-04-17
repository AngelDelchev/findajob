import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'

export default function Register() {
  const nav = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Bulgaria')

  const [avatar, setAvatar] = useState<File | null>(null)
  const [cv, setCv] = useState<File | null>(null)

  const submit = async () => {
    setError('')
    if (!email.trim()) return setError('Email is required.')
    if (!password) return setError('Password is required.')
    if (password !== confirmPassword) return setError('Passwords do not match.')

    setLoading(true)
    try {
      await api.post('/auth/register', {
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        phoneNumber,
        addressLine1,
        addressLine2,
        city,
        postalCode,
        country,
        role: 'Employee'
      })

      if (avatar) {
        const fd = new FormData()
        fd.append('file', avatar)
        await api.post('/profiles/me/avatar', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      if (cv) {
        const fd = new FormData()
        fd.append('file', cv)
        fd.append('isPrimary', 'true')
        await api.post('/cv/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      nav('/employee')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
        Create account
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Phone number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} fullWidth />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField label="First name" value={firstName} onChange={e => setFirstName(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Last name" value={lastName} onChange={e => setLastName(e.target.value)} fullWidth />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField label="Confirm password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} fullWidth />
        </Grid>

        <Grid item xs={12}>
          <TextField label="Home address" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12}>
          <TextField label="Address line 2 (optional)" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} fullWidth />
        </Grid>

        <Grid item xs={12} sm={4}>
          <TextField label="City" value={city} onChange={e => setCity(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="ZIP / Postal code" value={postalCode} onChange={e => setPostalCode(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField label="Country" value={country} onChange={e => setCountry(e.target.value)} fullWidth />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Button variant="outlined" component="label" fullWidth>
            Upload profile picture
            <input hidden type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] ?? null)} />
          </Button>
          <Typography sx={{ opacity: 0.7, mt: 0.5 }}>
            {avatar ? avatar.name : 'No file selected'}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Button variant="outlined" component="label" fullWidth>
            Upload CV (PDF/DOC/DOCX)
            <input hidden type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCv(e.target.files?.[0] ?? null)} />
          </Button>
          <Typography sx={{ opacity: 0.7, mt: 0.5 }}>
            {cv ? cv.name : 'No file selected'}
          </Typography>
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={() => nav(-1)}>Back</Button>
        <Button variant="contained" disabled={loading} onClick={() => void submit()}>
          {loading ? 'Creating…' : 'Create account'}
        </Button>
      </Stack>
    </Paper>
  )
}
