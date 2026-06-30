import { useRef } from 'react'
import { X, Download } from 'lucide-react'

const ENTREPRISE = {
  nom:     'IMPRIMERIE BJC',
  adresse: '4 Bis rue Zandes Avenue Maya-maya, Poto-poto 2',
  contact: '06 689 36 36 / 05 332 36 36',
  rccm:    'CG-BZV-01-2021-B13-00072',
  niu:     'M21000000196664Q',
  rib:     '30020 88100 20592590000 35',
  regime:  'REEL',
}

const fmt  = n => new Intl.NumberFormat('fr-FR').format(Math.round(n||0))
const fmtD = n => n ? new Date(n).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'

function montantEnLettres(n) {
  if (!n || n===0) return 'ZERO FRANC CFA'
  const u=['','UN','DEUX','TROIS','QUATRE','CINQ','SIX','SEPT','HUIT','NEUF',
            'DIX','ONZE','DOUZE','TREIZE','QUATORZE','QUINZE','SEIZE','DIX-SEPT','DIX-HUIT','DIX-NEUF']
  const d=['','','VINGT','TRENTE','QUARANTE','CINQUANTE','SOIXANTE','SOIXANTE','QUATRE-VINGT','QUATRE-VINGT']
  function c2t(c) {
    if(c===0)return''
    if(c<20)return u[c]
    const t=Math.floor(c/10),r=c%10
    if(t===7)return'SOIXANTE-'+u[10+r]
    if(t===9)return'QUATRE-VINGT'+(r===0?'S':'-'+u[r])
    return d[t]+(r>0?'-'+u[r]:(t===8?'S':''))
  }
  function n2t(num) {
    if(num===0)return''
    if(num<100)return c2t(num)
    const h=Math.floor(num/100),r=num%100
    return(h===1?'CENT':u[h]+' CENTS')+(r>0?' '+c2t(r):'')
  }
  const M=Math.floor(n/1000000),K=Math.floor((n%1000000)/1000),R=n%1000
  let s=''
  if(M)s+=n2t(M)+(M===1?' MILLION ':' MILLIONS ')
  if(K)s+=n2t(K)+(K===1?' MILLE ':' MILLE ')
  if(R)s+=n2t(R)
  return s.trim()+' FRANCS CFA'
}

const CSS = `
@media print {
  body * { visibility: hidden !important; }
  #zone-doc, #zone-doc * { visibility: visible !important; }
  #zone-doc { position: fixed !important; left:0; top:0; width:100% !important; padding:0 !important; }
  .no-print { display: none !important; }
  @page { margin: 6mm; size: A4 portrait; }
}
`

