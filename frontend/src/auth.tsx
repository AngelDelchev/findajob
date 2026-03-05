import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'

type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  companyName?: string | null
  professionalTitle?: string | null
  roles: string[]
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  refreshUser: () => Promise<void>
  login: (loginName: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data)
    } catch {
      setUser(null)
    }
  }

  const login = async (loginName: string, password: string) => {
    try {
      await api.post('/auth/login', { loginName, password })
      await refreshUser()
      return true
    } catch {
      setUser(null)
      return false
    }
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await refreshUser()
      setLoading(false)
    }

    void init()
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      login,
      logout
    }),
    [user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
