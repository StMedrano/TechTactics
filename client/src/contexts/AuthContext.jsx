import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiRequest, setSessionToken } from '../services/apiClient'
import { parseSessionToken } from '../utils/sessionToken'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('tt-session-token') : ''
    const tokenUser = parseSessionToken(savedToken)

    if (tokenUser && isMounted) {
      setUser(tokenUser)
      setLoading(false)
    }

    if (!savedToken) {
      setLoading(false)
      return () => {
        isMounted = false
      }
    }

    apiRequest('/auth/session')
      .then((payload) => {
        if (isMounted) {
          setUser(payload?.user || null)
        }
      })
      .catch(() => {
        if (isMounted) {
          if (!tokenUser) {
            setUser(null)
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const payload = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setSessionToken(payload.token)
    setUser(payload.user)
    return payload.user
  }, [])

  const register = useCallback(async ({ name, email, password, phone, address }) => {
    const payload = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone, address }),
    })
    setSessionToken(payload.token)
    setUser(payload.user)
    return payload.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } finally {
      setSessionToken('')
      setUser(null)
    }
  }, [])

  const completeSsoLogin = useCallback(async (token) => {
    setSessionToken(token)
    const tokenUser = parseSessionToken(token)
    if (tokenUser) {
      setUser(tokenUser)
      return tokenUser
    }

    const payload = await apiRequest('/auth/session')
    setUser(payload.user)
    return payload.user
  }, [])

  const value = useMemo(
    () => ({
      user,
      session: { user },
      login,
      register,
      completeSsoLogin,
      logout,
      loading,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, register],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
