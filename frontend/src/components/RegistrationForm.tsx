import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, errorMessage } from '../api'
import { CITIES, COUNTRIES, isPasswordValid, passwordChecks } from '../constants'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

type Props = {
  role: 'Employee' | 'Employer'
  title: string
  subtitle: string
  addressLabel: string
  footer: React.ReactNode
}

const emptyForm = {
  email: '',
  phoneNumber: '',
  firstName: '',
  lastName: '',
  companyName: '',
  professionalTitle: '',
  password: '',
  confirmPassword: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: 'Bulgaria',
}

/**
 * Sign-up form shared by the employee and employer pages, which previously kept two
 * near-identical 220-line copies of this markup.
 */
export default function RegistrationForm({ role, title, subtitle, addressLabel, footer }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [developmentToken, setDevelopmentToken] = useState<string | null>(null)

  const checks = useMemo(
    () => passwordChecks(form.password, form.confirmPassword),
    [form.password, form.confirmPassword]
  )

  const isEmployer = role === 'Employer'

  const canSubmit =
    form.email.trim().length > 0 &&
    form.firstName.trim().length > 0 &&
    form.lastName.trim().length > 0 &&
    (!isEmployer || form.companyName.trim().length > 0) &&
    isPasswordValid(form.password, form.confirmPassword)

  const set = (key: keyof typeof emptyForm, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    // The server enforces the same rules; blocking here means a user is told what is
    // wrong before a round trip rather than after one.
    if (!isPasswordValid(form.password, form.confirmPassword)) {
      setError('Please satisfy every password requirement before continuing.')
      return
    }

    setSaving(true)
    try {
      const response = await api.post<{ developmentToken?: string }>('/auth/register', {
        ...form,
        role,
      })

      setDevelopmentToken(response.data?.developmentToken ?? null)
      setSubmitted(true)
    } catch (err) {
      setError(errorMessage(err, 'Registration failed.'))
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <Paper
        sx={{
          maxWidth: 600,
          mx: 'auto',
          p: 6,
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 900, mb: 2, color: 'primary.main' }}>
          Almost there
        </Typography>
        <Typography sx={{ mb: 4, opacity: 0.8 }}>
          We have sent a confirmation email to <b>{form.email}</b>. Follow the link in it to
          activate your account.
        </Typography>

        {developmentToken ? (
          <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              Development mode
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              No mail server is configured locally, so the confirmation link is shown here
              instead.
            </Typography>
            <Button
              size="small"
              variant="outlined"
              component={RouterLink}
              to={`/confirm-email?token=${encodeURIComponent(developmentToken)}`}
            >
              Confirm now
            </Button>
          </Alert>
        ) : null}

        <Button variant="outlined" component={RouterLink} to="/login">
          Back to login
        </Button>
      </Paper>
    )
  }

  return (
    <Paper sx={{ maxWidth: 900, mx: 'auto', p: { xs: 3, md: 4 }, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3rem' } }}>
        {title}
      </Typography>
      <Typography sx={{ mt: 1, opacity: 0.8 }}>{subtitle}</Typography>

      <Box component="form" onSubmit={submit} sx={{ mt: 3 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              required
              type="email"
              label="Email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => set('email', event.target.value)}
            />
            <TextField
              fullWidth
              label="Phone number"
              autoComplete="tel"
              value={form.phoneNumber}
              onChange={(event) => set('phoneNumber', event.target.value)}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              required
              label="First name"
              autoComplete="given-name"
              value={form.firstName}
              onChange={(event) => set('firstName', event.target.value)}
            />
            <TextField
              fullWidth
              required
              label="Last name"
              autoComplete="family-name"
              value={form.lastName}
              onChange={(event) => set('lastName', event.target.value)}
            />
          </Stack>

          {isEmployer ? (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                required
                label="Company name"
                autoComplete="organization"
                value={form.companyName}
                onChange={(event) => set('companyName', event.target.value)}
              />
              <TextField
                fullWidth
                label="Your job title"
                autoComplete="organization-title"
                value={form.professionalTitle}
                onChange={(event) => set('professionalTitle', event.target.value)}
              />
            </Stack>
          ) : null}

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              required
              type={showPassword ? 'text' : 'password'}
              label="Password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => set('password', event.target.value)}
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
              fullWidth
              required
              type={showPassword ? 'text' : 'password'}
              label="Confirm password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => set('confirmPassword', event.target.value)}
            />
          </Stack>

          {/*
            Always visible rather than tucked into a popper that disappeared on blur,
            so it is clear which rule is still unmet when the button stays disabled.
          */}
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
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, opacity: check.ok ? 1 : 0.55 }}
                  >
                    {check.label}
                  </Typography>
                </Stack>
              ))}
            </Box>
          </Box>

          <Typography sx={{ fontWeight: 800, mt: 1 }}>{addressLabel}</Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Address"
              autoComplete="address-line1"
              value={form.addressLine1}
              onChange={(event) => set('addressLine1', event.target.value)}
            />
            <TextField
              fullWidth
              label="Address line 2 (optional)"
              autoComplete="address-line2"
              value={form.addressLine2}
              onChange={(event) => set('addressLine2', event.target.value)}
            />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Autocomplete
              fullWidth
              freeSolo
              options={COUNTRIES as readonly string[]}
              value={form.country}
              onInputChange={(_, value) => set('country', value)}
              renderInput={(params) => <TextField {...params} label="Country" />}
            />
            <Autocomplete
              fullWidth
              freeSolo
              options={CITIES[form.country] ?? []}
              value={form.city}
              onInputChange={(_, value) => set('city', value)}
              renderInput={(params) => <TextField {...params} label="City" />}
            />
            <TextField
              fullWidth
              label="ZIP / postal code"
              autoComplete="postal-code"
              value={form.postalCode}
              onChange={(event) => set('postalCode', event.target.value)}
            />
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" component={RouterLink} to="/login">
              Back to login
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !canSubmit}
              sx={{ fontWeight: 800, px: 3 }}
            >
              {saving ? 'Creating…' : 'Create account'}
            </Button>
          </Stack>

          {footer}
        </Stack>
      </Box>
    </Paper>
  )
}
