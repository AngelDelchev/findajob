import { useState } from 'react'
import type { PropsWithChildren } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useNotifications } from '../notifications'
import { initials } from '../utils'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import LogoutIcon from '@mui/icons-material/Logout'
import MailIcon from '@mui/icons-material/MailOutline'
import NotificationsIcon from '@mui/icons-material/Notifications'
import PersonIcon from '@mui/icons-material/Person'

export default function AppShell({ children }: PropsWithChildren) {
  const { user, logout, hasRole } = useAuth()
  const { unread } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const dashboardPath = hasRole('Admin')
    ? '/admin'
    : hasRole('Employer')
      ? '/employer'
      : '/employee'

  const dashboardLabel = hasRole('Admin')
    ? 'Administration'
    : hasRole('Employer')
      ? 'Employer dashboard'
      : 'My dashboard'

  const handleLogout = async () => {
    setAnchorEl(null)
    await logout()
    navigate('/')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Toolbar>
          <Typography
            component={RouterLink}
            to="/"
            variant="h6"
            sx={{
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 900,
              letterSpacing: 1,
            }}
          >
            findajob
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {user ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant={location.pathname === dashboardPath ? 'contained' : 'text'}
                onClick={() => navigate(dashboardPath)}
                sx={{ fontWeight: 700, display: { xs: 'none', sm: 'inline-flex' } }}
              >
                {dashboardLabel}
              </Button>

              <IconButton
                color="inherit"
                onClick={() => navigate('/messages')}
                aria-label="Messages"
              >
                <MailIcon />
              </IconButton>

              <IconButton
                color="inherit"
                onClick={() => navigate('/notifications')}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              >
                <Badge badgeContent={unread} color="primary" invisible={unread === 0}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>

              <IconButton
                onClick={(event) => setAnchorEl(event.currentTarget)}
                aria-label="Account menu"
                sx={{ ml: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    bgcolor: 'primary.main',
                    color: 'background.default',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                  }}
                >
                  {initials(user.firstName, user.lastName) === '?'
                    ? user.email[0]?.toUpperCase()
                    : initials(user.firstName, user.lastName)}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                slotProps={{
                  paper: {
                    sx: {
                      minWidth: 220,
                      border: '1px solid rgba(255,255,255,0.08)',
                    },
                  },
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography sx={{ fontWeight: 800 }} noWrap>
                    {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.6 }} noWrap>
                    {user.email}
                  </Typography>
                </Box>

                <Divider sx={{ opacity: 0.1 }} />

                <MenuItem
                  onClick={() => {
                    setAnchorEl(null)
                    navigate(dashboardPath)
                  }}
                >
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  {dashboardLabel}
                </MenuItem>

                <MenuItem onClick={() => void handleLogout()} sx={{ color: 'error.main' }}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  Log out
                </MenuItem>
              </Menu>
            </Stack>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => navigate('/register')}>
                Register
              </Button>
              <Button variant="contained" onClick={() => navigate('/login')}>
                Log in
              </Button>
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {children}
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.4 }}>
          FindAJob — a full-stack job board built with ASP.NET Core and React
        </Typography>
      </Box>
    </Box>
  )
}
