import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, errorMessage } from '../../api'
import { AuthContext } from '../../auth'
import type { AuthContextType, LoginResult } from '../../auth'
import type { CurrentUser, Role } from '../../types'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<CurrentUser>('/auth/me')
      setUser(response.data)
    } catch {
      // A 401 here simply means nobody is signed in.
      setUser(null)
    }
  }, [])

  /**
   * Returns the reason on failure instead of a bare boolean, so the login form can
   * tell "wrong password" apart from "unconfirmed email", "locked out" and "rate
   * limited" rather than always showing "Invalid credentials".
   */
  const login = useCallback(async (loginName: string, password: string): Promise<LoginResult> => {
    try {
      const response = await api.post<{ user: CurrentUser }>('/auth/login', {
        loginName,
        password,
      })

      setUser(response.data.user)
      return { ok: true, user: response.data.user }
    } catch (error) {
      setUser(null)
      return { ok: false, error: errorMessage(error, 'Invalid credentials.') }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
      hasRole: (...roles: Role[]) => roles.some((role) => user?.roles?.includes(role) ?? false),
    }),
    [user, loading, login, logout, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
