import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))

// ═══════════════════════════════════════════════════════
// PAGE CHARGES
// ═══════════════════════════════════════════════════════
export function Charges() {
  const api = useApi()
  const [charges, setCharges] = useState([])
  const [mois, setMois] = useState(new Date().getMonth() + 1)
  const [annee, setAnnee] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    date_charge: new Date().toISOString().slice(0,10),
    type_charge: 'FIXE',
    categorie: 'AUTRE',
    designation: '',
    montant: '',
    mode_paiement: 'ESPECES',
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  const charger = () => {
    setLoading(true)
    api.get(`/api/charges?mois=${mois}&annee=${annee}`)
      .then(setCharges)
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [mois, annee])

  const totalFixe = charges.filter(c => c.type_charge === 'FIXE').reduce((s,c) => s+parseFloat(c.montant||0),0)
  const totalVar  = charges.filter(c => c.type_charge === 'VARIABLE').reduce((s,c) => s+parseFloat(c.montant||0),0)

  const enregistrer = async () => {
    if (!form.designation || !form.montant) return toast.error('Désignation et montant requis')
    setSaving(true)
    try {
      await api.post('/api/charges', form)
      toast.success('Charge enregistrée')
      setForm(f => ({ ...f, designation:'', montant:'', notes:'' }))
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette charge ?')) return
    await api.delete(`/api/charges/${id}`)
    toast.success('Supprimé')
    charger()
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Charges</h1>
        <div className="flex gap-2">
          <select className="select w-auto" value={mois} onChange={e => setMois(e.target.value)}>
            {['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'].map((m,i) =>
              <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="select w-auto" value={annee} onChange={e => setAnnee(e.target.value)}>
            {[2026,2025,2024].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center"><div className="text-lg font-bold text-bjc-600">{fmt(totalFixe)}</div><div className="text-xs text-gray-500 mt-1">Charges fixes (FCFA)</div></div>
        <div className="card p-4 text-center"><div className="text-lg font-bold text-amber-600">{fmt(totalVar)}</div><div className="text-xs text-gray-500 mt-1">Charges variables</div></div>
        <div className="card p-4 text-center"><div className="text-lg font-bold text-gray-800">{fmt(totalFixe + totalVar)}</div><div className="text-xs text-gray-500 mt-1">Total</div></div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Enregistrer une charge</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" className="input" value={form.date_charge} onChange={e => setForm({...form, date_charge: e.target.value})} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Type</label>
            <select className="select" value={form.type_charge} onChange={e => setForm({...form, type_charge: e.target.value})}>
              <option value="FIXE">FIXE</option><option value="VARIABLE">VARIABLE</option>
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Catégorie</label>
            <select className="select" value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})}>
              {['LOYER','ELECTRICITE','EAU','SALAIRE','INTERNET','TRANSPORT','MAIN_OEUVRE','GAZ','PUBLICITE','MAINTENANCE','AUTRE'].map(c =>
                <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Désignation</label>
            <input className="input" value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="Description…" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Montant (FCFA)</label>
            <input type="number" className="input" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} placeholder="0" /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Mode paiement</label>
            <select className="select" value={form.mode_paiement} onChange={e => setForm({...form, mode_paiement: e.target.value})}>
              <option value="ESPECES">Espèces</option><option value="MOBILE_MONEY">Mobile Money</option>
              <option value="VIREMENT">Virement</option><option value="CHEQUE">Chèque</option>
            </select></div>
        </div>
        <button onClick={enregistrer} disabled={saving} className="btn-success mt-3">
          {saving ? 'Enregistrement…' : '+ Enregistrer'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Désignation</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Type</th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Montant</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Mode</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">Chargement…</td></tr>
            : charges.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucune charge pour cette période</td></tr>
            : charges.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-xs text-gray-500">{new Date(c.date_charge).toLocaleDateString('fr-FR')}</td>
                <td className="px-4 py-2 text-gray-700">{c.designation}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.type_charge==='FIXE' ? 'bg-bjc-100 text-bjc-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.type_charge}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-medium">{fmt(c.montant)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{c.mode_paiement}</td>
                <td className="px-3 py-2">
                  <button onClick={() => supprimer(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Charges
