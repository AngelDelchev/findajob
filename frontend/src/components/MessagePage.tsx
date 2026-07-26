import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type MessagePageProps = {
  code?: string
  title: string
  description: string
  icon?: ReactNode
  actions?: ReactNode
  details?: string
}

/**
 * Shared layout for the full-page states: not found, forbidden, and the crash
 * screen. Keeping one component means all three look like part of the product
 * rather than three different accidents.
 */
export default function MessagePage({
  code,
  title,
  description,
  icon,
  actions,
  details,
}: MessagePageProps) {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
      }}
    >
      <Paper
        sx={{
          maxWidth: 560,
          width: '100%',
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Stack spacing={2} alignItems="center">
          {icon ? <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box> : null}

          {code ? (
            <Typography
              variant="h1"
              sx={{
                fontWeight: 900,
                lineHeight: 1,
                fontSize: { xs: '4rem', sm: '5.5rem' },
                background: 'linear-gradient(90deg, #00e5ff, #1200ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {code}
            </Typography>
          ) : null}

          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>

          <Typography sx={{ opacity: 0.7, maxWidth: 420 }}>{description}</Typography>

          {details ? (
            <Box
              component="pre"
              sx={{
                mt: 1,
                p: 2,
                width: '100%',
                textAlign: 'left',
                fontSize: '0.75rem',
                borderRadius: 2,
                overflowX: 'auto',
                opacity: 0.6,
                backgroundColor: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {details}
            </Box>
          ) : null}

          {actions ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 2 }}>
              {actions}
            </Stack>
          ) : null}
        </Stack>
      </Paper>
    </Box>
  )
}
