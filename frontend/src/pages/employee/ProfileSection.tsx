import { type ReactNode } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'

type ProfileSectionProps = {
  title: string
  onAdd?: () => void
  onEdit?: () => void
  children: ReactNode
}

export default function ProfileSection({ title, onAdd, onEdit, children }: ProfileSectionProps) {
  return (
    <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>{title}</Typography>
        <Stack direction="row" spacing={1}>
          {onAdd && (
            <IconButton size="small" onClick={onAdd}>
              <AddIcon />
            </IconButton>
          )}
          {onEdit && (
            <IconButton size="small" onClick={onEdit}>
              <EditIcon />
            </IconButton>
          )}
        </Stack>
      </Stack>
      <Box>
        {children}
      </Box>
    </Paper>
  )
}
