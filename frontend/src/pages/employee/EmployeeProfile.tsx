import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'

import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import SchoolIcon from '@mui/icons-material/School'
import DescriptionIcon from '@mui/icons-material/Description'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'

import ProfileHeader from './ProfileHeader'
import ProfileSection from './ProfileSection'

export default function EmployeeProfile({ 
  profile, 
  onRefresh 
}: { 
  profile: any, 
  onRefresh: () => Promise<void> 
}) {
  const [cvs, setCvs] = useState<any[]>([])
  const [uploadingCv, setUploadingCvs] = useState(false)
  
  // Modals state
  const [activeModal, setActiveModal] = useState<'experience' | 'education' | 'skill' | null>(null)
  const [expForm, setExpForm] = useState({ title: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' })
  const [eduForm, setEduForm] = useState({ school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' })
  const [skillName, setSkillName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const loadCvs = async () => {
    try {
      const res = await api.get('/cv/my')
      setCvs(res.data ?? [])
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void loadCvs()
  }, [])

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCvs(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('isPrimary', 'true')

    try {
      await api.post('/cv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      await loadCvs()
    } catch (err) {
      console.error('CV upload failed:', err)
      alert('Failed to upload CV.')
    } finally {
      setUploadingCvs(false)
    }
  }

  const deleteCv = async (id: number) => {
    if (!window.confirm('Delete this resume?')) return
    await api.delete(`/cv/${id}`)
    await loadCvs()
  }

  const addExperience = async () => {
    setIsSaving(true)
    try {
      await api.post('/profiles/experience', expForm)
      setExpForm({ title: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' })
      setActiveModal(null)
      await onRefresh()
    } finally { setIsSaving(false) }
  }

  const deleteExperience = async (id: number) => {
    if (!window.confirm('Remove this experience?')) return
    await api.delete(`/profiles/experience/${id}`)
    await onRefresh()
  }

  const addEducation = async () => {
    setIsSaving(true)
    try {
      await api.post('/profiles/education', eduForm)
      setEduForm({ school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' })
      setActiveModal(null)
      await onRefresh()
    } finally { setIsSaving(false) }
  }

  const deleteEducation = async (id: number) => {
    if (!window.confirm('Remove this education?')) return
    await api.delete(`/profiles/education/${id}`)
    await onRefresh()
  }

  const addSkill = async () => {
    if (!skillName.trim()) return
    setIsSaving(true)
    try {
      await api.post('/profiles/skill', { name: skillName.trim() })
      setSkillName('')
      setActiveModal(null)
      await onRefresh()
    } finally { setIsSaving(false) }
  }

  const deleteSkill = async (id: number) => {
    await api.delete(`/profiles/skill/${id}`)
    await onRefresh()
  }

  const completeness = useMemo(() => {
    let score = 10
    const bio = profile?.bio || profile?.Bio
    const avatarUrl = profile?.avatarUrl || profile?.AvatarUrl
    const experiences = profile?.experiences || profile?.Experiences
    const skills = profile?.skills || profile?.Skills

    if (bio && bio.trim().length > 0) score += 15
    if (avatarUrl) score += 15
    if (cvs && cvs.length > 0) score += 20
    if (experiences && experiences.length > 0) score += 20
    if (skills && skills.length > 0) score += 20
    return Math.min(score, 100)
  }, [profile, cvs])

  return (
    <Box sx={{ pb: 6 }}>
      <ProfileHeader profile={profile} onRefresh={onRefresh} />

      <Stack spacing={3} sx={{ maxWidth: 800 }}>
        {completeness < 100 && (
          <Paper sx={{ p: 3, border: '1px solid rgba(0,229,255,0.2)', background: 'rgba(0,229,255,0.02)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>Profile Completeness</Typography>
              <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{completeness}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={completeness} sx={{ height: 10, borderRadius: 5 }} />
            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.6 }}>
              Complete your profile to unlock more opportunities!
            </Typography>
          </Paper>
        )}

        <ProfileSection title="Resumes & CVs">
          <Stack spacing={2}>
            {cvs.map(cv => (
              <Paper key={cv.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <DescriptionIcon sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{cv.fileName}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5 }}>Uploaded {new Date(cv.uploadedAt).toLocaleDateString()}</Typography>
                  </Box>
                </Stack>
                <Button size="small" color="error" onClick={() => void deleteCv(cv.id)}>Remove</Button>
              </Paper>
            ))}
            <Button variant="outlined" component="label" startIcon={uploadingCv ? <CircularProgress size={20} /> : <CloudUploadIcon />} disabled={uploadingCv} sx={{ py: 2, borderStyle: 'dashed' }}>
              {uploadingCv ? 'Uploading...' : 'Upload new Resume (PDF)'}
              <input type="file" hidden accept=".pdf" onChange={handleCvUpload} />
            </Button>
          </Stack>
        </ProfileSection>

        <ProfileSection title="About">
          <Typography sx={{ lineHeight: 1.7, opacity: 0.9 }}>
            {profile?.bio || 'No bio provided yet. Tell companies about your professional journey!'}
          </Typography>
        </ProfileSection>

        <ProfileSection title="Experience" onAdd={() => setActiveModal('experience')}>
          <Stack spacing={3}>
            {(profile?.experiences || []).map((exp: any, idx: number) => (
              <Box key={exp.id}>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1 }}>
                    <BusinessCenterIcon sx={{ opacity: 0.5 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>{exp.title}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.8 }}>{exp.company}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>{exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => deleteExperience(exp.id)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>{exp.description}</Typography>
                  </Box>
                </Stack>
                {idx !== profile.experiences.length - 1 && <Divider sx={{ mt: 3, borderColor: 'rgba(255,255,255,0.05)' }} />}
              </Box>
            ))}
            {(!profile?.experiences?.length) && <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>No experience entries added yet.</Typography>}
          </Stack>
        </ProfileSection>

        <ProfileSection title="Education" onAdd={() => setActiveModal('education')}>
          <Stack spacing={3}>
            {(profile?.educations || []).map((edu: any, idx: number) => (
              <Box key={edu.id}>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1 }}>
                    <SchoolIcon sx={{ opacity: 0.5 }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>{edu.school}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>{edu.degree} • {edu.fieldOfStudy}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>{edu.startYear} - {edu.endYear || 'Present'}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => deleteEducation(edu.id)}><DeleteIcon fontSize="small" color="error" /></IconButton>
                    </Stack>
                  </Box>
                </Stack>
                {idx !== profile.educations.length - 1 && <Divider sx={{ mt: 3, borderColor: 'rgba(255,255,255,0.05)' }} />}
              </Box>
            ))}
            {(!profile?.educations?.length) && <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>No education entries added yet.</Typography>}
          </Stack>
        </ProfileSection>

        <ProfileSection title="Skills" onAdd={() => setActiveModal('skill')}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {(profile?.skills || []).map((skill: any) => (
              <Chip 
                key={skill.id} 
                label={skill.name} 
                onDelete={() => deleteSkill(skill.id)}
                variant="outlined" 
                sx={{ borderRadius: 1, fontWeight: 800, border: '1px solid rgba(255,255,255,0.2)' }} 
              />
            ))}
            {(!profile?.skills?.length) && <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>No skills added yet.</Typography>}
          </Box>
        </ProfileSection>

        <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>Profile Tools</Typography>
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" size="small" onClick={() => alert('Feature coming soon.')} sx={{ borderRadius: 20 }}>Get noticed</Button>
            <Button variant="outlined" size="small" onClick={() => alert('Feature coming soon.')} sx={{ borderRadius: 20 }}>Public view</Button>
          </Stack>
        </Paper>
      </Stack>

      {/* Experience Modal */}
      <Dialog open={activeModal === 'experience'} onClose={() => setActiveModal(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Add Experience</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={expForm.title} onChange={e => setExpForm({...expForm, title: e.target.value})} fullWidth />
            <TextField label="Company" value={expForm.company} onChange={e => setExpForm({...expForm, company: e.target.value})} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Start Date (e.g. Jan 2020)" value={expForm.startDate} onChange={e => setExpForm({...expForm, startDate: e.target.value})} fullWidth />
              <TextField label="End Date" value={expForm.endDate} onChange={e => setExpForm({...expForm, endDate: e.target.value})} fullWidth disabled={expForm.isCurrent} />
            </Stack>
            <FormControlLabel control={<Checkbox checked={expForm.isCurrent} onChange={e => setExpForm({...expForm, isCurrent: e.target.checked})} />} label="I am currently working here" />
            <TextField label="Description" value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} fullWidth multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setActiveModal(null)}>Cancel</Button><Button variant="contained" disabled={isSaving} onClick={addExperience}>Save</Button></DialogActions>
      </Dialog>

      {/* Education Modal */}
      <Dialog open={activeModal === 'education'} onClose={() => setActiveModal(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Add Education</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="School" value={eduForm.school} onChange={e => setEduForm({...eduForm, school: e.target.value})} fullWidth />
            <TextField label="Degree" value={eduForm.degree} onChange={e => setEduForm({...eduForm, degree: e.target.value})} fullWidth />
            <TextField label="Field of Study" value={eduForm.fieldOfStudy} onChange={e => setEduForm({...eduForm, fieldOfStudy: e.target.value})} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Start Year" value={eduForm.startYear} onChange={e => setEduForm({...eduForm, startYear: e.target.value})} fullWidth />
              <TextField label="End Year (optional)" value={eduForm.endYear} onChange={e => setEduForm({...eduForm, endYear: e.target.value})} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setActiveModal(null)}>Cancel</Button><Button variant="contained" disabled={isSaving} onClick={addEducation}>Save</Button></DialogActions>
      </Dialog>

      {/* Skill Modal */}
      <Dialog open={activeModal === 'skill'} onClose={() => setActiveModal(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>Add Skill</DialogTitle>
        <DialogContent dividers>
          <TextField label="Skill Name" value={skillName} onChange={e => setSkillName(e.target.value)} fullWidth sx={{ mt: 1 }} autoFocus />
        </DialogContent>
        <DialogActions><Button onClick={() => setActiveModal(null)}>Cancel</Button><Button variant="contained" disabled={isSaving} onClick={addSkill}>Add</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
