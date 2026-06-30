import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import { ImprimerFacture, ImprimerBL, ImprimerBC } from '../components/Documents.jsx'
import { Search, FolderOpen, FileText, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const fmt  = n => new Intl.NumberFormat('fr-FR').format(Math.round(n||0))
const fmtD = n => n ? new Date(n).toLocaleDateString('fr-FR') : '—'

const STATUT_PAY = {
  NON_PAYE: 'bg-red-100 text-red-700',
  PARTIEL:  'bg-amber-100 text-amber-700',
  PAYE:     'bg-emerald-100 text-emerald-700'
}
const STATUT_BC = {
  EN_ATTENTE: 'bg-amber-100 text-amber-700',
  EN_COURS:   'bg-blue-100 text-blue-700',
  FACTURE:    'bg-emerald-100 text-emerald-700',
  ANNULE:     'bg-gray-100 text-gray-500',
}

export default function Archives() {
  const api = useApi()
  const [clients, setClients]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(null)
  const [dossier, setDossier]     = useState(null)
  const [loadDossier, setLoadDossier] = useState(false)
  const [printMode, setPrintMode] = useState(null)
  const [printData, setPrintData] = useState(null)
  const [tabDoc, setTabDoc]       = useState('factures')

  useEffect(() => {
    api.get('/api/archives').then(setClients).finally(() => setLoading(false))
  }, [])

  const ouvrirDossier = async (c) => {
    setSelected(c.id)
    setLoadDossier(true)
    try {
      const d = await api.get(`/api/archives/client/${c.id}`)
      setDossier(d)
    } catch (err) { toast.error(err.message) }
    finally { setLoadDossier(false) }
  }

  const voirFacture = async (id) => {
    const d = await api.get(`/api/ventes/${id}`)
    setPrintData({ type:'facture', facture: d })
    setPrintMode('facture')
  }

  const voirBL = async (id) => {
    const d = await api.get(`/api/ventes/${id}`)
    setPrintData({ type:'bl', facture: d })
    setPrintMode('bl')
  }

  const voirBC = async (id) => {
    const d = await api.get(`/api/bons-commande/${id}`)
    setPrintData({ type:'bc', bc: d })
    setPrintMode('bc')
  }

  const filtres = clients.filter(c =>
    c.nom_client.toLowerCase().includes(search.toLowerCase()) ||
    c.code_client.toLowerCase().includes(search.toLowerCase())
  )

  if (printMode === 'facture') return <ImprimerFacture data={printData} onClose={() => setPrintMode(null)} />
  if (printMode === 'bl')      return <ImprimerBL      data={printData} onClose={() => setPrintMode(null)} />
  if (printMode === 'bc')      return <ImprimerBC      data={printData} onClose={() => setPrintMode(null)} />

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Archivage par client</h1>
        <p className="text-sm text-gray-500">
          Historique complet — factures, bons de commande, bons de livraison
        </p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Rechercher un client…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* Liste clients */}
        <div className="md:col-span-2 card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-500">{filtres.length} client(s)</p>
          </div>
          <div className="overflow-y-auto max-h-[65vh]">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Chargement…</div>
            ) : filtres.length === 0 ? (
              <div className="text-center py-10 text-gray-400">Aucun client</div>
            ) : filtres.map(c => (
              <div key={c.id} onClick={() => ouvrirDossier(c)}
                className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-bjc-50 transition-colors ${selected===c.id ? 'bg-bjc-50 border-l-4 border-l-bjc-500' : ''}`}>
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className={selected===c.id ? 'text-bjc-500' : 'text-amber-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{c.nom_client}</p>
                    <p className="text-xs text-gray-400">{c.code_client}</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                  <span>📄 {c.nb_factures} facture(s)</span>
                  <span>📋 {c.nb_bcs} BC</span>
                  <span className="text-bjc-600 font-medium">{fmt(c.ca_total)} FCFA</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dossier client */}
        <div className="md:col-span-3 card">
          {!dossier ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
              <FolderOpen size={36} className="opacity-30" />
              <p className="text-sm">Cliquez sur un client pour voir son dossier</p>
            </div>
          ) : loadDossier ? (
            <div className="h-48 flex items-center justify-center text-gray-400">Chargement…</div>
          ) : (
            <div className="p-5">
              {/* En-tête client */}
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-bjc-100 text-bjc-600 font-bold text-lg flex items-center justify-center flex-shrink-0">
                  {dossier.client.nom_client[0]}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{dossier.client.nom_client}</h2>
                  <p className="text-xs text-gray-500">{dossier.client.code_client}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>📄 {dossier.factures.length} facture(s)</span>
                    <span>📋 {dossier.bons_commande.length} BC</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-gray-200 mb-4">
                {[['factures','Factures & BL'],['bcs','Bons de commande']].map(([t,l]) => (
                  <button key={t} onClick={() => setTabDoc(t)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tabDoc===t ? 'border-bjc-500 text-bjc-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Factures */}
              {tabDoc === 'factures' && (
                <div className="space-y-2">
                  {dossier.factures.length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-sm">Aucune facture</p>
                  ) : dossier.factures.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-bjc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-bjc-400" />
                        <div>
                          <p className="text-sm font-medium text-bjc-600">{f.numero_facture}</p>
                          <p className="text-xs text-gray-500">
                            {fmtD(f.date_vente)} • {fmt(f.total_ttc)} FCFA
                            {f.numero_bl && <span className="ml-2 text-purple-500">BL: {f.numero_bl}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_PAY[f.statut_paiement]}`}>
                          {f.statut_paiement?.replace('_',' ')}
                        </span>
                        <button onClick={() => voirFacture(f.id)}
                          className="text-xs bg-bjc-500 text-white px-2 py-1 rounded-md hover:bg-bjc-600">
                          🖨 Facture
                        </button>
                        <button onClick={() => voirBL(f.id)}
                          className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-50">
                          🖨 BL
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* BCs */}
              {tabDoc === 'bcs' && (
                <div className="space-y-2">
                  {dossier.bons_commande.length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-sm">Aucun bon de commande</p>
                  ) : dossier.bons_commande.map(bc => (
                    <div key={bc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-bjc-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Package size={16} className="text-amber-500" />
                        <div>
                          <p className="text-sm font-medium text-amber-700">{bc.numero_bc}</p>
                          <p className="text-xs text-gray-500">
                            {fmtD(bc.date_commande)} • {fmt(bc.montant_total)} FCFA HT
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_BC[bc.statut]}`}>
                          {bc.statut?.replace('_',' ')}
                        </span>
                        <button onClick={() => voirBC(bc.id)}
                          className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-50">
                          🖨 BC
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
