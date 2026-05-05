import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'

type User = {
  id: string
  email: string
  firstName?: string
  lastName?: string
  companyName?: string
  professionalTitle?: string
  roles: string[]
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (loginName: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
    } catch {
      setUser(null)
    }
  }

  const login = async (loginName: string, password: string) => {
    try {
      await api.post('/auth/login', { loginName, password })
      const res = await api.get('/auth/me')
      setUser(res.data)
      return true
    } catch {
      setUser(null)
      return false
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }

  useEffect(() => {
    const init = async () => {
      await refreshUser()
      setLoading(false)
    }

    void init()
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      refreshUser,
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
