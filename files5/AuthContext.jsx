/**
 * context/AuthContext.jsx
 * ────────────────────────
 * Global authentication state via React Context.
 * Persists the JWT token in localStorage.
 * Provides: user, token, login(), register(), logout(), isAuthenticated
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { loginUser, registerUser, getMe } from '../services/api'

const AuthContext = createContext(null)

const TOKEN_KEY = 'meeting_copilot_token'

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [token,   setToken]   = useState(() => localStorage.getItem(TOKEN_KEY))
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY))

  // On mount: if we have a stored token, fetch the user profile
  useEffect(() => {
    if (!token) { setLoading(false); return }
    getMe()
      .then((data) => setUser(data))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const _storeToken = (t) => {
    localStorage.setItem(TOKEN_KEY, t)
    setToken(t)
    // Inject into axios default headers for subsequent requests
    import('../services/api').then(({ api }) => {
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`
    })
  }

  const login = useCallback(async (email, password) => {
    const res = await loginUser({ email, password })
    _storeToken(res.access_token)
    setUser({ user_id: res.user_id, email: res.email, name: res.name })
    toast.success(`Welcome back, ${res.name}!`)
    return res
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await registerUser({ name, email, password })
    _storeToken(res.access_token)
    setUser({ user_id: res.user_id, email: res.email, name: res.name })
    toast.success(`Account created! Welcome, ${res.name}.`)
    return res
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    import('../services/api').then(({ api }) => {
      delete api.defaults.headers.common['Authorization']
    })
    toast.success('Logged out')
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
