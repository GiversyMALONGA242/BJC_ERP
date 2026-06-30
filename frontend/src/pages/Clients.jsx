import { useState, useEffect, useCallback } from 'react'
import { useApi } from '../hooks/useApi.js'
import toast from 'react-hot-toast'
import { Plus, Pencil, X, Search } from 'lucide-react'

export default function Clients() {
  const api = useApi()
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [saving, setSaving]     = useState(false)

  // Formulaire en state local stable — PAS de re-render parent
  const [nom_client, setNomClient]       = useState('')
  const [telephone, setTelephone]        = useState('')
  const [adresse, setAdresse]            = useState('')
  const [email, setEmail]                = useState('')
  const [rccm, setRccm]                  = useState('')
  const [niu, setNiu]                    = useState('')
  const [rib, setRib]                    = useState('')
  const [regime_fiscal, setRegimeFiscal] = useState('REEL')

  const charger = () => {
    api.get('/api/clients').then(setClients).finally(() => setLoading(false))
  }
  useEffect(() => { charger() }, [])

  const filtres = clients.filter(c =>
    c.nom_client.toLowerCase().includes(search.toLowerCase()) ||
    (c.telephone||'').includes(search) ||
    (c.code_client||'').toLowerCase().includes(search.toLowerCase())
  )

  const resetForm = () => {
    setNomClient(''); setTelephone(''); setAdresse(''); setEmail('')
    setRccm(''); setNiu(''); setRib(''); setRegimeFiscal('REEL')
    setEditing(null)
  }

  const ouvrirEdition = (c) => {
    setEditing(c.id)
    setNomClient(c.nom_client || '')
    setTelephone(c.telephone || '')
    setAdresse(c.adresse || '')
    setEmail(c.email || '')
    setRccm(c.rccm || '')
    setNiu(c.niu || '')
    setRib(c.rib || '')
    setRegimeFiscal(c.regime_fiscal || 'REEL')
    setShowForm(true)
  }

  const annuler = () => { setShowForm(false); resetForm() }

  const sauver = async () => {
    if (!nom_client.trim()) return toast.error('Nom client requis')
    setSaving(true)
    try {
      const body = { nom_client, telephone, adresse, email, rccm, niu, rib, regime_fiscal }
      if (editing) {
        await api.put(`/api/clients/${editing}`, body)
        toast.success('Client mis a jour')
      } else {
        await api.post('/api/clients', body)
        toast.success('Client cree')
      }
      annuler()
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  // Chaque champ est autonome — pas d'objet form partagé pour éviter le re-render
  const Champ = ({ label, value, onChange, type='text', placeholder='' }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">{clients.length} client(s)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Nouveau client
        </button>
      </div>

      {/* Formulaire — champs stables, pas de perte de focus */}
      {showForm && (
        <div className="card p-5 border-2 border-bjc-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              {editing ? 'Modifier le client' : 'Nouveau client'}
            </h2>
            <button onClick={annuler} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Nom client *</label>
              <input className="input" placeholder="Nom de la societe ou personne"
                value={nom_client} onChange={e => setNomClient(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telephone</label>
              <input className="input" placeholder="06 XXX XXXXX"
                value={telephone} onChange={e => setTelephone(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input type="email" className="input" placeholder="contact@exemple.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Regime fiscal</label>
              <select className="select" value={regime_fiscal}
                onChange={e => setRegimeFiscal(e.target.value)}>
                <option value="REEL">Reel</option>
                <option value="SIMPLIFIE">Simplifie</option>
                <option value="EXONERE">Exonere</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Adresse</label>
              <input className="input" placeholder="Adresse complete"
                value={adresse} onChange={e => setAdresse(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">RCCM</label>
              <input className="input" placeholder="Numero RCCM"
                value={rccm} onChange={e => setRccm(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">NIU</label>
              <input className="input" placeholder="Numero Identifiant Unique"
                value={niu} onChange={e => setNiu(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">RIB</label>
              <input className="input" placeholder="Releve d Identite Bancaire"
                value={rib} onChange={e => setRib(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={sauver} disabled={saving} className="btn-success">
              {saving ? 'Enregistrement...' : editing ? 'Mettre a jour' : 'Creer'}
            </button>
            <button onClick={annuler} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Rechercher par nom, telephone ou code..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Nom client</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Telephone</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">Adresse</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden lg:table-cell">RCCM / NIU</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden lg:table-cell">Regime</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Chargement...</td></tr>
              ) : filtres.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  {search ? 'Aucun resultat' : 'Aucun client enregistre'}
                </td></tr>
              ) : filtres.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-medium text-bjc-600">{c.code_client}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-700">{c.nom_client}</td>
                  <td className="px-3 py-2.5 text-gray-500">{c.telephone||'—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 hidden md:table-cell truncate max-w-[160px]">
                    {c.adresse||'—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 hidden lg:table-cell">
                    {[c.rccm, c.niu].filter(Boolean).join(' | ') || '—'}
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {c.regime_fiscal||'REEL'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => ouvrirEdition(c)}
                      className="text-gray-400 hover:text-bjc-500 transition-colors">
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
