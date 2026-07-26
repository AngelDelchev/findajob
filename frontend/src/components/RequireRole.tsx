import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../auth'
import type { Role } from '../types'
import Forbidden from '../pages/Forbidden'

type RequireRoleProps = {
  roles: Role[]
  children: ReactNode
}

/**
 * Gate for the role-specific dashboards.
 *
 * This component existed but was never used: every route was public, so an
 * anonymous visitor could open /admin and watch it fail one API call at a time.
 * The server is still the real authority; this only keeps the UI honest.
 */
export default function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) {
    // Remember where they were heading so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (!roles.some((role) => user.roles?.includes(role))) {
    return <Forbidden />
  }

  return <>{children}</>
}
