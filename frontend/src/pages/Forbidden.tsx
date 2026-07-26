import { Link as RouterLink } from 'react-router-dom'
import Button from '@mui/material/Button'
import MessagePage from '../components/MessagePage'
import { useAuth } from '../auth'

export default function Forbidden() {
  const { user } = useAuth()

  return (
    <MessagePage
      code="403"
      title="You do not have access to this area"
      description={
        user
          ? 'This section is reserved for a different type of account. If you believe this is a mistake, contact an administrator.'
          : 'You need to be signed in to view this page.'
      }
      actions={
        <>
          <Button variant="contained" component={RouterLink} to="/" sx={{ fontWeight: 800, px: 3 }}>
            Back to search
          </Button>
          {user ? null : (
            <Button variant="outlined" component={RouterLink} to="/login" sx={{ fontWeight: 800 }}>
              Log in
            </Button>
          )}
        </>
      }
    />
  )
}
