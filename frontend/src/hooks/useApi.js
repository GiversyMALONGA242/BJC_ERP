import { useAuth } from './useAuth'

const API_BASE = import.meta.env.VITE_API_URL || 'https://bjc-erp-backend.onrender.com'

export function useApi() {
  const { token, logout } = useAuth()

  const request = async (url, options) => {
    // SUPPRIME LE CONSOLE.LOG QUI FUIT LE TOKEN
    const opts = options || {}
    const fullUrl = API_BASE + url
    const res = await fetch(fullUrl, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      body: opts.body || undefined
    })
    if (res.status === 401) { logout(); return }
    let data;
    try {
      data = await res.json()
    } catch {
      throw new Error('Erreur serveur');
    }
    if (!res.ok) throw new Error(data.error || 'Erreur ' + res.status)
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
