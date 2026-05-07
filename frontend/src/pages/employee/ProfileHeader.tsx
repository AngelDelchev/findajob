import { useState, useEffect } from 'react'
import { api } from '../../api'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Autocomplete from '@mui/material/Autocomplete'
import EditIcon from '@mui/icons-material/Edit'
import CameraAltIcon from '@mui/icons-material/CameraAlt'

const COUNTRIES = [
  'Bulgaria', 'United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'Japan'
]

const CITIES: Record<string, string[]> = {
  'Bulgaria': ['Sofia', 'Plovdiv', 'Varna', 'Burgas'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Glasgow'],
}

export default function ProfileHeader({ profile, onRefresh }: { profile: any, onRefresh: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(profile || {})
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState<'avatar' | 'banner' | null>(null)

  useEffect(() => {
    setForm(profile || {})
  }, [profile])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(type)
    const formData = new FormData()
    formData.append('file', file)

    try {
      await api.post(`/profiles/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await onRefresh()
    } catch (err) {
      console.error(`${type} upload failed:`, err)
      alert(`Failed to upload ${type}.`)
    } finally {
      setIsUploading(null)
    }
  }

  const save = async () => {
    setIsSaving(true)
    try {
      // Ensure all fields are strings and not null/undefined for the backend
      const payload = {
        firstName: form.firstName || '',
        lastName: form.lastName || '',
        companyName: form.companyName || '',
        professionalTitle: form.professionalTitle || '',
        phoneNumber: form.phoneNumber || '',
        bio: form.bio || '',
        companySize: form.companySize || '',
        industry: form.industry || '',
        techStack: form.techStack || '',
        benefits: form.benefits || '',
        addressLine1: form.addressLine1 || '',
        addressLine2: form.addressLine2 || '',
        city: form.city || '',
        postalCode: form.postalCode || '',
        country: form.country || '',
      }
      
      await api.put('/profiles/me', payload)
      setOpen(false)
      await onRefresh()
    } catch (e: any) {
      console.error('Save failed:', e)
      const msg = e.response?.data?.message || 'Profile update failed. Please check your information.'
      alert(msg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Paper sx={{ border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', position: 'relative', mb: 3 }}>
      {/* Cover Image / Banner */}
      <Box sx={{ 
        height: 180, 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        position: 'relative',
        backgroundImage: profile?.bannerUrl ? `url(${profile.bannerUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <input type="file" id="banner-input" hidden accept="image/*" onChange={(e) => handleUpload(e, 'banner')} />
        <IconButton 
          component="label"
          htmlFor="banner-input"
          sx={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' } }}
          size="small"
          disabled={!!isUploading}
        >
          {isUploading === 'banner' ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon fontSize="small" sx={{ color: 'white' }} />}
        </IconButton>
      </Box>

      {/* Profile Info Area */}
      <Box sx={{ px: { xs: 2, md: 4 }, pb: 3, position: 'relative' }}>
        {/* Avatar */}
        <Box sx={{ position: 'relative', mt: -10, mb: 2, display: 'inline-block' }}>
          <input type="file" id="avatar-input" hidden accept="image/*" onChange={(e) => handleUpload(e, 'avatar')} />
          <Avatar 
            src={profile?.avatarUrl}
            sx={{ 
              width: 152, 
              height: 152, 
              border: '4px solid #02060d', 
              fontSize: '4rem', 
              fontWeight: 900,
              backgroundColor: 'primary.main',
              color: 'background.default',
              opacity: isUploading === 'avatar' ? 0.5 : 1
            }}
          >
            {profile?.firstName?.[0]}{profile?.lastName?.[0]}
          </Avatar>
          <IconButton 
            component="label"
            htmlFor="avatar-input"
            sx={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' } }}
            size="small"
            disabled={!!isUploading}
          >
            {isUploading === 'avatar' ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon fontSize="small" sx={{ color: 'white' }} />}
          </IconButton>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {profile?.firstName} {profile?.lastName}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, mt: 0.5 }}>
              {profile?.professionalTitle || (profile?.companyName ? 'Company Representative' : 'Career enthusiast')}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.6, mt: 1 }}>
              {profile?.city && profile?.country ? `${profile.city}, ${profile.country}` : 'Location not set'}
            </Typography>
          </Box>

          <Button 
            variant="outlined" 
            startIcon={<EditIcon />} 
            onClick={() => setOpen(true)}
            sx={{ borderRadius: 20, fontWeight: 800 }}
          >
            Edit Profile
          </Button>
        </Stack>
      </Box>

      {/* Edit Modal */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Edit Intro</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField label="First Name" value={form.firstName || ''} onChange={(e) => setForm({...form, firstName: e.target.value})} fullWidth />
              <TextField label="Last Name" value={form.lastName || ''} onChange={(e) => setForm({...form, lastName: e.target.value})} fullWidth />
            </Stack>
            {profile?.companyName && (
              <TextField label="Company Name" value={form.companyName || ''} onChange={(e) => setForm({...form, companyName: e.target.value})} fullWidth />
            )}
            <TextField label="Headline / Professional Title" value={form.professionalTitle || ''} onChange={(e) => setForm({...form, professionalTitle: e.target.value})} fullWidth />
            <TextField label="Phone Number" value={form.phoneNumber || ''} onChange={(e) => setForm({...form, phoneNumber: e.target.value})} fullWidth />
            <TextField label="Bio" value={form.bio || ''} onChange={(e) => setForm({...form, bio: e.target.value})} fullWidth multiline minRows={4} />
            <TextField label="Address Line 1" value={form.addressLine1 || ''} onChange={(e) => setForm({...form, addressLine1: e.target.value})} fullWidth />
            <TextField label="Address Line 2 (Optional)" value={form.addressLine2 || ''} onChange={(e) => setForm({...form, addressLine2: e.target.value})} fullWidth />
            <Stack direction="row" spacing={2}>
              <Autocomplete
                fullWidth
                freeSolo
                options={COUNTRIES}
                value={form.country || ''}
                onInputChange={(_, val) => setForm({...form, country: val})}
                renderInput={(params) => <TextField {...params} label="Country" />}
              />
              <Autocomplete
                fullWidth
                freeSolo
                options={CITIES[form.country] || []}
                value={form.city || ''}
                onInputChange={(_, val) => setForm({...form, city: val})}
                renderInput={(params) => <TextField {...params} label="City" />}
              />
              <TextField label="Postal Code" value={form.postalCode || ''} onChange={(e) => setForm({...form, postalCode: e.target.value})} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
          <Button variant="contained" disabled={isSaving} onClick={() => void save()} sx={{ borderRadius: 20, px: 4, fontWeight: 900 }}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
