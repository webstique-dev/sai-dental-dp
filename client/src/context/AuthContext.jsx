import { useCallback, useEffect, useState } from 'react'
import {
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  changePassword as apiChangePassword,
  logout as apiLogout,
} from '../services/authService'
import { tokenStore } from '../utils/token'
import { AuthContext } from './context'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!tokenStore.getAccessToken()) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const res = await fetchMe()
        if (!cancelled) setUser(res.user)
      } catch {
        if (!cancelled) tokenStore.clear()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await apiLogin({ email, password })
    setUser(u)
    return u
  }, [])

  const register = useCallback(async (userData) => {
    const res = await apiRegister(userData)
    return res
  }, [])

  const changePassword = useCallback(async (passwordData) => {
    const res = await apiChangePassword(passwordData)
    if (res.user) {
      setUser(res.user)
    }
    return res
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  )
}