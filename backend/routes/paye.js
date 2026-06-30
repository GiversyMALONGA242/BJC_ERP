const express = require('express');
const pool    = require('../db');
const { requireRole } = require('../middleware/auth');
const router  = express.Router();

// Acces PDG et COMPTABLE uniquement
router.use(requireRole('PDG','COMPTABLE'));

// GET liste personnel
router.get('/personnel', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM personnel WHERE actif=1 ORDER BY nom');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST ajouter employe
router.post('/personnel', async (req, res) => {
  const { nom, prenom, poste, salaire_base, date_embauche, telephone, cnss } = req.body;
  if (!nom || !salaire_base)
    return res.status(400).json({ error: 'nom et salaire_base requis' });
  try {
    const [r] = await pool.query(
      `INSERT INTO personnel (nom,prenom,poste,salaire_base,date_embauche,telephone,cnss)
       VALUES (?,?,?,?,?,?,?)`,
      [nom, prenom||null, poste||null, salaire_base, date_embauche||null, telephone||null, cnss||null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT modifier employe
router.put('/personnel/:id', async (req, res) => {
  const { nom, prenom, poste, salaire_base, telephone, cnss, actif } = req.body;
  try {
    await pool.query(
      'UPDATE personnel SET nom=?,prenom=?,poste=?,salaire_base=?,telephone=?,cnss=?,actif=? WHERE id=?',
      [nom, prenom||null, poste||null, salaire_base, telephone||null, cnss||null, actif??1, req.params.id]);
    res.json({ message: 'Employe mis a jour' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET bulletins de paye
router.get('/bulletins', async (req, res) => {
  try {
    const { mois, annee } = req.query;
    let sql = `SELECT bp.*, p.nom, p.prenom, p.poste, p.cnss
               FROM bulletins_paye bp
               JOIN personnel p ON bp.id_personnel=p.id WHERE 1=1`;
    const params = [];
    if (annee) { sql += ' AND bp.annee=?'; params.push(annee); }
    if (mois)  { sql += ' AND bp.mois=?';  params.push(mois); }
    sql += ' ORDER BY p.nom, bp.annee DESC, bp.mois DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST generer bulletin de paye
router.post('/bulletins', async (req, res) => {
  const { id_personnel, mois, annee, jours_travailles=26,
          heures_sup=0, primes=0, retenues=0, avance=0, notes } = req.body;
  if (!id_personnel || !mois || !annee)
    return res.status(400).json({ error: 'id_personnel, mois, annee requis' });
  try {
    const [[emp]] = await pool.query(
      'SELECT * FROM personnel WHERE id=?', [id_personnel]);
    if (!emp) return res.status(404).json({ error: 'Employe introuvable' });

    // Calculs paye
    const salaire_base = parseFloat(emp.salaire_base);
    const salaire_jour = salaire_base / 26;
    const salaire_brut = salaire_jour * jours_travailles + parseFloat(heures_sup) + parseFloat(primes);
    const cnss_salarial = salaire_brut * 0.04; // 4% CNSS part salariale
    const irpp = salaire_brut > 200000 ? (salaire_brut - 200000) * 0.15 : 0;
    const total_retenues = cnss_salarial + irpp + parseFloat(retenues);
    const net_a_payer = salaire_brut - total_retenues - parseFloat(avance);

    // Verifier si bulletin existe deja
    const [exist] = await pool.query(
      'SELECT id FROM bulletins_paye WHERE id_personnel=? AND mois=? AND annee=?',
      [id_personnel, mois, annee]);
    if (exist.length)
      return res.status(409).json({ error: 'Bulletin deja genere pour cette periode' });

    const [r] = await pool.query(
      `INSERT INTO bulletins_paye
       (id_personnel,mois,annee,salaire_base,jours_travailles,heures_sup,
        primes,salaire_brut,cnss_salarial,irpp,retenues_autres,
        avance_sur_salaire,net_a_payer,statut,id_utilisateur,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'EN_ATTENTE',?,?)`,
      [id_personnel, mois, annee, salaire_base, jours_travailles, heures_sup,
       primes, salaire_brut, cnss_salarial, irpp, retenues,
       avance, net_a_payer, req.user.id, notes||null]);

    res.status(201).json({ id: r.insertId, net_a_payer, salaire_brut });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH marquer bulletin paye
router.patch('/bulletins/:id/payer', async (req, res) => {
  try {
    await pool.query(
      "UPDATE bulletins_paye SET statut='PAYE', date_paiement=NOW() WHERE id=?",
      [req.params.id]);
    res.json({ message: 'Bulletin marque paye' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET resume masse salariale
router.get('/masse-salariale', async (req, res) => {
  try {
    const { annee } = req.query;
    const [rows] = await pool.query(`
      SELECT bp.mois, bp.annee,
             COUNT(*) AS nb_employes,
             SUM(bp.salaire_brut) AS total_brut,
             SUM(bp.net_a_payer) AS total_net,
             SUM(bp.cnss_salarial) AS total_cnss
      FROM bulletins_paye bp
      WHERE bp.annee=?
      GROUP BY bp.mois, bp.annee ORDER BY bp.mois`, [annee || new Date().getFullYear()]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
