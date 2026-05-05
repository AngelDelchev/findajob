import { useState } from 'react'
import { api } from '../../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'

import BusinessIcon from '@mui/icons-material/Business'
import GroupsIcon from '@mui/icons-material/Groups'
import VerifiedIcon from '@mui/icons-material/Verified'
import EditIcon from '@mui/icons-material/Edit'

import ProfileHeader from '../employee/ProfileHeader'
import ProfileSection from '../employee/ProfileSection'

export default function EmployerProfile({ 
  profile, 
  onRefresh 
}: { 
  profile: any, 
  onRefresh: () => Promise<void> 
}) {
  const [openEdit, setOpenEdit] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    companyName: profile?.companyName || '',
    companySize: profile?.companySize || '',
    industry: profile?.industry || '',
    techStack: profile?.techStack || '',
    benefits: profile?.benefits || '',
  })

  const techStack = (profile?.techStack || '').split(',').map((s: string) => s.trim()).filter(Boolean)
  const benefits = (profile?.benefits || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  const save = async () => {
    setIsSaving(true)
    try {
      const payload = {
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        companyName: form.companyName || '',
        professionalTitle: profile?.professionalTitle || '',
        phoneNumber: profile?.phoneNumber || '',
        bio: profile?.bio || '',
        companySize: form.companySize || '',
        industry: form.industry || '',
        techStack: form.techStack || '',
        benefits: form.benefits || '',
        addressLine1: profile?.addressLine1 || '',
        addressLine2: profile?.addressLine2 || '',
        city: profile?.city || '',
        postalCode: profile?.postalCode || '',
        country: profile?.country || '',
      }
      await api.put('/profiles/me', payload)
      await onRefresh()
      setOpenEdit(false)
      alert('Company details updated.')
    } catch (e: any) {
      console.error('Save failed:', e)
      alert(e.response?.data?.message || 'Failed to save company details.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box sx={{ pb: 6 }}>
      <ProfileHeader profile={profile} onRefresh={onRefresh} />

      <Stack spacing={3} sx={{ maxWidth: 800 }}>
        <Stack direction="row" justifyContent="flex-end">
          <Button 
            variant="outlined" 
            startIcon={<EditIcon />} 
            onClick={() => {
              setForm({
                companyName: profile?.companyName || '',
                companySize: profile?.companySize || '',
                industry: profile?.industry || '',
                techStack: profile?.techStack || '',
                benefits: profile?.benefits || '',
              })
              setOpenEdit(true)
            }}
          >
            Edit Company Details
          </Button>
        </Stack>

        <ProfileSection title="Company Overview">
          <Typography sx={{ lineHeight: 1.7, opacity: 0.9 }}>
            {profile?.bio || `Welcome to ${profile?.companyName || 'our company'}. Tell candidates about your mission and culture!`}
          </Typography>
        </ProfileSection>

        <ProfileSection title="Tech Stack">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {techStack.length > 0 ? techStack.map((tech: string) => (
              <Chip 
                key={tech} 
                label={tech} 
                variant="outlined" 
                sx={{ 
                  borderRadius: 1, 
                  fontWeight: 800, 
                  border: '1px solid rgba(255,255,255,0.2)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' }
                }} 
              />
            )) : (
              <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>No tech stack specified.</Typography>
            )}
          </Box>
        </ProfileSection>

        <ProfileSection title="Benefits">
          <Grid container spacing={2}>
            {benefits.length > 0 ? benefits.map((benefit: string) => (
              <Grid key={benefit} size={{ xs: 12, sm: 6 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <VerifiedIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
                  <Typography sx={{ fontWeight: 700, opacity: 0.8 }}>{benefit}</Typography>
                </Stack>
              </Grid>
            )) : (
              <Grid size={12}>
                <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>No benefits listed.</Typography>
              </Grid>
            )}
          </Grid>
        </ProfileSection>

        <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <GroupsIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.5 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Company Size</Typography>
              <Typography sx={{ opacity: 0.7 }}>{profile?.companySize || 'Not specified'}</Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <BusinessIcon sx={{ fontSize: '2.5rem', color: 'primary.main', opacity: 0.5 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Industry</Typography>
              <Typography sx={{ opacity: 0.7 }}>{profile?.industry || 'Not specified'}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Edit Company Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField 
              label="Company Name" 
              value={form.companyName} 
              onChange={e => setForm({...form, companyName: e.target.value})} 
              fullWidth
            />
            <TextField 
              select
              label="Company Size" 
              value={form.companySize} 
              onChange={e => setForm({...form, companySize: e.target.value})} 
              fullWidth
            >
              <MenuItem value="1-10 employees">1-10 employees</MenuItem>
              <MenuItem value="11-50 employees">11-50 employees</MenuItem>
              <MenuItem value="51-200 employees">51-200 employees</MenuItem>
              <MenuItem value="201-500 employees">201-500 employees</MenuItem>
              <MenuItem value="501-1000 employees">501-1000 employees</MenuItem>
              <MenuItem value="1000+ employees">1000+ employees</MenuItem>
            </TextField>
            <TextField 
              label="Industry" 
              value={form.industry} 
              onChange={e => setForm({...form, industry: e.target.value})} 
              fullWidth 
              placeholder="e.g. Information Technology"
            />
            <TextField 
              label="Tech Stack (comma separated)" 
              value={form.techStack} 
              onChange={e => setForm({...form, techStack: e.target.value})} 
              fullWidth 
              multiline
              placeholder="e.g. React, .NET, PostgreSQL"
            />
            <TextField 
              label="Benefits (comma separated)" 
              value={form.benefits} 
              onChange={e => setForm({...form, benefits: e.target.value})} 
              fullWidth 
              multiline
              placeholder="e.g. Remote work, Health insurance, Gym membership"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" disabled={isSaving} onClick={save} sx={{ px: 4, fontWeight: 900 }}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
