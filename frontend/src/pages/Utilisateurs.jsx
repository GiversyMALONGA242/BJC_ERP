import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import { useAuth } from '../hooks/useAuth.jsx'
import toast from 'react-hot-toast'
import { Plus, Trash2, KeyRound, Shield, X } from 'lucide-react'

const ROLE_BADGE = {
  PDG:          'bg-red-100 text-red-800',
  CAISSIERE:    'bg-emerald-100 text-emerald-800',
  COMPTABLE:    'bg-blue-100 text-blue-800',
  GESTIONNAIRE: 'bg-purple-100 text-purple-800'
}

export default function Utilisateurs() {
  const api  = useApi()
  const { user: moi } = useAuth()
  const [users, setUsers]   = useState([])
  const [logs, setLogs]     = useState([])
  const [tab, setTab]       = useState('users')
  const [showForm, setShowForm] = useState(false)
  const [pwdModal, setPwdModal] = useState(null)  // id utilisateur
  const [roleModal, setRoleModal] = useState(null) // { id, role }
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    nom_utilisateur: '', mot_de_passe: '', role: 'CAISSIERE'
  })
  const [newPwd, setNewPwd]   = useState('')
  const [newRole, setNewRole] = useState('')

  const charger = () => {
    api.get('/api/utilisateurs').then(setUsers)
    api.get('/api/utilisateurs/logs').then(setLogs)
  }
  useEffect(() => { charger() }, [])

  const creer = async () => {
    if (!form.nom_utilisateur.trim() || !form.mot_de_passe)
      return toast.error('Nom et mot de passe requis')
    if (form.mot_de_passe.length < 6)
      return toast.error('Mot de passe : 6 caractères minimum')
    setSaving(true)
    try {
      await api.post('/api/utilisateurs', form)
      toast.success(`Utilisateur ${form.nom_utilisateur} créé`)
      setShowForm(false)
      setForm({ nom_utilisateur:'', mot_de_passe:'', role:'CAISSIERE' })
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const changerMdp = async () => {
    if (!newPwd || newPwd.length < 6) return toast.error('6 caractères minimum')
    setSaving(true)
    try {
      await api.put(`/api/utilisateurs/${pwdModal}/password`, { nouveau_mot_de_passe: newPwd })
      toast.success('Mot de passe mis à jour')
      setPwdModal(null); setNewPwd('')
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const changerRole = async () => {
    setSaving(true)
    try {
      await api.put(`/api/utilisateurs/${roleModal.id}/role`, { role: newRole })
      toast.success('Rôle mis à jour')
      setRoleModal(null)
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const desactiver = async (id, nom) => {
    if (!confirm(`Désactiver ${nom} ?`)) return
    try {
      await api.delete(`/api/utilisateurs/${id}`)
      toast.success('Utilisateur désactivé')
      charger()
    } catch (err) { toast.error(err.message) }
  }

  const actionLog = {
    CONNEXION:         'bg-emerald-100 text-emerald-700',
    DECONNEXION:       'bg-gray-100 text-gray-600',
    CREATION_FACTURE:  'bg-bjc-100 text-bjc-700',
    CONNEXION_ECHOUEE: 'bg-red-100 text-red-700',
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500">Gestion des accès — PDG uniquement</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Nouveau
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="card p-5 border-2 border-bjc-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Créer un utilisateur</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom d'utilisateur *</label>
              <input className="input" value={form.nom_utilisateur}
                onChange={e => setForm({...form, nom_utilisateur: e.target.value})}
                placeholder="Ex: Marie" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mot de passe * (min. 6 car.)</label>
              <input type="password" className="input" value={form.mot_de_passe}
                onChange={e => setForm({...form, mot_de_passe: e.target.value})}
                placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rôle</label>
              <select className="select" value={form.role}
                onChange={e => setForm({...form, role: e.target.value})}>
                <option value="PDG">PDG (accès total)</option>
                <option value="GESTIONNAIRE">Gestionnaire</option>
                <option value="COMPTABLE">Comptable</option>
                <option value="CAISSIERE">Caissière</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-400 mb-3">
            <strong>PDG</strong> : tout · <strong>Gestionnaire</strong> : stock + catalogue + clients ·
            <strong> Comptable</strong> : ventes + charges · <strong>Caissière</strong> : facturation + clients
          </div>
          <div className="flex gap-2">
            <button onClick={creer} disabled={saving} className="btn-success">
              {saving ? 'Création…' : '+ Créer utilisateur'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[['users', 'Comptes utilisateurs'], ['logs', 'Journal de connexions']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-bjc-500 text-bjc-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {/* Liste utilisateurs */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Utilisateur</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Rôle</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">Dernière connexion</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Statut</th>
                <th className="px-3 py-2.5 text-xs font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-bjc-100 text-bjc-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {u.nom_utilisateur[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-700">{u.nom_utilisateur}</span>
                      {u.id === moi?.id && (
                        <span className="text-xs text-gray-400">(moi)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {u.derniere_connexion
                      ? new Date(u.derniere_connexion).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                      : 'Jamais'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setRoleModal({ id: u.id, role: u.role }); setNewRole(u.role) }}
                        title="Changer le rôle"
                        className="text-gray-400 hover:text-bjc-500 transition-colors">
                        <Shield size={14} />
                      </button>
                      <button
                        onClick={() => setPwdModal(u.id)}
                        title="Changer le mot de passe"
                        className="text-gray-400 hover:text-bjc-500 transition-colors">
                        <KeyRound size={14} />
                      </button>
                      {u.actif && u.id !== moi?.id && (
                        <button
                          onClick={() => desactiver(u.id, u.nom_utilisateur)}
                          title="Désactiver"
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Journal connexions */}
      {tab === 'logs' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date / Heure</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Utilisateur</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Rôle</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Action</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucun log</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString('fr-FR', {
                        day:'2-digit', month:'2-digit', year:'numeric',
                        hour:'2-digit', minute:'2-digit'
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-700">{l.nom_utilisateur || '?'}</td>
                    <td className="px-3 py-2.5">
                      {l.role && (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[l.role] || 'bg-gray-100 text-gray-600'}`}>
                          {l.role}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${actionLog[l.action] || 'bg-gray-100 text-gray-600'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 hidden md:table-cell">{l.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal mot de passe */}
      {pwdModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><KeyRound size={16} /> Changer le mot de passe</h3>
              <button onClick={() => { setPwdModal(null); setNewPwd('') }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <input type="password" className="input mb-4" placeholder="Nouveau mot de passe (min. 6 car.)"
              value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={changerMdp} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Mise à jour…' : 'Confirmer'}
              </button>
              <button onClick={() => { setPwdModal(null); setNewPwd('') }} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal rôle */}
      {roleModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Shield size={16} /> Changer le rôle</h3>
              <button onClick={() => setRoleModal(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <select className="select mb-4" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="PDG">PDG (accès total)</option>
              <option value="GESTIONNAIRE">Gestionnaire</option>
              <option value="COMPTABLE">Comptable</option>
              <option value="CAISSIERE">Caissière</option>
            </select>
            <div className="flex gap-2">
              <button onClick={changerRole} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Mise à jour…' : 'Confirmer'}
              </button>
              <button onClick={() => setRoleModal(null)} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
