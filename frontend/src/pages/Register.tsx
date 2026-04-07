import { useMemo, useState } from 'react'
import { api } from '../api'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Collapse from '@mui/material/Collapse'
import Checkbox from '@mui/material/Checkbox'

function hasUpper(s: string) { return /[A-Z]/.test(s) }
function hasLower(s: string) { return /[a-z]/.test(s) }
function hasDigit(s: string) { return /\d/.test(s) }
function hasSymbol(s: string) { return /[^A-Za-z0-9]/.test(s) }

export default function Register() {
  const nav = useNavigate()

  const [roleEmployer, setRoleEmployer] = useState(false)

  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('Bulgaria')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showRules, setShowRules] = useState(true)

  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const rules = useMemo(() => {
    return [
      { label: 'At least 6 characters', ok: password.length >= 6 },
      { label: 'Uppercase letter', ok: hasUpper(password) },
      { label: 'Lowercase letter', ok: hasLower(password) },
      { label: 'Number', ok: hasDigit(password) },
      { label: 'Special character', ok: hasSymbol(password) },
      { label: 'Passwords match', ok: password.length > 0 && password === confirmPassword }
    ]
  }, [password, confirmPassword])

  const submit = async () => {
    setError('')
    setOk('')

    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Email, first name and last name are required.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
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
        role: roleEmployer ? 'Employer' : 'Employee'
      })

      setOk('Account created. You can log in now.')
      setTimeout(() => nav('/login'), 400)
    } catch (e: any) {
      const data = e?.response?.data
      const msg =
        data?.message ||
        (Array.isArray(data?.errors) ? data.errors.join(' ') : '') ||
        'Registration failed.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
      <Paper sx={{ p: 3, maxWidth: 860, width: '100%', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>Create account</Typography>
        <Typography sx={{ opacity: 0.85, mb: 2 }}>
          {roleEmployer ? 'Employer registration' : 'Employee registration'}
        </Typography>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {ok ? <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert> : null}

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <FormControlLabel
            control={<Switch checked={roleEmployer} onChange={(e) => setRoleEmployer(e.target.checked)} />}
            label="I am an employer"
          />
          <Button component={RouterLink} to="/login" variant="outlined">Back to login</Button>
        </Stack>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <TextField label="Phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} fullWidth />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} fullWidth />
            <TextField label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} fullWidth />
          </Stack>

          <Divider />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
            <TextField label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
          </Stack>

          <FormControlLabel
            control={<Checkbox checked={showRules} onChange={(e) => setShowRules(e.target.checked)} />}
            label="Show password requirements"
          />

          <Collapse in={showRules}>
            <Paper sx={{ p: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Password checklist</Typography>
              <Stack spacing={0.5}>
                {rules.map(r => (
                  <Typography key={r.label} sx={{ opacity: r.ok ? 1 : 0.65 }}>
                    {r.ok ? '✅' : '⬜'} {r.label}
                  </Typography>
                ))}
              </Stack>
            </Paper>
          </Collapse>

          <Divider />

          <Typography sx={{ fontWeight: 900 }}>Address</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Home address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} fullWidth />
            <TextField label="Address line 2 (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} fullWidth />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} fullWidth />
            <TextField label="ZIP / Postal code" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} fullWidth />
            <TextField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} fullWidth />
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="contained" disabled={submitting} onClick={() => void submit()}>
              {submitting ? 'Creating…' : 'Create account'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
