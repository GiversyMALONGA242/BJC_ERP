import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import toast from 'react-hot-toast'
import { Plus, Trash2, Link, Search } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n||0))
const fmtD = n => new Intl.NumberFormat('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:4}).format(n||0)

export default function FichesTechniques() {
  const api = useApi()
  const [fiches, setFiches]       = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [produits, setProduits]   = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)

  const [form, setForm] = useState({
    id_service: '', id_produit_brut: '', quantite_conso: '', unite_conso: ''
  })

  const charger = () => {
    setLoading(true)
    Promise.all([
      api.get('/api/fiches-techniques'),
      api.get('/api/catalogue'),
      api.get('/api/stock'),
      api.get('/api/catalogue/categories')
    ]).then(([f,c,p,cats]) => {
      setFiches(f); setCatalogue(c); setProduits(p); setCategories(cats)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { charger() }, [])

  const servicesFiltres = catFilter
    ? catalogue.filter(s => s.id_categorie == catFilter)
    : catalogue

  const fichesFiltres = fiches.filter(f =>
    f.service_nom?.toLowerCase().includes(search.toLowerCase()) ||
    f.produit_nom?.toLowerCase().includes(search.toLowerCase())
  )

  // Grouper par service
  const grouped = fichesFiltres.reduce((acc, f) => {
    const key = f.id_service
    if (!acc[key]) acc[key] = { service_nom: f.service_nom, service_categorie: f.service_categorie, items: [] }
    acc[key].items.push(f)
    return acc
  }, {})

  const selectService = (id) => {
    setForm(f => ({ ...f, id_service: id }))
  }

  const creer = async () => {
    if (!form.id_service || !form.id_produit_brut || !form.quantite_conso)
      return toast.error('Service, produit et quantite requis')
    setSaving(true)
    try {
      await api.post('/api/fiches-techniques', form)
      toast.success('Liaison creee')
      setShowForm(false)
      setForm({ id_service:'', id_produit_brut:'', quantite_conso:'', unite_conso:'' })
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const supprimer = async (id, svc, prod) => {
    if (!confirm(`Supprimer la liaison "${svc}" → "${prod}" ?`)) return
    try {
      await api.delete(`/api/fiches-techniques/${id}`)
      toast.success('Liaison supprimee')
      charger()
    } catch (err) { toast.error(err.message) }
  }

  // Calcul cout theorique d'un service
  const coutService = (id_service) => {
    const items = fiches.filter(f => f.id_service == id_service)
    return items.reduce((s, f) => {
      const prod = produits.find(p => p.id == f.id_produit_brut)
      return s + (f.quantite_conso * (prod?.prix_achat_moyen_pondere || 0))
    }, 0)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fiches techniques</h1>
          <p className="text-sm text-gray-500">
            Lier les matières premières aux services du catalogue
            <span className="ml-2 text-bjc-500 font-medium">
              (optionnel — un service sans fiche peut quand même être vendu)
            </span>
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Nouvelle liaison
        </button>
      </div>

      {/* Info */}
      <div className="bg-bjc-50 border border-bjc-200 rounded-xl p-3 text-sm text-bjc-700">
        <strong>Comment ça marche :</strong> Si un service est lié à une matière première,
        le stock se déduit automatiquement à chaque vente de ce service.
        Si aucun lien n'existe, la vente se fait normalement sans toucher au stock.
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="card p-5 border-2 border-bjc-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Créer une liaison Service → Matière</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Catégorie (filtre)</label>
              <select className="select" value={catFilter}
                onChange={e => setCatFilter(e.target.value)}>
                <option value="">Toutes</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Service du catalogue *</label>
              <select className="select" value={form.id_service}
                onChange={e => selectService(e.target.value)}>
                <option value="">— Choisir le service —</option>
                {servicesFiltres.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.designation} {s.format ? `(${s.format})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Matière première / Produit consommé *</label>
              <select className="select" value={form.id_produit_brut}
                onChange={e => setForm(f => ({...f, id_produit_brut: e.target.value}))}>
                <option value="">— Choisir la matière —</option>
                {produits.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.designation} (stock: {fmtD(p.stock_actuel)} {p.unite_mesure} | PUMP: {fmt(p.prix_achat_moyen_pondere)} FCFA)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Quantité consommée par unité vendue *
              </label>
              <input type="number" className="input" value={form.quantite_conso}
                onChange={e => setForm(f => ({...f, quantite_conso: e.target.value}))}
                placeholder="Ex: 0.25 pour 0.25 m²" min="0" step="0.0001" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Unité (optionnel)</label>
              <input className="input" value={form.unite_conso}
                onChange={e => setForm(f => ({...f, unite_conso: e.target.value}))}
                placeholder="m², feuille, ml…" />
            </div>

            {/* Preview coût */}
            {form.id_service && form.id_produit_brut && form.quantite_conso && (() => {
              const prod = produits.find(p => p.id == form.id_produit_brut)
              const coutUnit = parseFloat(form.quantite_conso) * (prod?.prix_achat_moyen_pondere || 0)
              const svc = catalogue.find(s => s.id == form.id_service)
              const marge = svc ? svc.prix_vente_ht - coutUnit : 0
              return (
                <div className="col-span-2 md:col-span-3 bg-green-50 rounded-lg p-3 text-xs grid grid-cols-3 gap-2">
                  <div><span className="text-gray-500">Coût matière/unité :</span> <strong className="text-red-600">{fmt(coutUnit)} FCFA</strong></div>
                  <div><span className="text-gray-500">Prix vente HT :</span> <strong className="text-bjc-600">{fmt(svc?.prix_vente_ht)} FCFA</strong></div>
                  <div><span className="text-gray-500">Marge estimée :</span> <strong className={marge >= 0 ? 'text-emerald-600' : 'text-red-600'}>{fmt(marge)} FCFA</strong></div>
                </div>
              )
            })()}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={creer} disabled={saving} className="btn-success">
              {saving ? 'Création…' : '+ Créer la liaison'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Rechercher un service ou une matière…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Liste groupée par service */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Chargement…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <Link size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Aucune fiche technique créée</p>
          <p className="text-xs mt-1">Cliquez sur "Nouvelle liaison" pour commencer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([serviceId, grp]) => {
            const cout = coutService(serviceId)
            const svc  = catalogue.find(s => s.id == serviceId)
            const marge = svc ? svc.prix_vente_ht - cout : 0
            return (
              <div key={serviceId} className="card overflow-hidden">
                <div className="px-4 py-3 bg-bjc-50 border-b border-bjc-100 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-bjc-700 text-sm">{grp.service_nom}</span>
                    <span className="ml-2 text-xs text-gray-400">{grp.service_categorie}</span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-gray-500">Coût matière : <strong className="text-red-600">{fmt(cout)} FCFA</strong></span>
                    {svc && <span className="text-gray-500">Prix vente : <strong className="text-bjc-600">{fmt(svc.prix_vente_ht)} FCFA</strong></span>}
                    {svc && <span className={`font-bold ${marge >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Marge : {fmt(marge)} FCFA</span>}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Matière première</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Qté consommée</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Unité</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Stock dispo</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Coût unitaire</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {grp.items.map(f => {
                      const prod   = produits.find(p => p.id == f.id_produit_brut)
                      const coutU  = f.quantite_conso * (prod?.prix_achat_moyen_pondere || 0)
                      const stockOk = prod && prod.stock_actuel >= f.quantite_conso
                      return (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700 font-medium">{f.produit_nom}</td>
                          <td className="px-3 py-2.5 text-right">{fmtD(f.quantite_conso)}</td>
                          <td className="px-3 py-2.5 text-gray-400 text-xs">{f.unite_conso || f.unite_mesure}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`text-xs font-medium ${stockOk ? 'text-emerald-600' : 'text-red-500'}`}>
                              {fmtD(prod?.stock_actuel || 0)} {f.unite_mesure}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-gray-500">{fmt(coutU)} FCFA</td>
                          <td className="px-3 py-2.5">
                            <button onClick={() => supprimer(f.id, grp.service_nom, f.produit_nom)}
                              className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* Services sans fiche */}
      {!search && (() => {
        const avecFiche = new Set(fiches.map(f => f.id_service))
        const sansFiche = catalogue.filter(s => !avecFiche.has(s.id))
        if (!sansFiche.length) return null
        return (
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
              Services sans fiche technique ({sansFiche.length}) — vendables normalement
            </p>
            <div className="flex flex-wrap gap-2">
              {sansFiche.map(s => (
                <span key={s.id} className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  {s.designation}
                </span>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
