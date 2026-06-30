const express = require('express');
const pool    = require('../db');
const router  = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const now   = new Date();
    const mois  = now.getMonth() + 1;
    const annee = now.getFullYear();
    const jour  = now.toISOString().slice(0,10);

    const [[ca_jour]] = await pool.query(
      `SELECT COALESCE(SUM(total_ttc),0) AS ca, COUNT(*) AS nb
       FROM ventes WHERE DATE(date_vente)=?`, [jour]);

    const [[ca_mois]] = await pool.query(
      `SELECT COALESCE(SUM(montant_net_ht),0) AS ca_ht,
              COALESCE(SUM(total_ttc),0) AS ca_ttc, COUNT(*) AS nb_factures
       FROM ventes WHERE MONTH(date_vente)=? AND YEAR(date_vente)=?`, [mois, annee]);

    const [[charges]] = await pool.query(
      `SELECT COALESCE(SUM(montant),0) AS total,
              COALESCE(SUM(CASE WHEN type_charge='FIXE' THEN montant ELSE 0 END),0) AS fixes,
              COALESCE(SUM(CASE WHEN type_charge='VARIABLE' THEN montant ELSE 0 END),0) AS variables
       FROM charges WHERE MONTH(date_charge)=? AND YEAR(date_charge)=?`, [mois, annee]);

    const [[alertes]] = await pool.query(
      'SELECT COUNT(*) AS nb FROM produits WHERE actif=1 AND stock_actuel<=stock_minimum_alerte');

    const [[impaye]] = await pool.query(
      `SELECT COALESCE(SUM(total_ttc - COALESCE(montant_paye,0)),0) AS total
       FROM ventes WHERE statut_paiement IN ('NON_PAYE','PARTIEL')`);

    const [ca12] = await pool.query(
      `SELECT YEAR(date_vente) AS annee, MONTH(date_vente) AS mois,
              SUM(montant_net_ht) AS ca_ht, SUM(total_ttc) AS ca_ttc, COUNT(*) AS nb
       FROM ventes WHERE date_vente>=DATE_SUB(NOW(),INTERVAL 12 MONTH)
       GROUP BY YEAR(date_vente),MONTH(date_vente) ORDER BY annee,mois`);

    const [top5] = await pool.query(
      `SELECT c.nom_client, SUM(v.total_ttc) AS total, COUNT(*) AS nb
       FROM ventes v JOIN clients c ON v.id_client=c.id WHERE YEAR(v.date_vente)=?
       GROUP BY v.id_client ORDER BY total DESC LIMIT 5`, [annee]);

    const [ventes_30j] = await pool.query(
      `SELECT DATE(date_vente) AS jour, SUM(total_ttc) AS ca, COUNT(*) AS nb
       FROM ventes WHERE date_vente>=DATE_SUB(NOW(),INTERVAL 30 DAY)
       GROUP BY DATE(date_vente) ORDER BY jour`);

    res.json({
      ca_jour: { ca: ca_jour.ca, nb: ca_jour.nb },
      mois_actuel: {
        ...ca_mois,
        charges_fixes: charges.fixes,
        charges_variables: charges.variables,
        total_charges: charges.total,
        benefice_estime: ca_mois.ca_ht - charges.total
      },
      alertes_stock: alertes.nb,
      montant_impaye: impaye.total,
      ca12mois: ca12,
      top_clients: top5,
      ventes_30j
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
