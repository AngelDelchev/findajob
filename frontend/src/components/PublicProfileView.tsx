import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'

type PublicProfileViewProps = {
  profile: any
}

export default function PublicProfileView({ profile }: PublicProfileViewProps) {
  if (!profile) return null

  // Robust property access to handle both camelCase and PascalCase
  const get = (key: string) => profile[key] || profile[key.charAt(0).toUpperCase() + key.slice(1)]

  const firstName = get('firstName')
  const lastName = get('lastName')
  const professionalTitle = get('professionalTitle')
  const companyName = get('companyName')
  const bio = get('bio')
  const city = get('city')
  const country = get('country')
  const avatarUrl = get('avatarUrl')
  const bannerUrl = get('bannerUrl')
  const companySize = get('companySize')
  const industry = get('industry')
  const skills = get('skills') || []
  const experiences = get('experiences') || []

  return (
    <Box>
      {/* Banner & Avatar */}
      <Box sx={{ position: 'relative', mb: 8 }}>
        <Box sx={{ 
          height: 140, 
          borderRadius: 1, 
          backgroundColor: 'rgba(255,255,255,0.05)',
          backgroundImage: bannerUrl ? `url(${bannerUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} />
        <Avatar
          src={avatarUrl}
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
            fontWeight: 900
          }}
        >
          {firstName?.[0]}{lastName?.[0]}
        </Avatar>
      </Box>

      {/* Info Header */}
      <Stack spacing={0.5} sx={{ px: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          {firstName} {lastName}
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, color: 'primary.main' }}>
          {professionalTitle || (companyName ? companyName : 'Professional')}
        </Typography>
        {companyName && professionalTitle && (
          <Typography variant="body1" sx={{ opacity: 0.7, fontWeight: 700 }}>
            {companyName}
          </Typography>
        )}
        <Typography variant="body2" sx={{ opacity: 0.5 }}>
          {city}{city && country ? ', ' : ''}{country}
        </Typography>
      </Stack>

      <Divider sx={{ my: 3, opacity: 0.1 }} />

      {/* Bio / About */}
      <Box sx={{ px: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>About</Typography>
        <Typography sx={{ opacity: 0.8, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {bio || 'No bio provided.'}
        </Typography>
      </Box>

      {/* Skills */}
      {skills.length > 0 && (
        <Box sx={{ mt: 4, px: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Skills</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {skills.map((s: any) => (
              <Chip key={s.id || s.Id} label={s.name || s.Name} variant="outlined" sx={{ fontWeight: 800 }} />
            ))}
          </Stack>
        </Box>
      )}

      {/* Experience */}
      {experiences.length > 0 && (
        <Box sx={{ mt: 4, px: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Experience</Typography>
          <Stack spacing={2}>
            {experiences.map((e: any) => (
              <Box key={e.id || e.Id} sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography sx={{ fontWeight: 800, color: 'primary.main' }}>{e.title || e.Title}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{e.company || e.Company}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.5 }}>{e.startDate || e.StartDate} - {e.endDate || e.EndDate || 'Present'}</Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>{e.description || e.Description}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Company Details (for Employers) */}
      {companyName && (companySize || industry) && (
        <Box sx={{ mt: 4, p: 3, borderRadius: 2, border: '1px solid rgba(0,229,255,0.1)', background: 'rgba(0,229,255,0.01)' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Company Details</Typography>
          <Stack direction="row" spacing={4}>
            {companySize && (
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>Size</Typography>
                <Typography sx={{ fontWeight: 700 }}>{companySize}</Typography>
              </Box>
            )}
            {industry && (
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 800, textTransform: 'uppercase' }}>Industry</Typography>
                <Typography sx={{ fontWeight: 700 }}>{industry}</Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  )
}
