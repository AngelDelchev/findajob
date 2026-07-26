import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { CITIES, COUNTRIES } from '../../constants'
import { initials } from '../../utils'
import type { MyProfile } from '../../types'
import Avatar from '@mui/material/Avatar'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import EditIcon from '@mui/icons-material/Edit'

type Props = {
  profile: MyProfile | null
  onRefresh: () => Promise<void>
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export default function ProfileHeader({ profile, onRefresh }: Props) {
  const { showSuccess, showError } = useToast()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<MyProfile | null>(profile)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null)

  useEffect(() => {
    setForm(profile)
  }, [profile])

  const upload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = event.target.files?.[0]
    if (!file) return

    // Checked here as well as on the server so an oversized file fails immediately
    // instead of after a long upload.
    if (file.size > MAX_IMAGE_BYTES) {
      showError('Please choose an image smaller than 5 MB.')
      event.target.value = ''
      return
    }

    setUploading(type)

    const data = new FormData()
    data.append('file', file)

    try {
      await api.post(`/profiles/${type}`, data)
      await onRefresh()
      showSuccess(type === 'avatar' ? 'Profile picture updated.' : 'Banner updated.')
    } catch (error) {
      showError(errorMessage(error, `Could not upload the ${type}.`))
    } finally {
      setUploading(null)
      event.target.value = ''
    }
  }

  const save = async () => {
    if (!form) return

    setSaving(true)
    try {
      await api.put('/profiles/me', {
        firstName: form.firstName ?? '',
        lastName: form.lastName ?? '',
        companyName: form.companyName ?? '',
        professionalTitle: form.professionalTitle ?? '',
        phoneNumber: form.phoneNumber ?? '',
        bio: form.bio ?? '',
        companySize: form.companySize ?? '',
        industry: form.industry ?? '',
        techStack: form.techStack ?? '',
        benefits: form.benefits ?? '',
        addressLine1: form.addressLine1 ?? '',
        addressLine2: form.addressLine2 ?? '',
        city: form.city ?? '',
        postalCode: form.postalCode ?? '',
        country: form.country ?? '',
      })

      setOpen(false)
      await onRefresh()
      showSuccess('Profile updated.')
    } catch (error) {
      showError(errorMessage(error, 'Could not update your profile.'))
    } finally {
      setSaving(false)
    }
  }

  const update = (key: keyof MyProfile, value: string) => {
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous))
  }

  const location = [profile?.city, profile?.country].filter(Boolean).join(', ')

  return (
    <Paper
      sx={{
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        position: 'relative',
        mb: 3,
      }}
    >
      <Box
        sx={{
          height: 180,
          backgroundColor: 'rgba(255,255,255,0.05)',
          position: 'relative',
          backgroundImage: profile?.bannerUrl ? `url(${profile.bannerUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <input
          type="file"
          id="banner-input"
          hidden
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void upload(event, 'banner')}
        />
        <IconButton
          component="label"
          htmlFor="banner-input"
          size="small"
          disabled={uploading !== null}
          aria-label="Change banner image"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            backgroundColor: 'rgba(0,0,0,0.5)',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
          }}
        >
          {uploading === 'banner' ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <CameraAltIcon fontSize="small" sx={{ color: 'white' }} />
          )}
        </IconButton>
      </Box>

      <Box sx={{ px: { xs: 2, md: 4 }, pb: 3, position: 'relative' }}>
        <Box sx={{ position: 'relative', mt: -10, mb: 2, display: 'inline-block' }}>
          <input
            type="file"
            id="avatar-input"
            hidden
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void upload(event, 'avatar')}
          />
          <Avatar
            src={profile?.avatarUrl ?? undefined}
            alt="Your profile picture"
            sx={{
              width: 152,
              height: 152,
              border: '4px solid #02060d',
              fontSize: '4rem',
              fontWeight: 900,
              backgroundColor: 'primary.main',
              color: 'background.default',
              opacity: uploading === 'avatar' ? 0.5 : 1,
            }}
          >
            {initials(profile?.firstName, profile?.lastName)}
          </Avatar>
          <IconButton
            component="label"
            htmlFor="avatar-input"
            size="small"
            disabled={uploading !== null}
            aria-label="Change profile picture"
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(0,0,0,0.5)',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
            }}
          >
            {uploading === 'avatar' ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <CameraAltIcon fontSize="small" sx={{ color: 'white' }} />
            )}
          </IconButton>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'Your name'}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mt: 0.5 }}>
              {profile?.professionalTitle ||
                (profile?.companyName ? 'Company representative' : 'Career enthusiast')}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.6, mt: 1 }}>
              {location || 'Location not set'}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setOpen(true)}
            sx={{ borderRadius: 20, fontWeight: 800, flexShrink: 0 }}
          >
            Edit profile
          </Button>
        </Stack>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit profile</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First name"
                value={form?.firstName ?? ''}
                onChange={(event) => update('firstName', event.target.value)}
                fullWidth
              />
              <TextField
                label="Last name"
                value={form?.lastName ?? ''}
                onChange={(event) => update('lastName', event.target.value)}
                fullWidth
              />
            </Stack>

            {profile?.companyName ? (
              <TextField
                label="Company name"
                value={form?.companyName ?? ''}
                onChange={(event) => update('companyName', event.target.value)}
                fullWidth
              />
            ) : null}

            <TextField
              label="Headline / professional title"
              value={form?.professionalTitle ?? ''}
              onChange={(event) => update('professionalTitle', event.target.value)}
              fullWidth
            />
            <TextField
              label="Phone number"
              value={form?.phoneNumber ?? ''}
              onChange={(event) => update('phoneNumber', event.target.value)}
              fullWidth
            />
            <TextField
              label="Bio"
              value={form?.bio ?? ''}
              onChange={(event) => update('bio', event.target.value)}
              fullWidth
              multiline
              minRows={4}
            />
            <TextField
              label="Address line 1"
              value={form?.addressLine1 ?? ''}
              onChange={(event) => update('addressLine1', event.target.value)}
              fullWidth
            />
            <TextField
              label="Address line 2 (optional)"
              value={form?.addressLine2 ?? ''}
              onChange={(event) => update('addressLine2', event.target.value)}
              fullWidth
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Autocomplete
                fullWidth
                freeSolo
                options={COUNTRIES as readonly string[]}
                value={form?.country ?? ''}
                onInputChange={(_, value) => update('country', value)}
                renderInput={(params) => <TextField {...params} label="Country" />}
              />
              <Autocomplete
                fullWidth
                freeSolo
                options={CITIES[form?.country ?? ''] ?? []}
                value={form?.city ?? ''}
                onInputChange={(_, value) => update('city', value)}
                renderInput={(params) => <TextField {...params} label="City" />}
              />
              <TextField
                label="Postal code"
                value={form?.postalCode ?? ''}
                onChange={(event) => update('postalCode', event.target.value)}
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => void save()}
            sx={{ borderRadius: 20, px: 4, fontWeight: 900 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
