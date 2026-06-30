const express = require('express');
const pool    = require('../db');
const { requireRole } = require('../middleware/auth');
const router  = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT cs.*, cat.nom AS nom_categorie
      FROM catalogue_services cs
      JOIN categories_services cat ON cs.id_categorie=cat.id
      WHERE cs.actif=1 ORDER BY cat.nom, cs.designation`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories_services ORDER BY nom');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Caissiere peut ajouter/modifier les services
router.post('/', requireRole('PDG','GESTIONNAIRE','CAISSIERE'), async (req, res) => {
  const { reference, designation, id_categorie, format, prix_vente_ht, unite } = req.body;
  if (!designation || !id_categorie || prix_vente_ht === undefined)
    return res.status(400).json({ error: 'designation, id_categorie, prix_vente_ht requis' });
  try {
    const [r] = await pool.query(
      'INSERT INTO catalogue_services (reference,designation,id_categorie,format,prix_vente_ht,unite) VALUES (?,?,?,?,?,?)',
      [reference||null, designation, id_categorie, format||null, prix_vente_ht, unite||null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', requireRole('PDG','GESTIONNAIRE','CAISSIERE'), async (req, res) => {
  const { designation, id_categorie, format, prix_vente_ht, unite } = req.body;
  try {
    await pool.query(
      'UPDATE catalogue_services SET designation=?,id_categorie=?,format=?,prix_vente_ht=?,unite=? WHERE id=?',
      [designation, id_categorie, format||null, prix_vente_ht, unite||null, req.params.id]);
    res.json({ message: 'Service mis a jour' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('PDG'), async (req, res) => {
  try {
    await pool.query('UPDATE catalogue_services SET actif=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Service desactive' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
