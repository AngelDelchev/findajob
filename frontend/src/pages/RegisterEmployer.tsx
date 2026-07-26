import { Link as RouterLink } from 'react-router-dom'
import Typography from '@mui/material/Typography'
import RegistrationForm from '../components/RegistrationForm'

export default function RegisterEmployer() {
  return (
    <RegistrationForm
      role="Employer"
      title="Employer registration"
      subtitle="Start posting jobs and managing applications today."
      addressLabel="Company location"
      footer={
        <Typography sx={{ opacity: 0.85 }}>
          Looking for a job instead?{' '}
          <Typography
            component={RouterLink}
            to="/register"
            sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
          >
            Sign up as a job seeker
          </Typography>
        </Typography>
      }
    />
  )
}
