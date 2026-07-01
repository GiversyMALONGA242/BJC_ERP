const express = require('express');
const pool    = require('../db');
const router  = express.Router();

async function nextNumeroBC(conn) {
  const year = new Date().getFullYear();
  await conn.query(
    `INSERT INTO sequences_documents (type_doc,annee,dernier_numero) VALUES ('BC',?,1)
     ON DUPLICATE KEY UPDATE dernier_numero=dernier_numero+1`, [year]);
  const [[s]] = await conn.query(
    `SELECT dernier_numero FROM sequences_documents WHERE type_doc='BC' AND annee=?`, [year]);
  return `BJCBC-${s.dernier_numero}`;
}

// GET liste
// GET liste
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT bc.*, c.nom_client, c.telephone, c.adresse,
             u.nom_utilisateur,
             COUNT(bcd.id) AS nb_lignes,
             SUM(bcd.quantite*bcd.prix_unitaire_ht) AS montant_total
      FROM bons_commande bc
      JOIN clients c ON bc.id_client=c.id
      LEFT JOIN utilisateurs u ON bc.id_utilisateur=u.id
      LEFT JOIN bons_commande_details bcd ON bc.id=bcd.id_bc
      GROUP BY bc.id, u.nom_utilisateur  -- MODIFICATION ICI : ajout de u.nom_utilisateur
      ORDER BY bc.date_commande DESC LIMIT 300`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET detail
router.get('/:id', async (req, res) => {
  try {
    const [[bc]] = await pool.query(`
      SELECT bc.*, c.nom_client, c.telephone, c.adresse, c.rccm, c.niu, c.rib, c.regime_fiscal
      FROM bons_commande bc JOIN clients c ON bc.id_client=c.id WHERE bc.id=?`, [req.params.id]);
    if (!bc) return res.status(404).json({ error: 'BC introuvable' });
    const [details] = await pool.query(`
      SELECT bcd.*, cs.designation AS service_nom, cs.unite
      FROM bons_commande_details bcd
      LEFT JOIN catalogue_services cs ON bcd.id_service=cs.id
      WHERE bcd.id_bc=?`, [req.params.id]);
    res.json({ ...bc, details });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST creer BC
router.post('/', async (req, res) => {
  const { id_client, articles, notes } = req.body;
  if (!id_client || !articles?.length)
    return res.status(400).json({ error: 'id_client et articles requis' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const numero_bc = await nextNumeroBC(conn);
    const [r] = await conn.query(
      `INSERT INTO bons_commande (numero_bc,id_client,statut,notes,id_utilisateur)
       VALUES (?,?,'EN_ATTENTE',?,?)`,
      [numero_bc, id_client, notes||null, req.user.id]);
    const id_bc = r.insertId;
    for (const art of articles) {
      await conn.query(
        `INSERT INTO bons_commande_details
         (id_bc,id_service,designation_libre,dimensions,longueur,largeur,quantite,prix_unitaire_ht)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id_bc, art.id_service||null, art.designation_libre||null,
         art.dimensions||null, art.longueur||0, art.largeur||0,
         art.quantite, art.prix_unitaire_ht]);
    }
    await conn.commit();
    res.status(201).json({ id: id_bc, numero_bc });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

