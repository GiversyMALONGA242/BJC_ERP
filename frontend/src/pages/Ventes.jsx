import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import toast from 'react-hot-toast'
import { ImprimerFacture, ImprimerBL } from '../components/Documents.jsx'

const fmt  = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))
const fmtD = n => new Date(n).toLocaleDateString('fr-FR')

const STATUT = {
  NON_PAYE: 'bg-red-100 text-red-700',
  PARTIEL:  'bg-amber-100 text-amber-700',
  PAYE:     'bg-emerald-100 text-emerald-700'
}

const MOIS_NOMS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export default function Ventes() {
  const api = useApi()
  const now = new Date()

  // Filtres
  const [vue, setVue]       = useState('mois') // jour | mois | annee
  const [jour, setJour]     = useState(now.toISOString().slice(0,10))
  const [mois, setMois]     = useState(now.getMonth()+1)
  const [annee, setAnnee]   = useState(now.getFullYear())

  const [ventes, setVentes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]   = useState(null)

  // Acompte modal
  const [showAcompte, setShowAcompte] = useState(false)
  const [acompte, setAcompte]         = useState('')

  // Impression
  const [printMode, setPrintMode] = useState(null)
  const [printData, setPrintData] = useState(null)

  const charger = () => {
    setLoading(true)
    const p = new URLSearchParams()
    p.set('annee', annee)
    if (vue === 'mois') p.set('mois', mois)
    if (vue === 'jour') p.set('jour', jour)
    api.get(`/api/ventes?${p}`).then(setVentes).finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [vue, jour, mois, annee])

  const voir = async (v) => {
    setSelected(v.id)
    const d = await api.get(`/api/ventes/${v.id}`)
    setDetail(d)
    setShowAcompte(false)
  }

  const enregistrerPaiement = async (statut, montant) => {
    await api.patch(`/api/ventes/${detail.id}/paiement`, {
      statut_paiement: statut,
      montant_paye: parseFloat(montant) || 0
    })
    toast.success('Paiement enregistré')
    setShowAcompte(false)
    charger()
    const d = await api.get(`/api/ventes/${detail.id}`)
    setDetail(d)
  }

  const imprimer = async (type) => {
    if (!detail) return
    setPrintData({ type, facture: detail })
    setPrintMode(type)
  }

  const total_ca  = ventes.reduce((s,v) => s + parseFloat(v.total_ttc||0), 0)
  const total_recu = ventes.reduce((s,v) => s + parseFloat(v.montant_paye||0), 0)
  const total_reste = ventes.reduce((s,v) => s + parseFloat(v.reste_a_payer||0), 0)

  if (printMode === 'facture') return <ImprimerFacture data={printData} onClose={() => setPrintMode(null)} />
  if (printMode === 'bl')      return <ImprimerBL data={printData} onClose={() => setPrintMode(null)} />

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Ventes & Factures</h1>
          <p className="text-sm text-gray-500">{ventes.length} facture(s)</p>
        </div>

        {/* Sélecteur de vue */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {['jour','mois','annee'].map(v => (
              <button key={v} onClick={() => setVue(v)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${vue===v ? 'bg-bjc-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                {v === 'jour' ? 'Jour' : v === 'mois' ? 'Mois' : 'Année'}
              </button>
            ))}
          </div>
          {vue === 'jour' && (
            <input type="date" className="select w-auto text-sm" value={jour}
              onChange={e => setJour(e.target.value)} />
          )}
          {vue === 'mois' && (
            <>
              <select className="select w-auto text-sm" value={mois} onChange={e => setMois(e.target.value)}>
                {MOIS_NOMS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select className="select w-auto text-sm" value={annee} onChange={e => setAnnee(e.target.value)}>
                {[2026,2025,2024].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          {vue === 'annee' && (
            <select className="select w-auto text-sm" value={annee} onChange={e => setAnnee(e.target.value)}>
              {[2026,2025,2024].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-bjc-600">{fmt(total_ca)}</div>
          <div className="text-xs text-gray-500 mt-1">CA Total TTC (FCFA)</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-emerald-600">{fmt(total_recu)}</div>
          <div className="text-xs text-gray-500 mt-1">Encaissé</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-red-600">{fmt(total_reste)}</div>
          <div className="text-xs text-gray-500 mt-1">Reste à encaisser</div>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        {/* Liste */}
        <div className="md:col-span-2 card overflow-hidden">
          <div className="overflow-y-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Facture</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Client</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">TTC</th>
                  <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">Chargement…</td></tr>
                : ventes.length === 0 ? <tr><td colSpan={4} className="text-center py-10 text-gray-400">Aucune vente pour cette période</td></tr>
                : ventes.map(v => (
                  <tr key={v.id} onClick={() => voir(v)}
                    className={`cursor-pointer hover:bg-bjc-50 transition-colors ${selected===v.id ? 'bg-bjc-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-bjc-600 whitespace-nowrap">
                      <div>{v.numero_facture}</div>
                      <div className="text-xs text-gray-400">{fmtD(v.date_vente)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 truncate max-w-[100px]">{v.nom_client}</td>
                    <td className="px-3 py-2.5 text-right text-xs">
                      <div className="font-medium">{fmt(v.total_ttc)}</div>
                      {v.reste_a_payer > 0 && (
                        <div className="text-red-500">-{fmt(v.reste_a_payer)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUT[v.statut_paiement]}`}>
                        {v.statut_paiement?.replace('_',' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Détail */}
        <div className="md:col-span-3 card p-5">
          {!detail ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Cliquez sur une facture
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{detail.numero_facture}</h3>
                  <p className="text-sm font-medium text-gray-600">{detail.nom_client}</p>
                  <p className="text-xs text-gray-400">{fmtD(detail.date_vente)}</p>
                  {detail.numero_bl && (
                    <p className="text-xs text-bjc-500 mt-0.5">BL : {detail.numero_bl}</p>
                  )}
                </div>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${STATUT[detail.statut_paiement]}`}>
                  {detail.statut_paiement?.replace('_',' ')}
                </span>
              </div>

              {/* Lignes */}
              <table className="w-full text-xs mb-4">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left pb-2 text-gray-500">Article</th>
                  <th className="text-center pb-2 text-gray-500">Qté</th>
                  <th className="text-right pb-2 text-gray-500">PU HT</th>
                  <th className="text-right pb-2 text-gray-500">Total HT</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {detail.details?.map(d => (
                    <tr key={d.id}>
                      <td className="py-1.5 text-gray-700">{d.designation_libre || d.service_nom}</td>
                      <td className="py-1.5 text-center">{d.quantite}</td>
                      <td className="py-1.5 text-right">{fmt(d.prix_vente_ht_applique)}</td>
                      <td className="py-1.5 text-right font-medium">{fmt(d.total_ht_ligne)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totaux */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs mb-4">
                {detail.remise_taux > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Remise {detail.remise_taux}%</span>
                    <span>- {fmt(detail.remise_montant)} FCFA</span>
                  </div>
                )}
                {detail.tva_active && (
                  <div className="flex justify-between text-gray-600">
                    <span>TVA 18%</span><span>{fmt(detail.tva_montant)} FCFA</span>
                  </div>
                )}
                {detail.cad_active && (
                  <div className="flex justify-between text-gray-600">
                    <span>CAD 5%</span><span>{fmt(detail.cad_montant)} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 text-sm">
                  <span>TOTAL TTC</span>
                  <span className="text-bjc-600">{fmt(detail.total_ttc)} FCFA</span>
                </div>

                {/* Suivi paiement */}
                <div className="border-t border-gray-200 pt-2 space-y-1">
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Acompte reçu</span>
                    <span>{fmt(detail.montant_paye)} FCFA</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold text-sm">
                    <span>Reste à payer</span>
                    <span>{fmt(detail.reste_a_payer)} FCFA</span>
                  </div>
                </div>
              </div>

              {/* Acompte */}
              {showAcompte && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 space-y-2">
                  <p className="text-xs font-medium text-amber-800">Enregistrer un paiement</p>
                  <div className="flex gap-2">
                    <input type="number" className="input text-sm flex-1"
                      placeholder="Montant reçu (FCFA)"
                      value={acompte} onChange={e => setAcompte(e.target.value)}
                      max={detail.total_ttc} min="0" />
                    <button onClick={() => enregistrerPaiement('PARTIEL', acompte)}
                      className="btn-primary text-xs px-3">Valider</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => enregistrerPaiement('PAYE', detail.total_ttc)}
                      className="btn-success text-xs flex-1">✔ Marquer PAYÉ intégralement</button>
                    <button onClick={() => setShowAcompte(false)}
                      className="btn-secondary text-xs">Annuler</button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {detail.statut_paiement !== 'PAYE' && (
                  <button onClick={() => setShowAcompte(!showAcompte)}
                    className="btn-success text-xs flex items-center gap-1">
                    💰 Enregistrer paiement
                  </button>
                )}
                <button onClick={() => imprimer('facture')}
                  className="btn-primary text-xs flex items-center gap-1">
                  🖨 Facture
                </button>
                <button onClick={() => imprimer('bl')}
                  className="btn-secondary text-xs flex items-center gap-1">
                  🖨 Bon de livraison
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
