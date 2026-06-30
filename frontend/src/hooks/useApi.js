import { useAuth } from './useAuth'

// En production (Render), utiliser l'URL du backend Render
// En développement, utiliser le proxy Vite (localhost:3001)
const API_BASE = import.meta.env.VITE_API_URL || ''

export function useApi() {
  const { token, logout } = useAuth()

  const request = async (url, options = {}) => {
    const fullUrl = API_BASE + url
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    })
    if (res.status === 401) { logout(); return }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
    return data
  }

  return {
    get:    (url)       => request(url),
    post:   (url, body) => request(url, { method: 'POST',   body: JSON.stringify(body) }),
    put:    (url, body) => request(url, { method: 'PUT',    body: JSON.stringify(body) }),
    patch:  (url, body) => request(url, { method: 'PATCH',  body: JSON.stringify(body) }),
    delete: (url)       => request(url, { method: 'DELETE' })
  }
}
