import { PropsWithChildren } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useNotifications } from '../notifications'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import NotificationsIcon from '@mui/icons-material/Notifications'

export default function AppShell({ children }: PropsWithChildren) {
  const { user, logout } = useAuth()
  const { unread, refreshUnread } = useNotifications()
  const nav = useNavigate()

  const go = (path: string) => () => nav(path)

  const openNotifications = async () => {
    await refreshUnread()
    nav('/notifications')
  }

  const doLogout = async () => {
    await logout()
    nav('/')
  }

  const roles = user?.roles ?? []
  const isAdmin = roles.includes('Admin')
  const isEmployer = roles.includes('Employer')
  const isEmployee = roles.includes('Employee')

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0} color="transparent" sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          <Typography
            component={RouterLink}
            to="/"
            variant="h6"
            sx={{ textDecoration: 'none', color: 'inherit', fontWeight: 900, letterSpacing: 1 }}
          >
            findajob
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} alignItems="center">
            {isAdmin ? <Button variant="outlined" onClick={go('/admin')}>Admin</Button> : null}
            {isEmployer ? <Button variant="outlined" onClick={go('/employer')}>Employer</Button> : null}
            {isEmployee ? <Button variant="outlined" onClick={go('/employee')}>Employee</Button> : null}

            {user ? (
              <>
                <IconButton color="inherit" onClick={() => void openNotifications()}>
                  <Badge badgeContent={unread} color="primary">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>

                <Button variant="outlined" onClick={go('/messages')}>Messages</Button>

                <Chip label={user.email} variant="outlined" sx={{ borderColor: 'primary.main', color: 'primary.main' }} />
                <Button variant="outlined" onClick={doLogout}>Logout</Button>
              </>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="outlined" onClick={go('/register')}>Register</Button>
                <Button variant="contained" onClick={go('/login')}>Login</Button>
              </Stack>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  )
}
