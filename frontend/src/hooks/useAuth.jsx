import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('bjc_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      const stored = localStorage.getItem('bjc_user')
      if (stored) { try { setUser(JSON.parse(stored)) } catch {} }
    }
    setLoading(false)
  }, [])

  const login = (userData, newToken) => {
    setUser(userData)
    setToken(newToken)
    localStorage.setItem('bjc_token', newToken)
    localStorage.setItem('bjc_user', JSON.stringify(userData))
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch {}
    setUser(null)
    setToken(null)
    localStorage.removeItem('bjc_token')
    localStorage.removeItem('bjc_user')
  }

  const can = (...roles) => user && roles.includes(user.role)

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