function PrintWrapper({ title, onClose, children, onSavePdf }) {
  return (
    <div className="min-h-screen bg-gray-200 p-4">
      <style>{CSS}</style>
      <div className="no-print flex items-center gap-2 mb-4 max-w-4xl mx-auto flex-wrap">
        <button onClick={onClose}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 shadow-sm">
          <X size={14}/> Retour
        </button>
        <span className="text-sm font-semibold text-gray-700 flex-1">{title}</span>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-bjc-500 text-white px-5 py-2 rounded-lg text-sm hover:bg-bjc-600 shadow">
          🖨️ Imprimer
        </button>
        <button onClick={() => { window.print() }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-emerald-700 shadow"
          title="Dans la boite d'impression, choisissez 'Enregistrer en PDF' comme imprimante">
          <Download size={14}/> Enregistrer PDF
        </button>
        <p className="no-print w-full text-xs text-gray-400 text-center">
          Pour enregistrer en PDF : cliquez "Enregistrer PDF" puis choisissez "Microsoft Print to PDF" ou "Enregistrer en PDF" comme imprimante
        </p>
      </div>
      <div id="zone-doc" className="max-w-4xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// En-tete commune
function Entete({ titre, numero, client, date }) {
  return (
    <table style={{width:'100%',borderBottom:'3px solid #534AB7',paddingBottom:'14px',marginBottom:'16px'}}>
      <tbody><tr>
        <td style={{width:'45%',verticalAlign:'top'}}>
          {/* Logo plus grand */}
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
            <img src="/logo.png" alt="Logo BJC"
              style={{height:'70px',maxWidth:'180px',objectFit:'contain'}}
              onError={e=>{e.target.style.display='none'}} />
            <div style={{fontSize:'18px',fontWeight:'900',color:'#534AB7',letterSpacing:'1px',lineHeight:'1.2'}}>
              {ENTREPRISE.nom}
            </div>
          </div>
          <div style={{fontSize:'9.5px',color:'#444',lineHeight:'1.8'}}>
            <div>📍 {ENTREPRISE.adresse}</div>
            <div>📞 {ENTREPRISE.contact}</div>
            <div>RCCM : {ENTREPRISE.rccm}</div>
            <div>NIU : {ENTREPRISE.niu}</div>
            <div>RIB : {ENTREPRISE.rib}</div>
            <div>REGIME FISCAL : {ENTREPRISE.regime}</div>
          </div>
        </td>
        <td style={{textAlign:'right',verticalAlign:'top'}}>
          <div style={{fontSize:'22px',fontWeight:'900',color:'#534AB7',marginBottom:'4px'}}>{titre}</div>
          <div style={{fontSize:'18px',fontWeight:'700',color:'#222',marginBottom:'12px'}}>N° : {numero}</div>
          <div style={{background:'#f0f0ff',border:'1px solid #534AB7',borderRadius:'8px',padding:'10px 14px',display:'inline-block',textAlign:'left',fontSize:'10px',lineHeight:'1.9'}}>
            <div><strong>{client.label} :</strong> {client.nom}</div>
            {client.tel     && <div><strong>TEL :</strong> {client.tel}</div>}
            {client.adresse && <div><strong>ADRESSE :</strong> {client.adresse}</div>}
            {client.rccm    && <div><strong>RCCM :</strong> {client.rccm}</div>}
            {client.niu     && <div><strong>NIU :</strong> {client.niu}</div>}
            <div><strong>DATE :</strong> {date}</div>
          </div>
        </td>
      </tr></tbody>
    </table>
  )
}

function TableauArticles({ colonnes, lignes, nbMin=10 }) {
  const vides = Math.max(0, nbMin - lignes.length)
  return (
    <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'16px',fontSize:'10px'}}>
      <thead>
        <tr style={{background:'#534AB7',color:'white'}}>
          {colonnes.map((c,i) => (
            <th key={i} style={{padding:'7px 8px',textAlign:c.align||'left',border:'1px solid #3d3490',width:c.width}}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((row,i) => (
          <tr key={i} style={{background:i%2===0?'#fff':'#f8f8ff'}}>
            {row.map((cell,j) => (
              <td key={j} style={{padding:'6px 8px',border:'1px solid #e0e0e0',textAlign:colonnes[j]?.align||'left',fontWeight:colonnes[j]?.bold?'bold':'normal'}}>
                {cell??'—'}
              </td>
            ))}
          </tr>
        ))}
        {Array.from({length:vides}).map((_,i) => (
          <tr key={'v'+i}>
            {colonnes.map((_,j) => (
              <td key={j} style={{padding:'6px 8px',border:'1px solid #e0e0e0',height:'22px'}}> </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Signatures({ gauche, droite }) {
  return (
    <table style={{width:'100%',marginTop:'30px'}}>
      <tbody><tr>
        <td style={{width:'50%',paddingRight:'20px',textAlign:'center'}}>
          <div style={{borderTop:'1px solid #aaa',paddingTop:'6px',fontSize:'10px',color:'#555'}}>{gauche}</div>
        </td>
        <td style={{width:'50%',paddingLeft:'20px',textAlign:'center'}}>
          {/* Cachet plus grand */}
          <img src="/cachet.png" alt="Cachet BJC"
            style={{height:'90px',maxWidth:'160px',objectFit:'contain',opacity:0.9,display:'block',margin:'0 auto 8px'}}
            onError={e=>{e.target.style.display='none'}} />
          <div style={{borderTop:'1px solid #aaa',paddingTop:'6px',fontSize:'10px',color:'#555'}}>{droite}</div>
        </td>
      </tr></tbody>
    </table>
  )
}

function Pied() {
  return (
    <div style={{marginTop:'16px',borderTop:'2px solid #534AB7',paddingTop:'6px',textAlign:'center',color:'#888',fontSize:'9px'}}>
      {ENTREPRISE.nom} — {ENTREPRISE.adresse} — Tel : {ENTREPRISE.contact} — RCCM : {ENTREPRISE.rccm} — NIU : {ENTREPRISE.niu}
    </div>
  )
}

// FACTURE
export function ImprimerFacture({ data, onClose }) {
  const { facture } = data
  if (!facture) return null
  const details = facture.details || []
  const ttc = parseFloat(facture.total_ttc||0)
  const colonnes = [
    {label:'N°',align:'center',width:'28px'},
    {label:'DESIGNATION',align:'left'},
    {label:'LONG.(m)',align:'center',width:'60px'},
    {label:'LARG.(m)',align:'center',width:'60px'},
    {label:'QTE',align:'center',width:'48px'},
    {label:'TOT.UNITE',align:'center',width:'65px'},
    {label:'PU HT (FCFA)',align:'right',width:'90px'},
    {label:'TOTAL HT',align:'right',width:'90px',bold:true},
  ]
  const lignes = details.map((d,i) => {
    const tu = d.longueur>0&&d.largeur>0 ? (d.longueur*d.largeur*d.quantite).toFixed(2) : d.quantite
    return [i+1,d.designation_libre||d.service_nom,
            d.longueur>0?d.longueur:'—',d.largeur>0?d.largeur:'—',
            d.quantite,tu,fmt(d.prix_vente_ht_applique),fmt(d.total_ht_ligne)]
  })
  return (
    <PrintWrapper title={`Facture ${facture.numero_facture}`} onClose={onClose}>
      <div style={{padding:'20px',fontSize:'11px'}}>
        <Entete titre="FACTURE" numero={facture.numero_facture}
          client={{label:'DOIT',nom:facture.nom_client,tel:facture.telephone,adresse:facture.adresse,rccm:facture.rccm,niu:facture.niu}}
          date={fmtD(facture.date_vente)} />
        <TableauArticles colonnes={colonnes} lignes={lignes} />
        <table style={{width:'100%',fontSize:'10px'}}>
          <tbody><tr>
            <td style={{width:'54%',verticalAlign:'top',paddingRight:'16px'}}>
              <div style={{background:'#f0f0ff',border:'1px solid #534AB7',borderRadius:'6px',padding:'10px',marginBottom:'12px'}}>
                <strong style={{display:'block',marginBottom:'4px'}}>Arretee a la somme de :</strong>
                <span style={{color:'#534AB7',fontWeight:'bold',fontSize:'11px'}}>{montantEnLettres(Math.round(ttc))}.</span>
              </div>
              {(facture.statut_paiement==='PARTIEL'||facture.montant_paye>0) && (
                <div style={{background:'#fff8e1',border:'1px solid #f0c040',borderRadius:'6px',padding:'8px',marginBottom:'8px',fontSize:'10px'}}>
                  <div>Acompte recu : <strong style={{color:'#0a6640'}}>{fmt(facture.montant_paye)} FCFA</strong></div>
                  <div>Reste a payer : <strong style={{color:'#c0392b'}}>{fmt(facture.reste_a_payer||facture.total_ttc-facture.montant_paye)} FCFA</strong></div>
                </div>
              )}
              <div style={{marginTop:'28px',textAlign:'center'}}>
                <div style={{borderTop:'1px solid #aaa',paddingTop:'6px',color:'#555',fontSize:'10px'}}>Signature & Cachet Client</div>
              </div>
            </td>
            <td style={{width:'46%',verticalAlign:'top'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <tbody>
                  {[
                    ['MONTANT BRUT HT',`${fmt(facture.montant_brut_ht)} FCFA`,false],
                    [`REMISE ${facture.remise_taux>0?facture.remise_taux+'%':''}`,
                     facture.remise_taux>0?`- ${fmt(facture.remise_montant)} FCFA`:'%',false],
                    [`TVA 18%${!facture.tva_active?' (EXONERE)':''}`,
                     facture.tva_active?`${fmt(facture.tva_montant)} FCFA`:'0 FCFA',false],
                    [`CAD 5%${!facture.cad_active?' (EXONERE)':''}`,
                     facture.cad_active?`${fmt(facture.cad_montant)} FCFA`:'0 FCFA',false],
                  ].map(([k,v],i) => (
                    <tr key={i}>
                      <td style={{padding:'5px 8px',background:'#f5f5f5',border:'1px solid #ddd'}}>{k}</td>
                      <td style={{padding:'5px 8px',border:'1px solid #ddd',textAlign:'right'}}>{v}</td>
                    </tr>
                  ))}
                  <tr style={{background:'#534AB7',color:'white'}}>
                    <td style={{padding:'8px 10px',fontWeight:'bold',fontSize:'12px',border:'1px solid #3d3490'}}>NET A PAYER</td>
                    <td style={{padding:'8px 10px',fontWeight:'bold',fontSize:'12px',textAlign:'right',border:'1px solid #3d3490'}}>{fmt(ttc)} FCFA</td>
                  </tr>
                </tbody>
              </table>
              <Signatures gauche="" droite="Signature & Cachet BJC" />
            </td>
          </tr></tbody>
        </table>
        <Pied />
      </div>
    </PrintWrapper>
  )
}

// BON DE LIVRAISON
export function ImprimerBL({ data, onClose }) {
  const { facture } = data
  if (!facture) return null
  const details = facture.details || []
  const colonnes = [
    {label:'N°',align:'center',width:'28px'},
    {label:'DESIGNATION',align:'left'},
    {label:'LONG.(m)',align:'center',width:'70px'},
    {label:'LARG.(m)',align:'center',width:'70px'},
    {label:'QTE',align:'center',width:'55px'},
    {label:'TOT.UNITE',align:'center',width:'70px'},
  ]
  const lignes = details.map((d,i) => {
    const tu = d.longueur>0&&d.largeur>0?(d.longueur*d.largeur*d.quantite).toFixed(2):d.quantite
    return [i+1,d.designation_libre||d.service_nom,
            d.longueur>0?d.longueur:'—',d.largeur>0?d.largeur:'—',d.quantite,tu]
  })
  return (
    <PrintWrapper title={`Bon de livraison ${facture.numero_bl||''}`} onClose={onClose}>
      <div style={{padding:'20px',fontSize:'11px'}}>
        <Entete titre="BON DE LIVRAISON" numero={facture.numero_bl||`BL-${facture.id}`}
          client={{label:'CLIENT',nom:facture.nom_client,tel:facture.telephone,adresse:facture.adresse}}
          date={fmtD(facture.date_vente)} />
        <TableauArticles colonnes={colonnes} lignes={lignes} />
        <div style={{background:'#fff8e1',border:'1px solid #f0c040',borderRadius:'6px',padding:'8px 12px',fontSize:'9.5px',color:'#7a5c00',marginBottom:'10px'}}>
          Veuillez verifier la conformite des marchandises des leur reception avant de signer.
        </div>
        <Signatures gauche="Signature du Receptionniste" droite="Signature & Cachet Imprimerie BJC" />
        <Pied />
      </div>
    </PrintWrapper>
  )
}

// BON DE COMMANDE
export function ImprimerBC({ data, onClose }) {
  const { bc } = data
  if (!bc) return null
  const details = bc.details || []
  const total = details.reduce((s,d) => s+d.quantite*(d.prix_unitaire_ht||0), 0)
  const colonnes = [
    {label:'N°',align:'center',width:'28px'},
    {label:'DESIGNATION',align:'left'},
    {label:'LONG.(m)',align:'center',width:'60px'},
    {label:'LARG.(m)',align:'center',width:'60px'},
    {label:'QTE',align:'center',width:'48px'},
    {label:'PU HT (FCFA)',align:'right',width:'90px'},
    {label:'TOTAL HT',align:'right',width:'90px',bold:true},
  ]
  const lignes = details.map((d,i) => [
    i+1,d.designation_libre||d.service_nom,
    d.longueur>0?d.longueur:'—',d.largeur>0?d.largeur:'—',
    d.quantite,fmt(d.prix_unitaire_ht),fmt(d.quantite*(d.prix_unitaire_ht||0))
  ])
  return (
    <PrintWrapper title={`Bon de commande ${bc.numero_bc}`} onClose={onClose}>
      <div style={{padding:'20px',fontSize:'11px'}}>
        <Entete titre="BON DE COMMANDE" numero={bc.numero_bc}
          client={{label:'CLIENT',nom:bc.nom_client,tel:bc.telephone,adresse:bc.adresse}}
          date={fmtD(bc.date_commande)} />
        <TableauArticles colonnes={colonnes} lignes={lignes} />
        {bc.notes && (
          <div style={{background:'#f8f8ff',border:'1px solid #ddd',borderRadius:'6px',padding:'8px',marginBottom:'12px',fontSize:'10px'}}>
            <strong>Observations :</strong> {bc.notes}
          </div>
        )}
        <table style={{width:'100%',fontSize:'10px'}}>
          <tbody><tr>
            <td style={{width:'55%'}}></td>
            <td style={{width:'45%'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <tbody>
                  <tr style={{background:'#534AB7',color:'white'}}>
                    <td style={{padding:'8px 10px',fontWeight:'bold',fontSize:'12px',border:'1px solid #3d3490'}}>TOTAL HT</td>
                    <td style={{padding:'8px 10px',fontWeight:'bold',fontSize:'12px',textAlign:'right',border:'1px solid #3d3490'}}>{fmt(total)} FCFA</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr></tbody>
        </table>
        <Signatures gauche="Signature Client" droite="Signature & Cachet Imprimerie BJC" />
        <Pied />
      </div>
    </PrintWrapper>
  )
}
