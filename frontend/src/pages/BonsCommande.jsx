import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import toast from 'react-hot-toast'
import { Plus, Trash2, Search, X, Check, ArrowRight, Pencil, Printer } from 'lucide-react'
import { ImprimerBC, ImprimerFacture, ImprimerBL } from '../components/Documents.jsx'

const fmt  = n => new Intl.NumberFormat('fr-FR').format(Math.round(n||0))
const fmtD = n => new Date(n).toLocaleDateString('fr-FR')

const STATUT_STYLE = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700',
  EN_COURS:   'bg-blue-100 text-blue-700',
  LIVRE:      'bg-purple-100 text-purple-700',
  FACTURE:    'bg-emerald-100 text-emerald-700',
  ANNULE:     'bg-gray-100 text-gray-500',
}

export default function BonsCommande() {
  const api = useApi()
  const [bcs, setBcs]             = useState([])
  const [clients, setClients]     = useState([])
  const [catalogue, setCatalogue] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [detail, setDetail]       = useState(null)

  // mode: 'list' | 'nouveau' | 'modifier' | 'convertir' | 'imprimer_bc' | 'imprimer_facture' | 'imprimer_bl'
  const [mode, setMode] = useState('list')

  // Formulaire BC
  const [clientId, setClientId]   = useState('')
  const [articles, setArticles]   = useState([])
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)

  // Formulaire article
  const [catFilter, setCatFilter] = useState('')
  const [artForm, setArtForm] = useState({
    id_service:'', designation_libre:'', longueur:'', largeur:'', quantite:1, prix_unitaire_ht:''
  })

  // Convertir
  const [remise, setRemise] = useState(0)
  const [tva, setTva]       = useState(false)
  const [cad, setCad]       = useState(false)
  const [factureRes, setFactureRes] = useState(null)

  // Impression
  const [printData, setPrintData] = useState(null)

  const charger = () => {
    setLoading(true)
    Promise.all([
      api.get('/api/bons-commande'),
      api.get('/api/clients'),
      api.get('/api/catalogue'),
      api.get('/api/catalogue/categories')
    ]).then(([b,c,cat,cats]) => { setBcs(b); setClients(c); setCatalogue(cat); setCategories(cats) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { charger() }, [])

  const selectBC = async (bc) => {
    setSelected(bc.id)
    const d = await api.get(`/api/bons-commande/${bc.id}`)
    setDetail(d)
    setMode('list')
  }

  const servicesFiltres = catFilter ? catalogue.filter(s => s.id_categorie == catFilter) : catalogue

  const selectService = (id) => {
    const svc = catalogue.find(s => s.id == id)
    if (svc) setArtForm(f => ({ ...f, id_service: id, designation_libre: svc.designation, prix_unitaire_ht: svc.prix_vente_ht }))
    else setArtForm(f => ({ ...f, id_service: id }))
  }

  const ajouterArticle = () => {
    if (!artForm.designation_libre || !artForm.prix_unitaire_ht || !artForm.quantite)
      return toast.error('Designation, prix et quantite requis')
    const qte = parseFloat(artForm.quantite)
    const pu  = parseFloat(artForm.prix_unitaire_ht)
    if (isNaN(qte) || isNaN(pu)) return toast.error('Valeurs numeriques invalides')
    setArticles(a => [...a, {
      id: Date.now(),
      id_service: artForm.id_service || null,
      designation_libre: artForm.designation_libre,
      longueur: parseFloat(artForm.longueur)||0,
      largeur:  parseFloat(artForm.largeur)||0,
      quantite: qte,
      prix_unitaire_ht: pu,
    }])
    setArtForm({ id_service:'', designation_libre:'', longueur:'', largeur:'', quantite:1, prix_unitaire_ht:'' })
  }

  const modifierLigne = (id, champ, val) => {
    setArticles(a => a.map(x => x.id === id ? { ...x, [champ]: val } : x))
  }

  const totalBC = articles.reduce((s,a) => s + a.quantite*a.prix_unitaire_ht, 0)

  const ouvrirNouveau = () => {
    setClientId(''); setArticles([]); setNotes(''); setCatFilter('')
    setArtForm({ id_service:'', designation_libre:'', longueur:'', largeur:'', quantite:1, prix_unitaire_ht:'' })
    setMode('nouveau')
  }

  const ouvrirModifier = () => {
    if (!detail) return
    setClientId(detail.id_client)
    setNotes(detail.notes || '')
    setArticles(detail.details?.map(d => ({
      id: d.id || Date.now() + Math.random(),
      id_service: d.id_service || null,
      designation_libre: d.designation_libre || d.service_nom || '',
      longueur: d.longueur || 0,
      largeur:  d.largeur  || 0,
      quantite: d.quantite,
      prix_unitaire_ht: d.prix_unitaire_ht,
    })) || [])
    setMode('modifier')
  }

  const validerBC = async () => {
    if (!clientId)      return toast.error('Selectionnez un client')
    if (!articles.length) return toast.error('Ajoutez au moins un article')
    setSaving(true)
    try {
      if (mode === 'modifier' && detail) {
        await api.put(`/api/bons-commande/${detail.id}`, {
          id_client: parseInt(clientId), articles, notes })
        toast.success('BC mis a jour')
      } else {
        const res = await api.post('/api/bons-commande', {
          id_client: parseInt(clientId), articles, notes })
        toast.success(`BC ${res.numero_bc} cree !`)
      }
      setMode('list'); setArticles([]); setClientId(''); setNotes('')
      charger()
      if (detail) {
        const d = await api.get(`/api/bons-commande/${detail.id}`)
        setDetail(d)
      }
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const convertirFacture = async () => {
    if (!detail) return
    setSaving(true)
    try {
      const res = await api.post(`/api/bons-commande/${detail.id}/convertir-facture`, {
        remise_taux: parseFloat(remise)||0, tva_active: tva, cad_active: cad })
      setFactureRes(res)
      toast.success(`Facture ${res.numero_facture} + BL ${res.numero_bl} crees !`)
      setMode('list'); charger()
      const d = await api.get(`/api/bons-commande/${detail.id}`)
      setDetail(d)
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const changerStatut = async (statut) => {
    await api.patch(`/api/bons-commande/${detail.id}/statut`, { statut })
    toast.success('Statut mis a jour')
    charger()
    const d = await api.get(`/api/bons-commande/${detail.id}`)
    setDetail(d)
  }

  const imprimerBC = () => {
    if (!detail) return
    setPrintData({ type:'bc', bc: detail })
    setMode('imprimer_bc')
  }

  const imprimerFacture = async () => {
    if (!detail) return
    try {
      const ventes = await api.get(`/api/ventes?client_id=${detail.id_client}`)
      const vente  = ventes.find(v => v.id_bc == detail.id)
      if (!vente) return toast.error('Aucune facture liee a ce BC')
      const fd = await api.get(`/api/ventes/${vente.id}`)
      setPrintData({ type:'facture', facture: fd })
      setMode('imprimer_facture')
    } catch (err) { toast.error(err.message) }
  }

  const imprimerBL = async () => {
    if (!detail) return
    try {
      const ventes = await api.get(`/api/ventes?client_id=${detail.id_client}`)
      const vente  = ventes.find(v => v.id_bc == detail.id)
      if (!vente) return toast.error('Aucun BL lie a ce BC')
      const fd = await api.get(`/api/ventes/${vente.id}`)
      setPrintData({ type:'bl', facture: fd })
      setMode('imprimer_bl')
    } catch (err) { toast.error(err.message) }
  }

  const bcFiltres = bcs.filter(b =>
    b.nom_client?.toLowerCase().includes(search.toLowerCase()) ||
    b.numero_bc?.toLowerCase().includes(search.toLowerCase())
  )

  // VUE IMPRESSION
  if (mode === 'imprimer_bc' && printData)
    return <ImprimerBC data={printData} onClose={() => setMode('list')} />
  if (mode === 'imprimer_facture' && printData)
    return <ImprimerFacture data={printData} onClose={() => setMode('list')} />
  if (mode === 'imprimer_bl' && printData)
    return <ImprimerBL data={printData} onClose={() => setMode('list')} />

  // FORMULAIRE BC (nouveau ou modifier)
  if (mode === 'nouveau' || mode === 'modifier') {
    const titre = mode === 'modifier'
      ? `Modifier ${detail?.numero_bc}`
      : 'Nouveau bon de commande'
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('list')} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          <h1 className="text-xl font-bold text-gray-900">{titre}</h1>
        </div>

       {/* Client */}
<div className="card p-5">
  <h2 className="text-sm font-semibold text-gray-700 mb-3">Client</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <label className="block text-xs text-gray-500 mb-1">Client *</label>
      <select 
        className="select" 
        value={clientId} 
        onChange={e => setClientId(e.target.value)}
      >
        <option value="">— Choisir —</option>
        {/* On s'assure que 'clients' est bien un tableau avant de faire le map */}
        {Array.isArray(clients) && clients.map(c => (
          <option key={c.id} value={c.id}>
            {c.nom_client || c.nom || "Client sans nom"}
          </option>
        ))}
      </select>
    </div>
    
    {/* Affichage des détails du client sélectionné */}
    {clientId && (() => {
      const c = clients.find(x => x.id == clientId)
      console.log("Liste des clients reçue :", clients);
      return c ? (
        <div className="bg-bjc-50 rounded-lg p-3 text-xs space-y-1">
          <p className="font-medium text-bjc-700">{c.nom_client || c.nom}</p>
          {c.telephone && <p className="text-gray-500">Tel : {c.telephone}</p>}
          {c.adresse && <p className="text-gray-500">{c.adresse}</p>}
        </div>
      ) : null
    })()}
  </div>
</div>
        {/* Ajouter article */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Ajouter un article</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categorie</label>
              <select className="select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">Toutes</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Catalogue (optionnel)</label>
              <select className="select" value={artForm.id_service}
                onChange={e => selectService(e.target.value)}>
                <option value="">— Saisir ou choisir —</option>
                {servicesFiltres.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.designation} {s.format?`(${s.format})`:''} — {fmt(s.prix_vente_ht)} FCFA
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Designation *</label>
              <input className="input" value={artForm.designation_libre}
                onChange={e => setArtForm(f => ({...f, designation_libre: e.target.value}))}
                placeholder="Description du service..." />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Longueur (m)</label>
              <input type="number" className="input" value={artForm.longueur}
                onChange={e => setArtForm(f => ({...f, longueur: e.target.value}))} placeholder="0" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Largeur (m)</label>
              <input type="number" className="input" value={artForm.largeur}
                onChange={e => setArtForm(f => ({...f, largeur: e.target.value}))} placeholder="0" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Surface {artForm.longueur && artForm.largeur
                  ? <span className="text-bjc-500 font-medium">= {(artForm.longueur*artForm.largeur).toFixed(2)} m2</span>
                  : ''}
              </label>
              <div className="input bg-gray-50 text-gray-400 text-sm">Auto (L x l)</div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantite *</label>
              <input type="number" className="input" value={artForm.quantite}
                onChange={e => setArtForm(f => ({...f, quantite: e.target.value}))} min="1" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prix unitaire HT (FCFA) *</label>
              <input type="number" className="input" value={artForm.prix_unitaire_ht}
                onChange={e => setArtForm(f => ({...f, prix_unitaire_ht: e.target.value}))} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Total HT</label>
              <div className="input bg-gray-50 text-bjc-600 font-semibold">
                {artForm.prix_unitaire_ht && artForm.quantite
                  ? fmt(parseFloat(artForm.prix_unitaire_ht)*parseFloat(artForm.quantite))+' FCFA' : '—'}
              </div>
            </div>
          </div>
          <button onClick={ajouterArticle} className="btn-primary flex items-center gap-2 mt-3">
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {/* Articles */}
        {articles.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Articles ({articles.length})</h2>
              <span className="text-sm font-bold text-bjc-600">{fmt(totalBC)} FCFA HT</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Designation</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Dim.</th>
                    <th className="text-center px-3 py-2 text-xs font-medium text-gray-500">Qte</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">PU HT</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-500">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {articles.map(a => (
                    <tr key={a.id}>
                      <td className="px-4 py-2">
                        <input className="input text-xs py-1"
                          value={a.designation_libre}
                          onChange={e => modifierLigne(a.id, 'designation_libre', e.target.value)} />
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-400">
                        {a.longueur && a.largeur ? `${a.longueur}x${a.largeur}m` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" className="input text-xs py-1 w-16 text-center"
                          value={a.quantite} min="1"
                          onChange={e => modifierLigne(a.id, 'quantite', parseFloat(e.target.value)||1)} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" className="input text-xs py-1 w-24 text-right"
                          value={a.prix_unitaire_ht} min="0"
                          onChange={e => modifierLigne(a.id, 'prix_unitaire_ht', parseFloat(e.target.value)||0)} />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-bjc-600 text-xs">
                        {fmt(a.quantite * a.prix_unitaire_ht)}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => setArticles(p => p.filter(x => x.id !== a.id))}
                          className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Notes / Observations</label>
                <input className="input" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Delai, remarques..." />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-bjc-600">{fmt(totalBC)} FCFA HT</div>
                <button onClick={validerBC} disabled={saving} className="btn-success flex items-center gap-2">
                  <Check size={14} />
                  {saving ? 'Enregistrement...' : mode === 'modifier' ? 'Enregistrer les modifications' : 'Valider le BC'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // VUE CONVERTIR EN FACTURE
  if (mode === 'convertir' && detail) {
    const brut = detail.details?.reduce((s,d) => s + d.quantite*d.prix_unitaire_ht, 0) || 0
    const rem  = brut * remise / 100
    const net  = brut - rem
    const tvaM = tva ? net*0.18 : 0
    const cadM = cad ? net*0.05 : 0
    const ttc  = net + tvaM + cadM
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('list')} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Convertir en facture</h1>
            <p className="text-sm text-gray-500">{detail.numero_bc} — {detail.nom_client}</p>
          </div>
        </div>
        <div className="card p-5">
          {/* Recapitulatif */}
          <table className="w-full text-sm mb-4">
            <thead><tr className="border-b border-gray-100">
              <th className="text-left pb-2 text-xs font-medium text-gray-500">Article</th>
              <th className="text-center pb-2 text-xs font-medium text-gray-500">Qte</th>
              <th className="text-right pb-2 text-xs font-medium text-gray-500">PU HT</th>
              <th className="text-right pb-2 text-xs font-medium text-gray-500">Total HT</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {detail.details?.map(d => (
                <tr key={d.id}>
                  <td className="py-2 text-gray-700">{d.designation_libre||d.service_nom}</td>
                  <td className="py-2 text-center">{d.quantite}</td>
                  <td className="py-2 text-right">{fmt(d.prix_unitaire_ht)}</td>
                  <td className="py-2 text-right font-medium">{fmt(d.quantite*d.prix_unitaire_ht)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Remise (%)</label>
              <input type="number" className="input" value={remise}
                onChange={e => setRemise(e.target.value)} min="0" max="100" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tva} onChange={e => setTva(e.target.checked)}
                className="w-4 h-4 accent-bjc-500" />
              <span className="text-sm text-gray-600">TVA 18%</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cad} onChange={e => setCad(e.target.checked)}
                className="w-4 h-4 accent-bjc-500" />
              <span className="text-sm text-gray-600">CAD 5%</span>
            </label>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm mb-4">
            <div className="flex justify-between text-gray-600"><span>Brut HT</span><span>{fmt(brut)} FCFA</span></div>
            {remise > 0 && <div className="flex justify-between text-red-500"><span>Remise {remise}%</span><span>- {fmt(rem)} FCFA</span></div>}
            <div className="flex justify-between text-gray-600"><span>Net HT</span><span>{fmt(net)} FCFA</span></div>
            {tva && <div className="flex justify-between text-gray-600"><span>TVA 18%</span><span>+ {fmt(tvaM)} FCFA</span></div>}
            {cad && <div className="flex justify-between text-gray-600"><span>CAD 5%</span><span>+ {fmt(cadM)} FCFA</span></div>}
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 text-base">
              <span>NET A PAYER</span>
              <span className="text-bjc-600">{fmt(ttc)} FCFA</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={convertirFacture} disabled={saving} className="btn-success flex items-center gap-2">
              <ArrowRight size={14} />
              {saving ? 'Creation...' : 'Valider — Creer Facture + BL'}
            </button>
            <button onClick={() => setMode('list')} className="btn-secondary">Annuler</button>
          </div>
        </div>
      </div>
    )
  }

  // VUE PRINCIPALE
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bons de commande</h1>
          <p className="text-sm text-gray-500">{bcs.length} bon(s)</p>
        </div>
        <button onClick={ouvrirNouveau} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> Nouveau BC
        </button>
      </div>

      {factureRes && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
          <Check className="text-emerald-600 flex-shrink-0" size={16} />
          <p className="text-emerald-800 text-sm">
            <strong>{factureRes.numero_facture}</strong> + BL <strong>{factureRes.numero_bl}</strong> crees — {fmt(factureRes.total_ttc)} FCFA TTC
          </p>
          <button onClick={() => setFactureRes(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">×</button>
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Rechercher par client ou numero BC..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* Liste */}
        <div className="md:col-span-2 card overflow-hidden">
          <div className="overflow-y-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">N° BC</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={3} className="text-center py-10 text-gray-400">Chargement...</td></tr>
                : bcFiltres.length === 0 ? <tr><td colSpan={3} className="text-center py-10 text-gray-400">Aucun BC</td></tr>
                : bcFiltres.map(bc => (
                  <tr key={bc.id} onClick={() => selectBC(bc)}
                    className={`cursor-pointer hover:bg-bjc-50 transition-colors ${selected===bc.id ? 'bg-bjc-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-bjc-600 whitespace-nowrap">
                      <div>{bc.numero_bc}</div>
                      <div className="text-xs text-gray-400">{fmtD(bc.date_commande)}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-700 truncate max-w-[110px]">{bc.nom_client}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_STYLE[bc.statut]}`}>
                        {bc.statut?.replace('_',' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail */}
        <div className="md:col-span-3 card">
          {!detail ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
              <ArrowRight size={32} className="opacity-30" />
              <p className="text-sm">Selectionnez un BC</p>
            </div>
          ) : (
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{detail.numero_bc}</h3>
                  <p className="text-sm font-medium text-gray-600">{detail.nom_client}</p>
                  {detail.telephone && <p className="text-xs text-gray-400">Tel : {detail.telephone}</p>}
                  {detail.adresse && <p className="text-xs text-gray-400">{detail.adresse}</p>}
                  <p className="text-xs text-gray-400 mt-1">{fmtD(detail.date_commande)}</p>
                </div>
                <select value={detail.statut}
                  onChange={e => changerStatut(e.target.value)}
                  disabled={detail.statut === 'FACTURE'}
                  className={`select text-xs w-auto font-medium ${STATUT_STYLE[detail.statut]} border-0 py-1`}>
                  <option value="EN_ATTENTE">EN ATTENTE</option>
                  <option value="EN_COURS">EN COURS</option>
                  <option value="LIVRE">LIVRE</option>
                  <option value="FACTURE">FACTURE</option>
                  <option value="ANNULE">ANNULE</option>
                </select>
              </div>

              {/* Lignes */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-gray-100">
                    <th className="text-left pb-2 font-medium text-gray-500">Designation</th>
                    <th className="text-center pb-2 font-medium text-gray-500">Dim.</th>
                    <th className="text-center pb-2 font-medium text-gray-500">Qte</th>
                    <th className="text-right pb-2 font-medium text-gray-500">PU HT</th>
                    <th className="text-right pb-2 font-medium text-gray-500">Total HT</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {detail.details?.map(d => (
                      <tr key={d.id}>
                        <td className="py-2 text-gray-700">{d.designation_libre||d.service_nom}</td>
                        <td className="py-2 text-center text-gray-400">
                          {d.longueur&&d.largeur ? `${d.longueur}x${d.largeur}` : '—'}
                        </td>
                        <td className="py-2 text-center">{d.quantite}</td>
                        <td className="py-2 text-right">{fmt(d.prix_unitaire_ht)}</td>
                        <td className="py-2 text-right font-medium text-bjc-600">
                          {fmt(d.quantite*d.prix_unitaire_ht)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Total HT</span>
                <span className="text-lg font-bold text-bjc-600">
                  {fmt(detail.details?.reduce((s,d) => s+d.quantite*d.prix_unitaire_ht, 0))} FCFA
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button onClick={imprimerBC} className="btn-secondary flex items-center gap-1.5 text-xs">
                  <Printer size={12}/> Imprimer BC
                </button>
                {detail.statut !== 'FACTURE' && detail.statut !== 'ANNULE' && (
                  <>
                    <button onClick={ouvrirModifier}
                      className="btn-secondary flex items-center gap-1.5 text-xs">
                      <Pencil size={12}/> Modifier BC
                    </button>
                    <button onClick={() => setMode('convertir')}
                      className="btn-success flex items-center gap-1.5 text-xs">
                      <ArrowRight size={12}/> Convertir en Facture
                    </button>
                  </>
                )}
                {detail.statut === 'FACTURE' && (
                  <>
                    <button onClick={imprimerFacture}
                      className="btn-primary flex items-center gap-1.5 text-xs">
                      <Printer size={12}/> Imprimer Facture
                    </button>
                    <button onClick={imprimerBL}
                      className="btn-secondary flex items-center gap-1.5 text-xs">
                      <Printer size={12}/> Imprimer BL
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
