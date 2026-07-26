import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { api, errorMessage } from '../api'
import PublicProfileView from './PublicProfileView'
import type { PublicProfile } from '../types'

type Props = {
  /** Id of the user whose profile to show, or null to keep the dialog closed. */
  userId: string | null
  onClose: () => void
}

/**
 * Loads and shows someone's public profile.
 *
 * The public profile endpoint existed, but nothing outside the search page linked to
 * it: an administrator could edit or delete an account without ever being able to see
 * who it belonged to. This component gives every list a consistent way in.
 */
export default function ProfileDialog({ userId, onClose }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')

    api
      .get<PublicProfile>(`/profiles/${userId}`)
      .then((response) => {
        if (!cancelled) setProfile(response.data)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load this profile.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <Dialog open={userId !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900 }}>Profile</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <PublicProfileView profile={profile} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
