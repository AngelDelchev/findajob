import { useState } from 'react'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { COMPANY_SIZES } from '../../constants'
import ProfileHeader from '../employee/ProfileHeader'
import ProfileSection from '../employee/ProfileSection'
import type { MyProfile } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import BusinessIcon from '@mui/icons-material/Business'
import EditIcon from '@mui/icons-material/Edit'
import GroupsIcon from '@mui/icons-material/Groups'
import VerifiedIcon from '@mui/icons-material/Verified'

type Props = {
  profile: MyProfile | null
  onRefresh: () => Promise<void>
}

const splitList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export default function EmployerProfile({ profile, onRefresh }: Props) {
  const { showSuccess, showError } = useToast()

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    companyName: '',
    companySize: '',
    industry: '',
    techStack: '',
    benefits: '',
  })

  const techStack = splitList(profile?.techStack)
  const benefits = splitList(profile?.benefits)

  const openEditor = () => {
    setForm({
      companyName: profile?.companyName ?? '',
      companySize: profile?.companySize ?? '',
      industry: profile?.industry ?? '',
      techStack: profile?.techStack ?? '',
      benefits: profile?.benefits ?? '',
    })
    setOpen(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      // Every field is sent because the endpoint replaces the whole profile; omitting
      // the untouched ones would blank them out.
      await api.put('/profiles/me', {
        firstName: profile?.firstName ?? '',
        lastName: profile?.lastName ?? '',
        professionalTitle: profile?.professionalTitle ?? '',
        phoneNumber: profile?.phoneNumber ?? '',
        bio: profile?.bio ?? '',
        addressLine1: profile?.addressLine1 ?? '',
        addressLine2: profile?.addressLine2 ?? '',
        city: profile?.city ?? '',
        postalCode: profile?.postalCode ?? '',
        country: profile?.country ?? '',
        ...form,
      })

      setOpen(false)
      await onRefresh()
      showSuccess('Company details updated.')
    } catch (error) {
      showError(errorMessage(error, 'Could not save the company details.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ pb: 6 }}>
      <ProfileHeader profile={profile} onRefresh={onRefresh} />

      <Stack spacing={3} sx={{ maxWidth: 800 }}>
        <Stack direction="row" justifyContent="flex-end">
          <Button variant="outlined" startIcon={<EditIcon />} onClick={openEditor}>
            Edit company details
          </Button>
        </Stack>

        <ProfileSection title="Company overview">
          <Typography sx={{ lineHeight: 1.7, opacity: 0.9, whiteSpace: 'pre-wrap' }}>
            {profile?.bio ||
              `Welcome to ${profile?.companyName || 'our company'}. Tell candidates about your mission and culture.`}
          </Typography>
        </ProfileSection>

        <ProfileSection title="Tech stack">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {techStack.length > 0 ? (
              techStack.map((tech) => (
                <Chip
                  key={tech}
                  label={tech}
                  variant="outlined"
                  sx={{
                    borderRadius: 1,
                    fontWeight: 800,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              ))
            ) : (
              <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>
                No tech stack specified.
              </Typography>
            )}
          </Box>
        </ProfileSection>

        <ProfileSection title="Benefits">
          <Grid container spacing={2}>
            {benefits.length > 0 ? (
              benefits.map((benefit) => (
                <Grid key={benefit} size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <VerifiedIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
                    <Typography sx={{ fontWeight: 700, opacity: 0.8 }}>{benefit}</Typography>
                  </Stack>
                </Grid>
              ))
            ) : (
              <Grid size={12}>
                <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>No benefits listed.</Typography>
              </Grid>
            )}
          </Grid>
        </ProfileSection>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <GroupsIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.5 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Company size
                  </Typography>
                  <Typography sx={{ opacity: 0.7 }}>
                    {profile?.companySize || 'Not specified'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)', height: '100%' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <BusinessIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.5 }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Industry
                  </Typography>
                  <Typography sx={{ opacity: 0.7 }}>
                    {profile?.industry || 'Not specified'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Edit company details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Company name"
              value={form.companyName}
              onChange={(event) => setForm({ ...form, companyName: event.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Company size"
              value={form.companySize}
              onChange={(event) => setForm({ ...form, companySize: event.target.value })}
              fullWidth
            >
              {COMPANY_SIZES.map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Industry"
              placeholder="e.g. Information technology"
              value={form.industry}
              onChange={(event) => setForm({ ...form, industry: event.target.value })}
              fullWidth
            />
            <TextField
              label="Tech stack"
              helperText="Separate entries with commas"
              value={form.techStack}
              onChange={(event) => setForm({ ...form, techStack: event.target.value })}
              fullWidth
            />
            <TextField
              label="Benefits"
              helperText="Separate entries with commas"
              value={form.benefits}
              onChange={(event) => setForm({ ...form, benefits: event.target.value })}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void save()}
            sx={{ fontWeight: 800, px: 3 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
