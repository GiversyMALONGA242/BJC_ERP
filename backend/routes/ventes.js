const express = require('express');
const pool    = require('../db');
const { requireRole } = require('../middleware/auth');
const router  = express.Router();

async function nextNum(conn, type, prefix) {
  const year = new Date().getFullYear();
  await conn.query(
    `INSERT INTO sequences_documents (type_doc,annee,dernier_numero) VALUES (?,?,1)
     ON DUPLICATE KEY UPDATE dernier_numero=dernier_numero+1`, [type, year]);
  const [[s]] = await conn.query(
    `SELECT dernier_numero FROM sequences_documents WHERE type_doc=? AND annee=?`, [type, year]);
  return `${prefix}-${s.dernier_numero}`;
}

// GET /api/ventes?mois=&annee=&jour=&client_id=&vue=jour|mois|annee
router.get('/', async (req, res) => {
  try {
    const { mois, annee, jour, client_id } = req.query;
    let sql = `SELECT v.*, c.nom_client, c.telephone,
               COALESCE(v.montant_paye,0) AS montant_paye,
               (v.total_ttc - COALESCE(v.montant_paye,0)) AS reste_a_payer
               FROM ventes v JOIN clients c ON v.id_client=c.id WHERE 1=1`;
    const p = [];
    if (annee)     { sql += ' AND YEAR(v.date_vente)=?';           p.push(annee); }
    if (mois)      { sql += ' AND MONTH(v.date_vente)=?';          p.push(mois); }
    if (jour)      { sql += ' AND DATE(v.date_vente)=?';           p.push(jour); }
    if (client_id) { sql += ' AND v.id_client=?';                  p.push(client_id); }
    sql += ' ORDER BY v.date_vente DESC LIMIT 500';
    const [rows] = await pool.query(sql, p);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ventes/:id
router.get('/:id', async (req, res) => {
  try {
    const [[v]] = await pool.query(
      `SELECT v.*, c.nom_client, c.telephone, c.adresse, c.rccm, c.niu,
              COALESCE(v.montant_paye,0) AS montant_paye,
              (v.total_ttc - COALESCE(v.montant_paye,0)) AS reste_a_payer
       FROM ventes v JOIN clients c ON v.id_client=c.id WHERE v.id=?`, [req.params.id]);
    if (!v) return res.status(404).json({ error: 'Introuvable' });
        const [d] = await pool.query(
      `SELECT vd.id, vd.id_vente, vd.id_service, vd.designation_libre,
              vd.longueur, vd.largeur, vd.quantite, vd.prix_vente_ht_applique,
              (vd.quantite * vd.prix_vente_ht_applique) AS total_ht_ligne,
              cs.designation AS service_nom, cs.unite
       FROM ventes_details vd
       LEFT JOIN catalogue_services cs ON vd.id_service=cs.id
       WHERE vd.id_vente=?`, [req.params.id]);
    // Récupérer BL lié
    const [[bl]] = await pool.query(
      'SELECT numero_bl FROM bons_livraison WHERE id_vente=? LIMIT 1', [req.params.id]);
    res.json({ ...v, details: d, numero_bl: bl?.numero_bl || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ventes
router.post('/', async (req, res) => {
  const { id_client, articles, remise_taux=0, tva_active=false,
          cad_active=false, notes } = req.body;
  if (!id_client || !articles?.length)
    return res.status(400).json({ error: 'id_client et articles requis' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const brut   = articles.reduce((s,a) => s + a.quantite*a.prix_vente_ht_applique, 0);
    const rem    = brut * remise_taux / 100;
    const net    = brut - rem;
    const tvaM   = tva_active ? net*0.18 : 0;
    const cadM   = cad_active ? net*0.05 : 0;
    const ttc    = net + tvaM + cadM;
    const numero_facture = await nextNum(conn,'FACTURE','BJCFAC');
    const [r] = await conn.query(
      `INSERT INTO ventes
       (numero_facture,id_client,montant_brut_ht,remise_taux,tva_active,tva_taux,
        tva_montant,cad_active,cad_taux,cad_montant,total_ttc,montant_paye,id_utilisateur,notes)
       VALUES (?,?,?,?,?,18,?,?,5,?,?,0,?,?)`,
      [numero_facture,id_client,brut,remise_taux,tva_active?1:0,tvaM,
       cad_active?1:0,cadM,ttc,req.user.id,notes||null]);
    const id_vente = r.insertId;
    for (const a of articles) {
      await conn.query(
        `INSERT INTO ventes_details
         (id_vente,id_service,designation_libre,longueur,largeur,quantite,prix_vente_ht_applique)
         VALUES (?,?,?,?,?,?,?)`,
        [id_vente,a.id_service||null,a.designation_libre||null,
         a.longueur||0,a.largeur||0,a.quantite,a.prix_vente_ht_applique]);
      const [fiches] = await conn.query(
        'SELECT * FROM fiches_techniques WHERE id_service=?',[a.id_service]);
      for (const f of fiches) {
        const c = f.quantite_conso*a.quantite;
        await conn.query(
          'UPDATE produits SET stock_actuel=GREATEST(0,stock_actuel-?) WHERE id=?',[c,f.id_produit_brut]);
        await conn.query(
          `INSERT INTO stock_mouvements (id_produit,type_mouvement,quantite,reference_doc,id_utilisateur)
           VALUES (?,?,?,?,?)`,
          [f.id_produit_brut,'SORTIE_VENTE',c,numero_facture,req.user.id]);
      }
    }
    const numero_bl = await nextNum(conn,'BL','BJCRL');
    await conn.query(
      `INSERT INTO bons_livraison (numero_bl,id_vente,statut) VALUES (?,?,'EN_PREPARATION')`,
      [numero_bl,id_vente]);
    await conn.query(
      `INSERT INTO audit_logs (id_utilisateur,action,entite,entite_id,details) VALUES (?,?,?,?,?)`,
      [req.user.id,'CREATION_FACTURE','ventes',id_vente,JSON.stringify({numero_facture,ttc})]);
    await conn.commit();
    res.status(201).json({id:id_vente,numero_facture,numero_bl,total_ttc:ttc});
  } catch (err) { await conn.rollback(); res.status(500).json({error:err.message}); }
  finally { conn.release(); }
});

// PATCH /api/ventes/:id/paiement — avec gestion acompte
router.patch('/:id/paiement', async (req, res) => {
  const { statut_paiement, montant_paye } = req.body;
  const valides = ['NON_PAYE','PARTIEL','PAYE'];
  if (!valides.includes(statut_paiement))
    return res.status(400).json({ error: 'Statut invalide' });
  try {
    const [[v]] = await pool.query('SELECT total_ttc FROM ventes WHERE id=?',[req.params.id]);
    if (!v) return res.status(404).json({ error: 'Introuvable' });
    let paye = parseFloat(montant_paye ?? 0);
    let statut = statut_paiement;
    // Auto-calcul statut selon montant
    if (montant_paye !== undefined) {
      if (paye <= 0)          statut = 'NON_PAYE';
      else if (paye >= v.total_ttc) { statut = 'PAYE'; paye = v.total_ttc; }
      else                    statut = 'PARTIEL';
    }
    await pool.query(
      'UPDATE ventes SET statut_paiement=?, montant_paye=? WHERE id=?',
      [statut, paye, req.params.id]);
    res.json({ message: 'Paiement mis à jour', statut, montant_paye: paye,
               reste: v.total_ttc - paye });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
