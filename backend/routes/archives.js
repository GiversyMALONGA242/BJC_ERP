const express = require('express');
const pool    = require('../db');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

// Sanitize nom de dossier
function safeName(n) {
  return (n || 'INCONNU').replace(/[^a-zA-Z0-9_\-. ]/g,'_').trim();
}

// GET /api/archives/client/:id — tous les docs d'un client
router.get('/client/:id', async (req, res) => {
  try {
    const [[client]] = await pool.query(
      'SELECT id, nom_client, code_client FROM clients WHERE id=?', [req.params.id]);
    if (!client) return res.status(404).json({ error: 'Client introuvable' });

    const [bcs] = await pool.query(
      `SELECT bc.*, SUM(bcd.quantite*bcd.prix_unitaire_ht) AS montant_total
       FROM bons_commande bc
       LEFT JOIN bons_commande_details bcd ON bc.id=bcd.id_bc
       WHERE bc.id_client=? GROUP BY bc.id ORDER BY bc.date_commande DESC`, [req.params.id]);

    const [factures] = await pool.query(
      `SELECT v.*, bl.numero_bl FROM ventes v
       LEFT JOIN bons_livraison bl ON bl.id_vente=v.id
       WHERE v.id_client=? ORDER BY v.date_vente DESC`, [req.params.id]);

    res.json({ client, bons_commande: bcs, factures });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/archives — liste tous les clients avec leur activité
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.code_client, c.nom_client, c.telephone,
             COUNT(DISTINCT v.id)  AS nb_factures,
             COUNT(DISTINCT bc.id) AS nb_bcs,
             COALESCE(SUM(v.total_ttc),0) AS ca_total,
             MAX(v.date_vente) AS derniere_facture
      FROM clients c
      LEFT JOIN ventes v ON v.id_client=c.id
      LEFT JOIN bons_commande bc ON bc.id_client=c.id
      WHERE c.actif=1
      GROUP BY c.id ORDER BY ca_total DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/archives/sauvegarder-facture — sauvegarde HTML sur le serveur
router.post('/sauvegarder-facture', async (req, res) => {
  const { id_vente, html_content } = req.body;
  if (!id_vente || !html_content)
    return res.status(400).json({ error: 'id_vente et html_content requis' });
  try {
    const [[v]] = await pool.query(
      `SELECT v.numero_facture, c.nom_client, c.code_client, v.date_vente
       FROM ventes v JOIN clients c ON v.id_client=c.id WHERE v.id=?`, [id_vente]);
    if (!v) return res.status(404).json({ error: 'Vente introuvable' });

    const ARCHIVES_DIR = req.app.locals.ARCHIVES_DIR;
    const clientDir = path.join(ARCHIVES_DIR, safeName(v.code_client + '_' + v.nom_client));
    const facturesDir = path.join(clientDir, 'Factures');
    fs.mkdirSync(facturesDir, { recursive: true });

    const dateStr = new Date(v.date_vente).toISOString().slice(0,10);
    const fileName = `${v.numero_facture}_${dateStr}.html`;
    const filePath = path.join(facturesDir, fileName);
    fs.writeFileSync(filePath, html_content, 'utf8');

    res.json({ message: 'Facture archivée', path: filePath, fichier: fileName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/archives/sauvegarder-bc
router.post('/sauvegarder-bc', async (req, res) => {
  const { id_bc, html_content } = req.body;
  if (!id_bc || !html_content)
    return res.status(400).json({ error: 'id_bc et html_content requis' });
  try {
    const [[bc]] = await pool.query(
      `SELECT bc.numero_bc, c.nom_client, c.code_client, bc.date_commande
       FROM bons_commande bc JOIN clients c ON bc.id_client=c.id WHERE bc.id=?`, [id_bc]);
    if (!bc) return res.status(404).json({ error: 'BC introuvable' });

    const ARCHIVES_DIR = req.app.locals.ARCHIVES_DIR;
    const clientDir  = path.join(ARCHIVES_DIR, safeName(bc.code_client + '_' + bc.nom_client));
    const bcDir      = path.join(clientDir, 'BonsDeCommande');
    fs.mkdirSync(bcDir, { recursive: true });

    const dateStr  = new Date(bc.date_commande).toISOString().slice(0,10);
    const fileName = `${bc.numero_bc}_${dateStr}.html`;
    fs.writeFileSync(path.join(bcDir, fileName), html_content, 'utf8');

    res.json({ message: 'BC archivé', fichier: fileName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
