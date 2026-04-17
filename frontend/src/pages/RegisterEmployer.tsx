import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { api } from '../api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'

export default function RegisterEmployer() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Bulgaria')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) return setError('Email is required.')
    if (!companyName.trim()) return setError('Company name is required.')
    if (!firstName.trim()) return setError('First name is required.')
    if (!lastName.trim()) return setError('Last name is required.')
    if (!password) return setError('Password is required.')
    if (password !== confirmPassword) return setError('Passwords do not match.')

    setLoading(true)
    try {
      await api.post('/auth/register', {
        email: email.trim(),
        password,
        confirmPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),

        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),

        role: 'Employer',

        // Optional: if your backend RegisterRequest supports this (see note below)
        companyName: companyName.trim()
      })

      nav('/employer')
    } catch (e: any) {
      const msg = e?.response?.data?.message
      const errs = e?.response?.data?.errors
      if (Array.isArray(errs) && errs.length) setError(errs.join(' '))
      else setError(msg || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)', maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Create employer account
      </Typography>
      <Typography sx={{ opacity: 0.8, mb: 2 }}>
        Register your company and start receiving applications.
      </Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <form onSubmit={submit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Company name" value={companyName} onChange={e => setCompanyName(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Company contact phone" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Contact first name" value={firstName} onChange={e => setFirstName(e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Contact last name" value={lastName} onChange={e => setLastName(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField label="Confirm password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} fullWidth />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.08)' }} />
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Company address (optional)</Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField label="Address line 1" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Address line 2" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} fullWidth />
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
        </Grid>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
          <Button variant="outlined" component={RouterLink} to="/register">
            I’m an employee
          </Button>
          <Button variant="contained" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create employer account'}
          </Button>
        </Stack>
      </form>
    </Paper>
  )
}
