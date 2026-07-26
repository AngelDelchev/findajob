import { createContext, useContext } from 'react'
import type { CurrentUser, Role } from './types'

export type LoginResult = { ok: true; user: CurrentUser } | { ok: false; error: string }

export type AuthContextType = {
  user: CurrentUser | null
  loading: boolean
  login: (loginName: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  hasRole: (...roles: Role[]) => boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/** Where a user should land after signing in, based on their role. */
export function homePathFor(user: CurrentUser | null): string {
  if (!user) return '/'
  if (user.roles?.includes('Admin')) return '/admin'
  if (user.roles?.includes('Employer')) return '/employer'
  if (user.roles?.includes('Employee')) return '/employee'
  return '/'
}
