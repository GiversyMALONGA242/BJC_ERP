import { useAuth } from './useAuth'

const API_BASE = 'https://bjc-erp-backend.onrender.com'

export function useApi() {
  const { token, logout } = useAuth()

  const request = async (url, options) => {
    const opts = options || {}
    const fullUrl = API_BASE + url
    const res = await fetch(fullUrl, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? 'Bearer ' + token : ''
      },
      body: opts.body || undefined
    })
    if (res.status === 401) { logout(); return }
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erreur ' + res.status)
    return data
  }

  return {
    get: function(url) { return request(url) },
    post: function(url, body) { return request(url, { method: 'POST', body: JSON.stringify(body) }) },
    put: function(url, body) { return request(url, { method: 'PUT', body: JSON.stringify(body) }) },
    patch: function(url, body) { return request(url, { method: 'PATCH', body: JSON.stringify(body) }) },
    delete: function(url) { return request(url, { method: 'DELETE' }) }
  }
}