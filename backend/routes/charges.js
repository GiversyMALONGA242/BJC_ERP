const express = require('express');
const pool = require('../db');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/charges
router.get('/', async (req, res) => {
  try {
    const { mois, annee } = req.query;
    let sql = `SELECT c.*, u.nom_utilisateur FROM charges c
               LEFT JOIN utilisateurs u ON c.id_utilisateur = u.id WHERE 1=1`;
    const params = [];
    if (annee) { sql += ' AND YEAR(c.date_charge)=?'; params.push(annee); }
    if (mois)  { sql += ' AND MONTH(c.date_charge)=?'; params.push(mois); }
    sql += ' ORDER BY c.date_charge DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/charges
router.post('/', async (req, res) => {
  const { date_charge, type_charge, categorie, designation, montant, mode_paiement, notes } = req.body;
  if (!date_charge || !designation || !montant)
    return res.status(400).json({ error: 'date_charge, designation, montant requis' });
  try {
    const [result] = await pool.query(
      `INSERT INTO charges (date_charge,type_charge,categorie,designation,montant,mode_paiement,id_utilisateur,notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [date_charge, type_charge||'FIXE', categorie||'AUTRE', designation, montant,
       mode_paiement||'ESPECES', req.user.id, notes||null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/charges/:id
router.delete('/:id', requireRole('PDG','COMPTABLE'), async (req, res) => {
  try {
    await pool.query('DELETE FROM charges WHERE id=?', [req.params.id]);
    res.json({ message: 'Charge supprimée' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
