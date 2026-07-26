import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { initials } from '../utils'
import type { PublicProfile } from '../types'

/**
 * A profile as other people see it.
 *
 * This used to take `any` and read every field twice (`profile.firstName ||
 * profile.FirstName`) to survive whichever casing the API happened to send. The
 * response shape is now fixed and typed, so one read is enough.
 */
export default function PublicProfileView({ profile }: { profile: PublicProfile | null }) {
  if (!profile) return null

  const location = [profile.city, profile.country].filter(Boolean).join(', ')

  return (
    <Box>
      <Box sx={{ position: 'relative', mb: 8 }}>
        <Box
          sx={{
            height: 140,
            borderRadius: 1,
            backgroundColor: 'rgba(255,255,255,0.05)',
            backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Avatar
          src={profile.avatarUrl ?? undefined}
          alt={`${profile.firstName} ${profile.lastName}`.trim()}
          sx={{
            width: 100,
            height: 100,
            border: '4px solid #02060d',
            position: 'absolute',
            bottom: -50,
            left: 20,
            bgcolor: 'primary.main',
            color: 'background.default',
            fontSize: '2rem',
            fontWeight: 900,
          }}
        >
          {initials(profile.firstName, profile.lastName)}
        </Avatar>
      </Box>

      <Stack spacing={0.5} sx={{ px: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          {`${profile.firstName} ${profile.lastName}`.trim() || profile.companyName || 'Unnamed user'}
        </Typography>

        <Typography variant="h6" sx={{ opacity: 0.9, color: 'primary.main' }}>
          {profile.professionalTitle || profile.companyName || 'Professional'}
        </Typography>

        {profile.companyName && profile.professionalTitle ? (
          <Typography variant="body1" sx={{ opacity: 0.7, fontWeight: 700 }}>
            {profile.companyName}
          </Typography>
        ) : null}

        {location ? (
          <Typography variant="body2" sx={{ opacity: 0.5 }}>
            {location}
          </Typography>
        ) : null}
      </Stack>

      <Divider sx={{ my: 3, opacity: 0.1 }} />

      <Box sx={{ px: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          About
        </Typography>
        <Typography sx={{ opacity: 0.8, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {profile.bio || 'No bio provided.'}
        </Typography>
      </Box>

      {profile.skills.length > 0 ? (
        <Box sx={{ mt: 4, px: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Skills
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {profile.skills.map((skill) => (
              <Chip key={skill.id} label={skill.name} variant="outlined" sx={{ fontWeight: 800 }} />
            ))}
          </Box>
        </Box>
      ) : null}

      {profile.experiences.length > 0 ? (
        <Box sx={{ mt: 4, px: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Experience
          </Typography>
          <Stack spacing={2}>
            {profile.experiences.map((experience) => (
              <Box
                key={experience.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Typography sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {experience.title}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {experience.company}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.5 }}>
                  {experience.startDate} –{' '}
                  {experience.isCurrent ? 'Present' : experience.endDate || 'Present'}
                </Typography>
                {experience.description ? (
                  <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                    {experience.description}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

      {profile.educations.length > 0 ? (
        <Box sx={{ mt: 4, px: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Education
          </Typography>
          <Stack spacing={2}>
            {profile.educations.map((education) => (
              <Box
                key={education.id}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>{education.school}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {[education.degree, education.fieldOfStudy].filter(Boolean).join(' • ')}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.5 }}>
                  {education.startYear} – {education.endYear || 'Present'}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

      {profile.companyName && (profile.companySize || profile.industry) ? (
        <Box
          sx={{
            mt: 4,
            p: 3,
            borderRadius: 2,
            border: '1px solid rgba(0,229,255,0.1)',
            background: 'rgba(0,229,255,0.01)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
            Company details
          </Typography>
          <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap', gap: 2 }}>
            {profile.companySize ? (
              <Box>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}
                >
                  Size
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{profile.companySize}</Typography>
              </Box>
            ) : null}

            {profile.industry ? (
              <Box>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}
                >
                  Industry
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>{profile.industry}</Typography>
              </Box>
            ) : null}
          </Stack>
        </Box>
      ) : null}
    </Box>
  )
}
