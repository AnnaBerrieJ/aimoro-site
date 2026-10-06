'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as api from '@/lib/agent'

interface AuthState {
  user: api.User | null
  loading: boolean
  login: (email: string, password: string) => Promise<api.User>
  signup: (body: api.SignupInput) => Promise<api.User>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api.getToken()) { setLoading(false); return }
    api.me()
      .then(setUser)
      .catch(() => api.setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    api.setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const signup = useCallback(async (body: api.SignupInput) => {
    const res = await api.signup(body)
    api.setToken(res.token)
    setUser(res.user)
    return res.user
  }, [])

  const logout = useCallback(() => {
    api.setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
