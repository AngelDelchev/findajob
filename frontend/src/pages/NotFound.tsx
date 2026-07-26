import { Link as RouterLink } from 'react-router-dom'
import Button from '@mui/material/Button'
import MessagePage from '../components/MessagePage'

export default function NotFound() {
  return (
    <MessagePage
      code="404"
      title="This page does not exist"
      description="The link may be out of date, or the job posting it pointed to has since been removed."
      actions={
        <>
          <Button variant="contained" component={RouterLink} to="/" sx={{ fontWeight: 800, px: 3 }}>
            Back to search
          </Button>
          <Button variant="outlined" onClick={() => window.history.back()} sx={{ fontWeight: 800 }}>
            Go back
          </Button>
        </>
      }
    />
  )
}
