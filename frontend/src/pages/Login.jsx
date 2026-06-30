import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const [users, setUsers]         = useState([])
  const [selected, setSelected]   = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)

  // Charge la liste des noms d'utilisateurs (endpoint public minimal)
  useEffect(() => {
    fetch('/api/auth/users-list')
      .then(r => r.json())
      .then(d => { setUsers(d); if (d.length) setSelected(d[0].nom_utilisateur) })
      .catch(() => setUsers([]))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected || !password) return toast.error('Renseignez vos identifiants')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom_utilisateur: selected, mot_de_passe: password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      login(data.user, data.token)
      toast.success(`Bienvenue, ${data.user.nom} !`)
    } catch (err) {
      toast.error(err.message || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-bjc-900 via-bjc-700 to-bjc-500 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-bjc-600">B</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">IMPRIMERIE BJC</h1>
          <p className="text-bjc-100 text-sm mt-1">Système de gestion</p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Utilisateur</label>
              {users.length > 0 ? (
                <select
                  className="select"
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                >
                  {users.map(u => (
                    <option key={u.nom_utilisateur} value={u.nom_utilisateur}>
                      {u.nom_utilisateur} — {u.role}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  placeholder="Nom d'utilisateur"
                  value={selected}
                  onChange={e => setSelected(e.target.value)}
                  autoComplete="username"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Code d'accès</label>
              <input
                type="password"
                className="input"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full py-2.5 mt-2"
              disabled={loading}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            ERP v1.0 — Réseau local
          </p>
        </div>
      </div>
    </div>
  )
}
