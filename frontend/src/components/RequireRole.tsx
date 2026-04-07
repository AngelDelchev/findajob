import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function RequireRole({ role, children }: PropsWithChildren<{ role: string }>) {
  const { user, loading } = useAuth()

  if (loading) return <div style={{ opacity: 0.8, padding: 16 }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!user.roles?.includes(role)) return <Navigate to="/" replace />

  return <>{children}</>
}
