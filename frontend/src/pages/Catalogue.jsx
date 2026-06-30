import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))

export default function Catalogue() {
  const api = useApi()
  const [services, setServices]     = useState([])
  const [categories, setCategories] = useState([])
  const [catFilter, setCatFilter]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm] = useState({
    designation: '', id_categorie: '', format: '', prix_vente_ht: '', unite: ''
  })
  const [saving, setSaving] = useState(false)

  const charger = () => {
    setLoading(true)
    Promise.all([
      api.get('/api/catalogue'),
      api.get('/api/catalogue/categories')
    ]).then(([s, c]) => { setServices(s); setCategories(c) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  const filtres = catFilter
    ? services.filter(s => s.id_categorie == catFilter)
    : services

  const ouvrirEdition = (s) => {
    setEditing(s.id)
    setForm({
      designation: s.designation,
      id_categorie: s.id_categorie,
      format: s.format || '',
      prix_vente_ht: s.prix_vente_ht,
      unite: s.unite || ''
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const annuler = () => {
    setShowForm(false)
    setEditing(null)
    setForm({ designation:'', id_categorie:'', format:'', prix_vente_ht:'', unite:'' })
  }

  const sauver = async () => {
    if (!form.designation || !form.id_categorie || !form.prix_vente_ht)
      return toast.error('Désignation, catégorie et prix requis')
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/api/catalogue/${editing}`, form)
        toast.success('Service mis à jour')
      } else {
        await api.post('/api/catalogue', form)
        toast.success('Service ajouté')
      }
      annuler()
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const supprimer = async (id) => {
    if (!confirm('Désactiver ce service ?')) return
    try {
      await api.delete(`/api/catalogue/${id}`)
      toast.success('Service désactivé')
      charger()
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catalogue services</h1>
          <p className="text-sm text-gray-500">{services.length} service(s) actifs</p>
        </div>
        <button onClick={() => { annuler(); setShowForm(true) }} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Nouveau service
        </button>
      </div>

      {/* Formulaire ajout/édition */}
      {showForm && (
        <div className="card p-5 border-2 border-bjc-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            {editing ? 'Modifier le service' : 'Nouveau service'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Désignation *</label>
              <input className="input" value={form.designation}
                onChange={e => setForm({...form, designation: e.target.value})}
                placeholder="Ex: Impression affiche sur vinyle A4" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Catégorie *</label>
              <select className="select" value={form.id_categorie}
                onChange={e => setForm({...form, id_categorie: e.target.value})}>
                <option value="">— Choisir —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Format</label>
              <input className="input" value={form.format}
                onChange={e => setForm({...form, format: e.target.value})}
                placeholder="A4, 1×1m, recto-verso…" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Unité</label>
              <input className="input" value={form.unite}
                onChange={e => setForm({...form, unite: e.target.value})}
                placeholder="Unité, m², Exemplaire…" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix vente HT (FCFA) *</label>
              <input type="number" className="input" value={form.prix_vente_ht}
                onChange={e => setForm({...form, prix_vente_ht: e.target.value})}
                placeholder="0" min="0" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={sauver} disabled={saving} className="btn-success">
              {saving ? 'Enregistrement…' : editing ? '✔ Mettre à jour' : '+ Ajouter'}
            </button>
            <button onClick={annuler} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Filtres catégories */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setCatFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            !catFilter ? 'bg-bjc-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Tout ({services.length})
        </button>
        {categories.map(c => {
          const nb = services.filter(s => s.id_categorie === c.id).length
          return (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                catFilter == c.id ? 'bg-bjc-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.nom} ({nb})
            </button>
          )
        })}
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Désignation</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Catégorie</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">Format</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Prix HT (FCFA)</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">Unité</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Chargement…</td></tr>
              ) : filtres.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Aucun service dans cette catégorie</td></tr>
              ) : filtres.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{s.designation}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{s.nom_categorie}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 hidden md:table-cell">{s.format || '—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-bjc-600">{fmt(s.prix_vente_ht)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 hidden md:table-cell">{s.unite || '—'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => ouvrirEdition(s)} className="text-gray-400 hover:text-bjc-500 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => supprimer(s.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
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
