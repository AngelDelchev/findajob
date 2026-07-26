import { Link as RouterLink } from 'react-router-dom'
import Typography from '@mui/material/Typography'
import RegistrationForm from '../components/RegistrationForm'

export default function Register() {
  return (
    <RegistrationForm
      role="Employee"
      title="Create account"
      subtitle="Job seeker registration — you can upload a CV and set a profile picture right after."
      addressLabel="Address"
      footer={
        <Typography sx={{ opacity: 0.85 }}>
          Are you an employer?{' '}
          <Typography
            component={RouterLink}
            to="/register/employer"
            sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
          >
            Sign up over here
          </Typography>
        </Typography>
      }
    />
  )
}
