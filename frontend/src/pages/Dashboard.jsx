import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi.js'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
         ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, FileText, AlertTriangle, Wallet, Clock } from 'lucide-react'

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const fmt  = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0))

function StatCard({ icon: Icon, label, value, sub, color = 'bjc' }) {
  const colors = {
    bjc:   'bg-bjc-50 text-bjc-500',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red:   'bg-red-50 text-red-600',
  }
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-xl flex-shrink-0 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const api = useApi()
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [graphType, setGraphType] = useState('bar') // bar | line

  useEffect(() => {
    api.get('/api/stats/dashboard')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      Chargement du tableau de bord…
    </div>
  )

  const m   = data?.mois_actuel || {}
  const now = new Date()

  const chart12 = (data?.ca12mois || []).map(r => ({
    name: MOIS[r.mois - 1] + ' ' + String(r.annee).slice(2),
    CA: Math.round(r.ca_ht || 0),
    Factures: r.nb || 0
  }))

  const chart30 = (data?.ventes_30j || []).map(r => ({
    name: new Date(r.jour).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }),
    CA: Math.round(r.ca || 0)
  }))

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Titre */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500">
          {now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>

      {/* Stats du jour */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Aujourd'hui</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={TrendingUp} label="CA du jour (TTC)"
            value={`${fmt(data?.ca_jour?.ca)} FCFA`}
            sub={`${data?.ca_jour?.nb || 0} facture(s)`} color="bjc" />
          <StatCard icon={AlertTriangle} label="Alertes stock"
            value={data?.alertes_stock ?? 0}
            sub="Produits sous seuil"
            color={data?.alertes_stock > 0 ? 'red' : 'green'} />
        </div>
      </div>

      {/* Stats du mois */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {MOIS[now.getMonth()]} {now.getFullYear()}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={TrendingUp}    label="CA mensuel (HT)"
            value={`${fmt(m.ca_ht)} FCFA`}
            sub={`${m.nb_factures || 0} facture(s)`} color="bjc" />
          <StatCard icon={Wallet}        label="Bénéfice estimé"
            value={`${fmt(m.benefice_estime)} FCFA`}
            sub="CA HT - charges" color="green" />
          <StatCard icon={FileText}      label="Charges du mois"
            value={`${fmt(m.total_charges)} FCFA`}
            sub={`Fixes: ${fmt(m.charges_fixes)}`} color="amber" />
          <StatCard icon={Clock}         label="Impayés en cours"
            value={`${fmt(data?.montant_impaye)} FCFA`}
            sub="Toutes périodes" color="red" />
        </div>
      </div>

      {/* Graphiques */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">
            {graphType === 'bar' ? 'CA mensuel — 12 derniers mois' : 'CA journalier — 30 derniers jours'}
          </h2>
          <div className="flex gap-1 rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setGraphType('bar')}
              className={`px-3 py-1 text-xs font-medium ${graphType==='bar' ? 'bg-bjc-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              12 mois
            </button>
            <button onClick={() => setGraphType('line')}
              className={`px-3 py-1 text-xs font-medium ${graphType==='line' ? 'bg-bjc-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
              30 jours
            </button>
          </div>
        </div>

        {graphType === 'bar' ? (
          chart12.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chart12} margin={{ top:0, right:0, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize:10 }} />
                <YAxis tick={{ fontSize:10 }} tickFormatter={v => v>=1000 ? (v/1000)+'k' : v} />
                <Tooltip formatter={(v,n) => [fmt(v)+' FCFA', n]} />
                <Bar dataKey="CA" fill="#534AB7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Aucune vente enregistrée
            </div>
          )
        ) : (
          chart30.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chart30} margin={{ top:0, right:0, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize:9 }} />
                <YAxis tick={{ fontSize:10 }} tickFormatter={v => v>=1000 ? (v/1000)+'k' : v} />
                <Tooltip formatter={(v) => [fmt(v)+' FCFA', 'CA']} />
                <Line type="monotone" dataKey="CA" stroke="#534AB7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Aucune vente sur les 30 derniers jours
            </div>
          )
        )}
      </div>

      {/* Top clients */}
      {data?.top_clients?.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Top 5 clients — année en cours</h2>
          <div className="space-y-2">
            {data.top_clients.map((c, i) => {
              const pct = Math.round((c.total / data.top_clients[0].total) * 100)
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-bjc-100 text-bjc-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i+1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-gray-700 font-medium truncate">{c.nom_client}</span>
                      <span className="text-sm font-semibold text-gray-900 ml-2 flex-shrink-0">{fmt(c.total)} FCFA</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-bjc-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
