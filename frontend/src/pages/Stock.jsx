import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import toast from 'react-hot-toast'
import { AlertTriangle, Plus, Trash2, Search } from 'lucide-react'

const fmt  = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
const fmtD = n => new Intl.NumberFormat('fr-FR',{minimumFractionDigits:0,maximumFractionDigits:3}).format(n||0)

const CATEGORIES = ['Grand Format','Serigraphie','Edition','Gadget','Consommable']
const UNITES     = ['unite','m2','page','litre','kg','ml']

export default function Stock() {
  const api = useApi()
  const [produits, setProduits]     = useState([])
  const [mouvements, setMouvements] = useState([])
  const [tab, setTab]               = useState('produits')
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [showEntree, setShowEntree] = useState(false)
  const [saving, setSaving]         = useState(false)

  // Formulaire entrée
  const [mode, setMode]             = useState('choisir') // 'choisir' | 'nouveau'
  const [idProd, setIdProd]         = useState('')
  const [nomLibre, setNomLibre]     = useState('')
  const [categorieLibre, setCategorieLibre] = useState('Consommable')
  const [qte, setQte]               = useState('')
  const [prixAchat, setPrixAchat]   = useState('')
  const [refDoc, setRefDoc]         = useState('')
  const [noteE, setNoteE]           = useState('')

  const charger = () => {
    setLoading(true)
    Promise.all([api.get('/api/stock'), api.get('/api/stock/mouvements')])
      .then(([p,m]) => { setProduits(p); setMouvements(m) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { charger() }, [])

  const alertes = produits.filter(p => p.statut_stock === 'ALERTE')
  const valeurTotale = produits.reduce((s,p) => s + parseFloat(p.valeur_stock_ht||0), 0)

  const produitsFiltres = produits.filter(p =>
    p.designation.toLowerCase().includes(search.toLowerCase()) ||
    (p.reference||'').toLowerCase().includes(search.toLowerCase())
  )

  const resetForm = () => {
    setMode('choisir'); setIdProd(''); setNomLibre(''); setQte(''); setPrixAchat(''); setRefDoc(''); setNoteE('')
    setShowEntree(false)
  }

  const entreeStock = async () => {
    if (!qte || !prixAchat) return toast.error('Quantité et prix requis')
    if (mode === 'choisir' && !idProd) return toast.error('Sélectionnez un produit')
    if (mode === 'nouveau' && !nomLibre.trim()) return toast.error('Saisissez le nom du produit')
    setSaving(true)
    try {
      const body = {
        quantite: parseFloat(qte),
        prix_achat: parseFloat(prixAchat),
        reference_doc: refDoc || null,
        notes: noteE || null,
        ...(mode === 'choisir'
          ? { id_produit: parseInt(idProd) }
          : { designation_libre: nomLibre.trim(), categorie: categorieLibre })
      }
      const res = await api.post('/api/stock/entree', body)
      toast.success(`✅ Entrée enregistrée — Stock : ${fmtD(res.nouveau_stock)} | PUMP : ${fmt(res.nouveau_pump)} FCFA`)
      resetForm()
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const supprimerProduit = async (id, nom) => {
    if (!confirm(`Désactiver "${nom}" du stock ?`)) return
    try {
      await api.delete(`/api/stock/produits/${id}`)
      toast.success('Produit désactivé')
      charger()
    } catch (err) { toast.error(err.message) }
  }

  const produitSelectionne = produits.find(p => p.id == idProd)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion du stock</h1>
          <p className="text-sm text-gray-500">Valeur totale : <strong>{fmt(valeurTotale)} FCFA</strong></p>
        </div>
        <button onClick={() => setShowEntree(!showEntree)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Entrée stock
        </button>
      </div>

      {alertes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">
            ⚠️ {alertes.length} produit(s) sous seuil minimum : {alertes.map(a=>a.designation).join(', ')}
          </p>
        </div>
      )}

      {/* Formulaire entrée */}
      {showEntree && (
        <div className="card p-5 border-2 border-bjc-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Nouvelle entrée de stock</h2>

          {/* Choix mode */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode('choisir')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode==='choisir' ? 'bg-bjc-500 text-white border-bjc-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              📋 Choisir dans la liste
            </button>
            <button onClick={() => setMode('nouveau')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode==='nouveau' ? 'bg-bjc-500 text-white border-bjc-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              ✏️ Saisir un nouveau produit
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mode === 'choisir' ? (
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Produit existant</label>
                <select className="select" value={idProd} onChange={e => setIdProd(e.target.value)}>
                  <option value="">— Choisir dans la liste —</option>
                  {produits.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.designation} (stock: {fmtD(p.stock_actuel)} {p.unite_mesure})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nom du produit *</label>
                  <input className="input" value={nomLibre}
                    onChange={e => setNomLibre(e.target.value)}
                    placeholder="Ex: Vinyle mat 1.37m, Encre cyan…" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
                  <select className="select" value={categorieLibre} onChange={e => setCategorieLibre(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantité entrée *</label>
              <input type="number" className="input" value={qte}
                onChange={e => setQte(e.target.value)} placeholder="0" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix achat unitaire (FCFA) *</label>
              <input type="number" className="input" value={prixAchat}
                onChange={e => setPrixAchat(e.target.value)} placeholder="0" min="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Réf. document fournisseur</label>
              <input className="input" value={refDoc}
                onChange={e => setRefDoc(e.target.value)} placeholder="BL-FOURNISSEUR-001" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input className="input" value={noteE} onChange={e => setNoteE(e.target.value)} placeholder="Remarque…" />
            </div>

            {/* Preview PUMP */}
            {mode === 'choisir' && produitSelectionne && qte && prixAchat && (
              <div className="col-span-2 md:col-span-3 bg-bjc-50 rounded-lg p-3 text-xs grid grid-cols-3 gap-2">
                <div><span className="text-gray-500">Stock avant :</span> <strong>{fmtD(produitSelectionne.stock_actuel)}</strong></div>
                <div><span className="text-gray-500">PUMP avant :</span> <strong>{fmt(produitSelectionne.prix_achat_moyen_pondere)} FCFA</strong></div>
                <div className="text-bjc-600 font-semibold">
                  <span>PUMP estimé : </span>
                  {(() => {
                    const sa = parseFloat(produitSelectionne.stock_actuel)
                    const pa = parseFloat(produitSelectionne.prix_achat_moyen_pondere)
                    const q  = parseFloat(qte)
                    const n  = parseFloat(prixAchat)
                    return fmt((sa*pa + q*n) / (sa + q))
                  })()} FCFA
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={entreeStock} disabled={saving} className="btn-success">
              {saving ? 'Enregistrement…' : '✔ Valider entrée'}
            </button>
            <button onClick={resetForm} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Rechercher un produit…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[['produits','Produits & matières'],['mouvements','Journal']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===t ? 'border-bjc-500 text-bjc-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'produits' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Désignation</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">Catégorie</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Stock</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">PUMP (FCFA)</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">Valeur HT</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Statut</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Chargement…</td></tr>
                ) : produitsFiltres.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">
                    {search ? 'Aucun résultat' : 'Aucun produit enregistré — cliquez sur "Entrée stock"'}
                  </td></tr>
                ) : produitsFiltres.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-700">{p.designation}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 hidden md:table-cell">{p.categorie}</td>
                    <td className="px-3 py-2.5 text-right">{fmtD(p.stock_actuel)} {p.unite_mesure}</td>
                    <td className="px-3 py-2.5 text-right">{fmt(p.prix_achat_moyen_pondere)}</td>
                    <td className="px-3 py-2.5 text-right font-medium hidden md:table-cell">{fmt(p.valeur_stock_ht)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.statut_stock==='ALERTE' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {p.statut_stock}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => supprimerProduit(p.id, p.designation)}
                        className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Produit</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Type</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Quantité</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">PUMP après</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 hidden md:table-cell">Réf. / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mouvements.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2 text-gray-700">{m.designation}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m.type_mouvement==='ENTREE' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {m.type_mouvement}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{fmtD(m.quantite)} {m.unite_mesure}</td>
                    <td className="px-3 py-2 text-right text-xs hidden md:table-cell">
                      {m.pump_apres ? fmt(m.pump_apres) : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 hidden md:table-cell">
                      {m.reference_doc || m.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
