import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, errorMessage } from '../../api'
import { useToast } from '../../toast'
import { useConfirm } from '../../confirm'
import { formatDate } from '../../utils'
import ProfileHeader from './ProfileHeader'
import ProfileSection from './ProfileSection'
import type { MyProfile } from '../../types'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionIcon from '@mui/icons-material/Description'
import SchoolIcon from '@mui/icons-material/School'

type Cv = {
  id: number
  fileName: string
  fileSize: number
  isPrimary: boolean
  uploadedAt: string
}

type Props = {
  profile: MyProfile | null
  onRefresh: () => Promise<void>
}

const MAX_CV_BYTES = 10 * 1024 * 1024

const emptyExperience = {
  title: '',
  company: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
}

const emptyEducation = { school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }

export default function EmployeeProfile({ profile, onRefresh }: Props) {
  const { showSuccess, showError } = useToast()
  const confirm = useConfirm()

  const [cvs, setCvs] = useState<Cv[]>([])
  const [uploading, setUploading] = useState(false)
  const [activeModal, setActiveModal] = useState<'experience' | 'education' | 'skill' | null>(null)
  const [experienceForm, setExperienceForm] = useState(emptyExperience)
  const [educationForm, setEducationForm] = useState(emptyEducation)
  const [skillName, setSkillName] = useState('')
  const [saving, setSaving] = useState(false)

  const loadCvs = useCallback(async () => {
    try {
      const response = await api.get<Cv[]>('/cv/my')
      setCvs(response.data)
    } catch {
      setCvs([])
    }
  }, [])

  useEffect(() => {
    void loadCvs()
  }, [loadCvs])

  const uploadCv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_CV_BYTES) {
      showError('Please choose a file smaller than 10 MB.')
      event.target.value = ''
      return
    }

    setUploading(true)

    const data = new FormData()
    data.append('file', file)
    data.append('isPrimary', 'true')

    try {
      await api.post('/cv/upload', data)
      await loadCvs()
      showSuccess('CV uploaded.')
    } catch (error) {
      showError(errorMessage(error, 'Could not upload your CV.'))
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const deleteCv = async (cv: Cv) => {
    const confirmed = await confirm({
      title: 'Delete this CV?',
      description: `"${cv.fileName}" will be removed from your profile.`,
      confirmLabel: 'Delete',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/cv/${cv.id}`)
      await loadCvs()
      showSuccess('CV deleted.')
    } catch (error) {
      showError(errorMessage(error, 'Could not delete this CV.'))
    }
  }

  const addExperience = async () => {
    setSaving(true)
    try {
      await api.post('/profiles/experience', experienceForm)
      setExperienceForm(emptyExperience)
      setActiveModal(null)
      await onRefresh()
      showSuccess('Experience added.')
    } catch (error) {
      showError(errorMessage(error, 'Could not add this experience.'))
    } finally {
      setSaving(false)
    }
  }

  const addEducation = async () => {
    setSaving(true)
    try {
      await api.post('/profiles/education', educationForm)
      setEducationForm(emptyEducation)
      setActiveModal(null)
      await onRefresh()
      showSuccess('Education added.')
    } catch (error) {
      showError(errorMessage(error, 'Could not add this education entry.'))
    } finally {
      setSaving(false)
    }
  }

  const addSkill = async () => {
    if (!skillName.trim()) return

    setSaving(true)
    try {
      await api.post('/profiles/skill', { name: skillName.trim() })
      setSkillName('')
      setActiveModal(null)
      await onRefresh()
      showSuccess('Skill added.')
    } catch (error) {
      showError(errorMessage(error, 'Could not add this skill.'))
    } finally {
      setSaving(false)
    }
  }

  const removeItem = async (kind: 'experience' | 'education' | 'skill', id: number) => {
    const confirmed = await confirm({
      title: `Remove this ${kind}?`,
      confirmLabel: 'Remove',
      destructive: true,
    })

    if (!confirmed) return

    try {
      await api.delete(`/profiles/${kind}/${id}`)
      await onRefresh()
      showSuccess('Removed.')
    } catch (error) {
      showError(errorMessage(error, 'Could not remove this entry.'))
    }
  }

  const completeness = useMemo(() => {
    let score = 10
    if (profile?.bio?.trim()) score += 15
    if (profile?.avatarUrl) score += 15
    if (cvs.length > 0) score += 20
    if ((profile?.experiences?.length ?? 0) > 0) score += 20
    if ((profile?.skills?.length ?? 0) > 0) score += 20
    return Math.min(score, 100)
  }, [profile, cvs])

  return (
    <Box sx={{ pb: 6 }}>
      <ProfileHeader profile={profile} onRefresh={onRefresh} />

      <Stack spacing={3} sx={{ maxWidth: 800 }}>
        {completeness < 100 ? (
          <Paper sx={{ p: 3, border: '1px solid rgba(0,229,255,0.2)', background: 'rgba(0,229,255,0.02)' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>Profile completeness</Typography>
              <Typography sx={{ fontWeight: 900, color: 'primary.main' }}>{completeness}%</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={completeness}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.6 }}>
              A complete profile gets noticed by more employers.
            </Typography>
          </Paper>
        ) : null}

        <ProfileSection title="Resumes & CVs">
          <Stack spacing={2}>
            {cvs.map((cv) => (
              <Paper
                key={cv.id}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255,255,255,0.08)',
                  gap: 2,
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
                  <DescriptionIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }} noWrap>
                      {cv.fileName}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5 }}>
                      Uploaded {formatDate(cv.uploadedAt)} · {(cv.fileSize / 1024).toFixed(0)} KB
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    href={`/api/cv/${cv.id}/content`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </Button>
                  <Button size="small" color="error" onClick={() => void deleteCv(cv)}>
                    Remove
                  </Button>
                </Stack>
              </Paper>
            ))}

            <Button
              variant="outlined"
              component="label"
              startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
              disabled={uploading}
              sx={{ py: 2, borderStyle: 'dashed' }}
            >
              {uploading ? 'Uploading…' : 'Upload a resume (PDF, DOC, DOCX)'}
              <input type="file" hidden accept=".pdf,.doc,.docx" onChange={uploadCv} />
            </Button>
          </Stack>
        </ProfileSection>

        <ProfileSection title="About">
          <Typography sx={{ lineHeight: 1.7, opacity: 0.9, whiteSpace: 'pre-wrap' }}>
            {profile?.bio || 'No bio yet. Tell companies about your professional journey.'}
          </Typography>
        </ProfileSection>

        <ProfileSection title="Experience" onAdd={() => setActiveModal('experience')}>
          <Stack spacing={3}>
            {(profile?.experiences ?? []).map((experience, index, array) => (
              <Box key={experience.id}>
                <Stack direction="row" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                    }}
                  >
                    <BusinessCenterIcon sx={{ opacity: 0.5 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>{experience.title}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.8 }}>
                          {experience.company}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>
                          {experience.startDate} –{' '}
                          {experience.isCurrent ? 'Present' : experience.endDate || 'Present'}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        aria-label="Remove experience"
                        onClick={() => void removeItem('experience', experience.id)}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Stack>
                    {experience.description ? (
                      <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                        {experience.description}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
                {index !== array.length - 1 ? (
                  <Divider sx={{ mt: 3, borderColor: 'rgba(255,255,255,0.05)' }} />
                ) : null}
              </Box>
            ))}

            {(profile?.experiences?.length ?? 0) === 0 ? (
              <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>
                No experience added yet.
              </Typography>
            ) : null}
          </Stack>
        </ProfileSection>

        <ProfileSection title="Education" onAdd={() => setActiveModal('education')}>
          <Stack spacing={3}>
            {(profile?.educations ?? []).map((education, index, array) => (
              <Box key={education.id}>
                <Stack direction="row" spacing={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                    }}
                  >
                    <SchoolIcon sx={{ opacity: 0.5 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>{education.school}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          {[education.degree, education.fieldOfStudy].filter(Boolean).join(' • ')}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.5 }}>
                          {education.startYear} – {education.endYear || 'Present'}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        aria-label="Remove education"
                        onClick={() => void removeItem('education', education.id)}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Stack>
                  </Box>
                </Stack>
                {index !== array.length - 1 ? (
                  <Divider sx={{ mt: 3, borderColor: 'rgba(255,255,255,0.05)' }} />
                ) : null}
              </Box>
            ))}

            {(profile?.educations?.length ?? 0) === 0 ? (
              <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>
                No education added yet.
              </Typography>
            ) : null}
          </Stack>
        </ProfileSection>

        <ProfileSection title="Skills" onAdd={() => setActiveModal('skill')}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {(profile?.skills ?? []).map((skill) => (
              <Chip
                key={skill.id}
                label={skill.name}
                onDelete={() => void removeItem('skill', skill.id)}
                variant="outlined"
                sx={{ borderRadius: 1, fontWeight: 800, border: '1px solid rgba(255,255,255,0.2)' }}
              />
            ))}

            {(profile?.skills?.length ?? 0) === 0 ? (
              <Typography sx={{ opacity: 0.5, fontStyle: 'italic' }}>No skills added yet.</Typography>
            ) : null}
          </Box>
        </ProfileSection>
      </Stack>

      <Dialog
        open={activeModal === 'experience'}
        onClose={() => setActiveModal(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Add experience</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={experienceForm.title}
              onChange={(event) => setExperienceForm({ ...experienceForm, title: event.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Company"
              value={experienceForm.company}
              onChange={(event) =>
                setExperienceForm({ ...experienceForm, company: event.target.value })
              }
              fullWidth
              required
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Start date"
                placeholder="Jan 2020"
                value={experienceForm.startDate}
                onChange={(event) =>
                  setExperienceForm({ ...experienceForm, startDate: event.target.value })
                }
                fullWidth
              />
              <TextField
                label="End date"
                value={experienceForm.endDate}
                onChange={(event) =>
                  setExperienceForm({ ...experienceForm, endDate: event.target.value })
                }
                fullWidth
                disabled={experienceForm.isCurrent}
              />
            </Stack>
            <FormControlLabel
              control={
                <Checkbox
                  checked={experienceForm.isCurrent}
                  onChange={(event) =>
                    setExperienceForm({
                      ...experienceForm,
                      isCurrent: event.target.checked,
                      endDate: event.target.checked ? '' : experienceForm.endDate,
                    })
                  }
                />
              }
              label="I currently work here"
            />
            <TextField
              label="Description"
              value={experienceForm.description}
              onChange={(event) =>
                setExperienceForm({ ...experienceForm, description: event.target.value })
              }
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveModal(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saving || !experienceForm.title.trim() || !experienceForm.company.trim()}
            onClick={() => void addExperience()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={activeModal === 'education'}
        onClose={() => setActiveModal(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Add education</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="School"
              value={educationForm.school}
              onChange={(event) => setEducationForm({ ...educationForm, school: event.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Degree"
              value={educationForm.degree}
              onChange={(event) => setEducationForm({ ...educationForm, degree: event.target.value })}
              fullWidth
            />
            <TextField
              label="Field of study"
              value={educationForm.fieldOfStudy}
              onChange={(event) =>
                setEducationForm({ ...educationForm, fieldOfStudy: event.target.value })
              }
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Start year"
                value={educationForm.startYear}
                onChange={(event) =>
                  setEducationForm({ ...educationForm, startYear: event.target.value })
                }
                fullWidth
              />
              <TextField
                label="End year (optional)"
                value={educationForm.endYear}
                onChange={(event) =>
                  setEducationForm({ ...educationForm, endYear: event.target.value })
                }
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveModal(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={saving || !educationForm.school.trim()}
            onClick={() => void addEducation()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={activeModal === 'skill'}
        onClose={() => setActiveModal(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Add skill</DialogTitle>
        <DialogContent dividers>
          <TextField
            label="Skill name"
            value={skillName}
            onChange={(event) => setSkillName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && skillName.trim()) {
                event.preventDefault()
                void addSkill()
              }
            }}
            fullWidth
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveModal(null)}>Cancel</Button>
          <Button variant="contained" disabled={saving || !skillName.trim()} onClick={() => void addSkill()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
