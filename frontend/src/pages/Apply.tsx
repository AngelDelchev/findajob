import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

export default function Apply() {
  const { id } = useParams()
  const jobId = Number(id)
  const nav = useNavigate()
  const { user } = useAuth()

  const [applicantName, setApplicantName] = useState('')
  const [applicantEmail, setApplicantEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
    setApplicantName(fullName)
    setApplicantEmail(user?.email ?? '')
  }, [user])

  const submit = async () => {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.post('/application', {
        jobId,
        applicantName,
        applicantEmail,
        message,
      })

      setSuccess('Application submitted successfully.')
      setTimeout(() => nav('/employee'), 900)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Application failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper sx={{ p: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        Apply
      </Typography>

      <Stack spacing={2} sx={{ mt: 2 }}>
        <TextField label="Full name" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} />
        <TextField label="Email" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} />
        <TextField
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          minRows={5}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" onClick={() => nav(-1)}>
            Back
          </Button>
          <Button variant="contained" disabled={saving} onClick={() => void submit()}>
            Submit application
          </Button>
        </Box>
      </Stack>
    </Paper>
  )
}