// PUT modifier BC (seulement si pas encore FACTURE)
router.put('/:id', async (req, res) => {
  const { id_client, articles, notes } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[bc]] = await conn.query('SELECT statut FROM bons_commande WHERE id=?', [req.params.id]);
    if (!bc) { await conn.rollback(); return res.status(404).json({ error: 'BC introuvable' }); }
    if (bc.statut === 'FACTURE')
      { await conn.rollback(); return res.status(400).json({ error: 'Impossible de modifier un BC deja facture' }); }

    // Mettre a jour l'entete
    await conn.query(
      'UPDATE bons_commande SET id_client=?,notes=? WHERE id=?',
      [id_client, notes||null, req.params.id]);

    // Supprimer les anciennes lignes et reinserrer
    await conn.query('DELETE FROM bons_commande_details WHERE id_bc=?', [req.params.id]);
    for (const art of articles) {
      await conn.query(
        `INSERT INTO bons_commande_details
         (id_bc,id_service,designation_libre,dimensions,longueur,largeur,quantite,prix_unitaire_ht)
         VALUES (?,?,?,?,?,?,?,?)`,
        [req.params.id, art.id_service||null, art.designation_libre||null,
         art.dimensions||null, art.longueur||0, art.largeur||0,
         art.quantite, art.prix_unitaire_ht]);
    }
    await conn.commit();
    res.json({ message: 'BC mis a jour' });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

// PATCH statut
router.patch('/:id/statut', async (req, res) => {
  const { statut } = req.body;
  const valides = ['EN_ATTENTE','EN_COURS','LIVRE','FACTURE','ANNULE'];
  if (!valides.includes(statut)) return res.status(400).json({ error: 'Statut invalide' });
  try {
    await pool.query('UPDATE bons_commande SET statut=? WHERE id=?', [statut, req.params.id]);
    res.json({ message: 'Statut mis a jour' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST convertir en facture
router.post('/:id/convertir-facture', async (req, res) => {
  const { remise_taux=0, tva_active=false, cad_active=false } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[bc]] = await conn.query(
      `SELECT bc.*, c.nom_client FROM bons_commande bc
       JOIN clients c ON bc.id_client=c.id WHERE bc.id=?`, [req.params.id]);
    if (!bc) { await conn.rollback(); return res.status(404).json({ error: 'BC introuvable' }); }
    if (bc.statut === 'FACTURE') { await conn.rollback(); return res.status(400).json({ error: 'Deja facture' }); }

    const [details] = await conn.query(
      'SELECT * FROM bons_commande_details WHERE id_bc=?', [req.params.id]);
    const brut = details.reduce((s,d) => s + d.quantite*d.prix_unitaire_ht, 0);
    const rem  = brut*remise_taux/100;
    const net  = brut - rem;
    const tvaM = tva_active ? net*0.18 : 0;
    const cadM = cad_active ? net*0.05 : 0;
    const ttc  = net + tvaM + cadM;

    const year = new Date().getFullYear();
    await conn.query(`INSERT INTO sequences_documents (type_doc,annee,dernier_numero) VALUES ('FACTURE',?,1)
      ON DUPLICATE KEY UPDATE dernier_numero=dernier_numero+1`, [year]);
    const [[sf]] = await conn.query(
      `SELECT dernier_numero FROM sequences_documents WHERE type_doc='FACTURE' AND annee=?`, [year]);
    const numero_facture = `BJCFAC-${sf.dernier_numero}`;

    const [rv] = await conn.query(
      `INSERT INTO ventes
       (numero_facture,id_client,id_bc,montant_brut_ht,remise_taux,tva_active,tva_taux,
        tva_montant,cad_active,cad_taux,cad_montant,total_ttc,montant_paye,id_utilisateur)
       VALUES (?,?,?,?,?,?,18,?,?,5,?,?,0,?)`,
      [numero_facture,bc.id_client,bc.id,brut,remise_taux,tva_active?1:0,
       tvaM,cad_active?1:0,cadM,ttc,req.user.id]);
    const id_vente = rv.insertId;

    for (const d of details) {
      await conn.query(
        `INSERT INTO ventes_details
         (id_vente,id_service,designation_libre,longueur,largeur,quantite,prix_vente_ht_applique)
         VALUES (?,?,?,?,?,?,?)`,
        [id_vente,d.id_service,d.designation_libre,d.longueur,d.largeur,d.quantite,d.prix_unitaire_ht]);
      const [fiches] = await conn.query(
        'SELECT * FROM fiches_techniques WHERE id_service=?', [d.id_service]);
      for (const f of fiches) {
        const conso = f.quantite_conso*d.quantite;
        await conn.query(
          'UPDATE produits SET stock_actuel=GREATEST(0,stock_actuel-?) WHERE id=?',[conso,f.id_produit_brut]);
        await conn.query(
          `INSERT INTO stock_mouvements (id_produit,type_mouvement,quantite,reference_doc,id_utilisateur)
           VALUES (?,?,?,?,?)`,[f.id_produit_brut,'SORTIE_VENTE',conso,numero_facture,req.user.id]);
      }
    }

    await conn.query(`INSERT INTO sequences_documents (type_doc,annee,dernier_numero) VALUES ('BL',?,1)
      ON DUPLICATE KEY UPDATE dernier_numero=dernier_numero+1`, [year]);
    const [[sb]] = await conn.query(
      `SELECT dernier_numero FROM sequences_documents WHERE type_doc='BL' AND annee=?`, [year]);
    const numero_bl = `BJCRL-${sb.dernier_numero}`;
    await conn.query(
      `INSERT INTO bons_livraison (numero_bl,id_vente,statut) VALUES (?,?,'EN_PREPARATION')`,
      [numero_bl,id_vente]);

    await conn.query(`UPDATE bons_commande SET statut='FACTURE' WHERE id=?`, [req.params.id]);
    await conn.commit();
    res.json({ id_vente, numero_facture, numero_bl, total_ttc: ttc });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

module.exports = router;
