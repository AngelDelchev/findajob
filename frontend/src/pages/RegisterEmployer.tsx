import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api } from '../api'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

const COUNTRIES = [
  'Bulgaria', 'United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'Japan'
]

const CITIES: Record<string, string[]> = {
  'Bulgaria': ['Sofia', 'Plovdiv', 'Varna', 'Burgas'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Glasgow'],
}

export default function RegisterEmployer() {
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    professionalTitle: '',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: 'Bulgaria',
    password: '',
    confirmPassword: '',
  })

  const [showRules, setShowRules] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const passwordChecks = useMemo(
    () => [
      { label: 'At least 8 characters', ok: form.password.length >= 8 },
      { label: 'One uppercase letter', ok: /[A-Z]/.test(form.password) },
      { label: 'One lowercase letter', ok: /[a-z]/.test(form.password) },
      { label: 'One number', ok: /\d/.test(form.password) },
      { label: 'One special character', ok: /[^A-Za-z0-9]/.test(form.password) },
      { label: 'Passwords match', ok: form.password.length > 0 && form.password === form.confirmPassword },
    ],
    [form.password, form.confirmPassword]
  )

  const set = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setAnchorEl(event.currentTarget)
    setShowRules(true)
  }

  const handleBlur = () => {
    setShowRules(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await api.post('/auth/register', {
        ...form,
        role: 'Employer',
      })

      setIsSuccess(true)
    } catch (e: any) {
      const apiMessage = e?.response?.data?.message
      const apiErrors = e?.response?.data?.errors
      setError(Array.isArray(apiErrors) ? apiErrors.join(' ') : apiMessage ?? 'Registration failed.')
    } finally {
      setSaving(false)
    }
  }

  if (isSuccess) {
    return (
      <Paper sx={{ maxWidth: 600, mx: 'auto', p: 6, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, color: 'primary.main' }}>
          Almost there!
        </Typography>
        <Typography sx={{ mb: 4, opacity: 0.8 }}>
          We've sent a confirmation email to <b>{form.email}</b>. 
          Please click the link in the email to activate your account.
        </Typography>
        <Button variant="outlined" component={RouterLink} to="/login">
          Back to login
        </Button>
      </Paper>
    )
  }

  return (
    <Paper sx={{ maxWidth: 900, mx: 'auto', p: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h3" sx={{ fontWeight: 900 }}>
        Employer registration
      </Typography>

      <Typography sx={{ mt: 1, opacity: 0.8 }}>
        Start posting jobs and managing applications today.
      </Typography>

      <Box component="form" onSubmit={submit} sx={{ mt: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField fullWidth label="Email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <TextField fullWidth label="Phone number" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)} />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField fullWidth label="First name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            <TextField fullWidth label="Last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField fullWidth label="Company name" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            <TextField fullWidth label="Professional title" value={form.professionalTitle} onChange={(e) => set('professionalTitle', e.target.value)} />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <TextField
              fullWidth
              type={showPassword ? 'text' : 'password'}
              label="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? 'Hide password' : 'Show password'}
            </Button>
          </Stack>

          <Popper open={showRules} anchorEl={anchorEl} placement="top-start" transition sx={{ zIndex: 1300 }}>
            {({ TransitionProps }) => (
              <Fade {...TransitionProps} timeout={350}>
                <Paper sx={{ p: 2, mb: 1, border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backgroundColor: 'background.paper' }}>
                  <Stack spacing={0.5}>
                    {passwordChecks.map((item) => (
                      <Typography key={item.label} sx={{ color: item.ok ? 'primary.main' : 'text.secondary', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                        <Box component="span" sx={{ mr: 1, fontSize: '1rem' }}>{item.ok ? '✓' : '•'}</Box> {item.label}
                      </Typography>
                    ))}
                  </Stack>
                </Paper>
              </Fade>
            )}
          </Popper>

          <Typography sx={{ fontWeight: 800, mt: 1 }}>Company Location</Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField fullWidth label="Address" value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} />
            <TextField fullWidth label="Address line 2 (optional)" value={form.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Autocomplete
              fullWidth
              freeSolo
              options={COUNTRIES}
              value={form.country}
              onInputChange={(_, val) => set('country', val)}
              renderInput={(params) => <TextField {...params} label="Country" />}
            />
            <Autocomplete
              fullWidth
              freeSolo
              options={CITIES[form.country] || []}
              value={form.city}
              onInputChange={(_, val) => set('city', val)}
              renderInput={(params) => <TextField {...params} label="City" />}
            />
            <TextField fullWidth label="ZIP / Postal code" value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" component={RouterLink} to="/register">
              Employee registration
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              Create employer account
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  )
}
