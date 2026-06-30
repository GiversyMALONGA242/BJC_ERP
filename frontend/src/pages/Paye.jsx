import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import toast from 'react-hot-toast'
import { Plus, Check, Printer, Users, TrendingDown } from 'lucide-react'

const fmt  = n => new Intl.NumberFormat('fr-FR').format(Math.round(n||0))
const MOIS_NOMS = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec']

export default function Paye() {
  const api = useApi()
  const now = new Date()
  const [tab, setTab]             = useState('bulletins')
  const [personnel, setPersonnel] = useState([])
  const [bulletins, setBulletins] = useState([])
  const [masse, setMasse]         = useState([])
  const [mois, setMois]           = useState(now.getMonth()+1)
  const [annee, setAnnee]         = useState(now.getFullYear())
  const [loading, setLoading]     = useState(true)
  const [showEmpForm, setShowEmpForm]     = useState(false)
  const [showBulletinForm, setShowBulletinForm] = useState(false)
  const [saving, setSaving]       = useState(false)

  const [empForm, setEmpForm] = useState({
    nom:'', prenom:'', poste:'', salaire_base:'', date_embauche:'', telephone:'', cnss:''
  })
  const [bulForm, setBulForm] = useState({
    id_personnel:'', jours_travailles:26, heures_sup:0, primes:0, retenues:0, avance:0, notes:''
  })

  const charger = () => {
    setLoading(true)
    Promise.all([
      api.get('/api/paye/personnel'),
      api.get(`/api/paye/bulletins?mois=${mois}&annee=${annee}`),
      api.get(`/api/paye/masse-salariale?annee=${annee}`)
    ]).then(([p,b,m]) => { setPersonnel(p); setBulletins(b); setMasse(m) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { charger() }, [mois, annee])

  const creerEmploye = async () => {
    if (!empForm.nom || !empForm.salaire_base) return toast.error('Nom et salaire requis')
    setSaving(true)
    try {
      await api.post('/api/paye/personnel', empForm)
      toast.success('Employe cree')
      setShowEmpForm(false)
      setEmpForm({ nom:'', prenom:'', poste:'', salaire_base:'', date_embauche:'', telephone:'', cnss:'' })
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const genererBulletin = async () => {
    if (!bulForm.id_personnel) return toast.error('Selectionnez un employe')
    setSaving(true)
    try {
      const res = await api.post('/api/paye/bulletins', { ...bulForm, mois, annee })
      toast.success(`Bulletin genere — Net a payer : ${fmt(res.net_a_payer)} FCFA`)
      setShowBulletinForm(false)
      setBulForm({ id_personnel:'', jours_travailles:26, heures_sup:0, primes:0, retenues:0, avance:0, notes:'' })
      charger()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const marquerPaye = async (id) => {
    await api.patch(`/api/paye/bulletins/${id}/payer`, {})
    toast.success('Marque comme paye')
    charger()
  }

  const totalNet  = bulletins.reduce((s,b) => s + parseFloat(b.net_a_payer||0), 0)
  const totalBrut = bulletins.reduce((s,b) => s + parseFloat(b.salaire_brut||0), 0)
  const nbPayes   = bulletins.filter(b => b.statut === 'PAYE').length

  // Preview bulletin
  const empSelectionne = personnel.find(p => p.id == bulForm.id_personnel)
  const preview = empSelectionne ? (() => {
    const base  = parseFloat(empSelectionne.salaire_base)
    const brut  = (base/26)*parseFloat(bulForm.jours_travailles) + parseFloat(bulForm.heures_sup||0) + parseFloat(bulForm.primes||0)
    const cnss  = brut * 0.04
    const irpp  = brut > 200000 ? (brut-200000)*0.15 : 0
    const net   = brut - cnss - irpp - parseFloat(bulForm.retenues||0) - parseFloat(bulForm.avance||0)
    return { brut, cnss, irpp, net }
  })() : null

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion de la paie</h1>
          <p className="text-sm text-gray-500">{personnel.length} employe(s) actif(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEmpForm(!showEmpForm)} className="btn-secondary flex items-center gap-2 text-sm">
            <Users size={14} /> Ajouter employe
          </button>
          <button onClick={() => setShowBulletinForm(!showBulletinForm)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Generer bulletin
          </button>
        </div>
      </div>

      {/* Stats mois */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-bjc-600">{fmt(totalBrut)}</div>
          <div className="text-xs text-gray-500 mt-1">Masse salariale brute</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-emerald-600">{fmt(totalNet)}</div>
          <div className="text-xs text-gray-500 mt-1">Total net a payer</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-lg font-bold text-amber-600">{nbPayes}/{bulletins.length}</div>
          <div className="text-xs text-gray-500 mt-1">Bulletins payes</div>
        </div>
      </div>

      {/* Formulaire employe */}
      {showEmpForm && (
        <div className="card p-5 border-2 border-bjc-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Nouvel employe</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="block text-xs text-gray-500 mb-1">Nom *</label>
              <input className="input" value={empForm.nom} onChange={e => setEmpForm({...empForm,nom:e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Prenom</label>
              <input className="input" value={empForm.prenom} onChange={e => setEmpForm({...empForm,prenom:e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Poste</label>
              <input className="input" value={empForm.poste} onChange={e => setEmpForm({...empForm,poste:e.target.value})} placeholder="Operateur, Graphiste..." /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Salaire de base (FCFA) *</label>
              <input type="number" className="input" value={empForm.salaire_base} onChange={e => setEmpForm({...empForm,salaire_base:e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Date embauche</label>
              <input type="date" className="input" value={empForm.date_embauche} onChange={e => setEmpForm({...empForm,date_embauche:e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Telephone</label>
              <input className="input" value={empForm.telephone} onChange={e => setEmpForm({...empForm,telephone:e.target.value})} /></div>
            <div><label className="block text-xs text-gray-500 mb-1">N° CNSS</label>
              <input className="input" value={empForm.cnss} onChange={e => setEmpForm({...empForm,cnss:e.target.value})} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={creerEmploye} disabled={saving} className="btn-success">{saving?'Enregistrement...':'Creer'}</button>
            <button onClick={() => setShowEmpForm(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Formulaire bulletin */}
      {showBulletinForm && (
        <div className="card p-5 border-2 border-emerald-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Generer bulletin — {MOIS_NOMS[mois-1]} {annee}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs text-gray-500 mb-1">Employe *</label>
              <select className="select" value={bulForm.id_personnel}
                onChange={e => setBulForm({...bulForm,id_personnel:e.target.value})}>
                <option value="">— Choisir —</option>
                {personnel.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.prenom||''} — {p.poste||'—'} — Salaire: {fmt(p.salaire_base)} FCFA
                  </option>
                ))}
              </select>
            </div>
            <div><label className="block text-xs text-gray-500 mb-1">Jours travailles</label>
              <input type="number" className="input" value={bulForm.jours_travailles}
                onChange={e => setBulForm({...bulForm,jours_travailles:e.target.value})} min="0" max="31" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Heures sup (FCFA)</label>
              <input type="number" className="input" value={bulForm.heures_sup}
                onChange={e => setBulForm({...bulForm,heures_sup:e.target.value})} min="0" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Primes (FCFA)</label>
              <input type="number" className="input" value={bulForm.primes}
                onChange={e => setBulForm({...bulForm,primes:e.target.value})} min="0" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Autres retenues (FCFA)</label>
              <input type="number" className="input" value={bulForm.retenues}
                onChange={e => setBulForm({...bulForm,retenues:e.target.value})} min="0" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Avance sur salaire (FCFA)</label>
              <input type="number" className="input" value={bulForm.avance}
                onChange={e => setBulForm({...bulForm,avance:e.target.value})} min="0" /></div>
            <div><label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input className="input" value={bulForm.notes}
                onChange={e => setBulForm({...bulForm,notes:e.target.value})} placeholder="Observations..." /></div>

            {/* Preview calculs */}
            {preview && (
              <div className="md:col-span-3 bg-emerald-50 rounded-lg p-3 text-xs grid grid-cols-4 gap-3 border border-emerald-200">
                <div><span className="text-gray-500">Salaire brut :</span><br/><strong className="text-gray-800">{fmt(preview.brut)} FCFA</strong></div>
                <div><span className="text-gray-500">CNSS 4% :</span><br/><strong className="text-red-600">-{fmt(preview.cnss)} FCFA</strong></div>
                <div><span className="text-gray-500">IRPP :</span><br/><strong className="text-red-600">-{fmt(preview.irpp)} FCFA</strong></div>
                <div><span className="text-gray-500">NET A PAYER :</span><br/><strong className="text-emerald-700 text-sm">{fmt(preview.net)} FCFA</strong></div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={genererBulletin} disabled={saving} className="btn-success">
              {saving?'Generation...':'Generer le bulletin'}
            </button>
            <button onClick={() => setShowBulletinForm(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-0">
        <div className="flex gap-1">
          {[['bulletins','Bulletins du mois'],['personnel','Liste personnel'],['masse','Masse salariale']].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===t ? 'border-bjc-500 text-bjc-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-2 pb-1">
          <select className="select w-auto text-sm" value={mois} onChange={e => setMois(e.target.value)}>
            {MOIS_NOMS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="select w-auto text-sm" value={annee} onChange={e => setAnnee(e.target.value)}>
            {[2026,2025,2024].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Bulletins */}
      {tab === 'bulletins' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Employe</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Poste</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Brut</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">CNSS</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Net</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Statut</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Chargement...</td></tr>
              : bulletins.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">Aucun bulletin pour cette periode</td></tr>
              : bulletins.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{b.nom} {b.prenom||''}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{b.poste||'—'}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(b.salaire_brut)}</td>
                  <td className="px-3 py-2.5 text-right text-red-500 text-xs">{fmt(b.cnss_salarial)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{fmt(b.net_a_payer)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${b.statut==='PAYE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {b.statut}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {b.statut !== 'PAYE' && (
                      <button onClick={() => marquerPaye(b.id)}
                        className="text-emerald-500 hover:text-emerald-700 transition-colors" title="Marquer paye">
                        <Check size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {bulletins.length > 0 && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={2} className="px-4 py-2.5 font-bold text-sm text-gray-700">TOTAL</td>
                  <td className="px-3 py-2.5 text-right font-bold">{fmt(totalBrut)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-red-500">{fmt(bulletins.reduce((s,b)=>s+parseFloat(b.cnss_salarial||0),0))}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-600 text-base">{fmt(totalNet)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Personnel */}
      {tab === 'personnel' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Nom</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Poste</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Salaire base</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Telephone</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">CNSS</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Embauche</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {personnel.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">Aucun employe enregistre</td></tr>
              : personnel.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{p.nom} {p.prenom||''}</td>
                  <td className="px-3 py-2.5 text-gray-500">{p.poste||'—'}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-bjc-600">{fmt(p.salaire_base)} FCFA</td>
                  <td className="px-3 py-2.5 text-gray-500">{p.telephone||'—'}</td>
                  <td className="px-3 py-2.5 text-gray-500">{p.cnss||'—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400">
                    {p.date_embauche ? new Date(p.date_embauche).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Masse salariale annuelle */}
      {tab === 'masse' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Mois</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Employes</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Total brut</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">CNSS</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-gray-500">Total net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {masse.length === 0 ? <tr><td colSpan={5} className="text-center py-10 text-gray-400">Aucune donnee pour {annee}</td></tr>
              : masse.map(m => (
                <tr key={m.mois} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{MOIS_NOMS[m.mois-1]} {m.annee}</td>
                  <td className="px-3 py-2.5 text-center">{m.nb_employes}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(m.total_brut)}</td>
                  <td className="px-3 py-2.5 text-right text-red-500">{fmt(m.total_cnss)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{fmt(m.total_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
