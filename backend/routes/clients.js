const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients WHERE actif=1 ORDER BY nom_client');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Client introuvable' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/clients
router.post('/', async (req, res) => {
  const { nom_client, telephone, adresse, email, rccm, niu, rib, regime_fiscal } = req.body;
  if (!nom_client) return res.status(400).json({ error: 'nom_client requis' });
  try {
    const [last] = await pool.query('SELECT code_client FROM clients ORDER BY id DESC LIMIT 1');
    let nextNum = 1;
    if (last.length) {
      const m = last[0].code_client.match(/(\d+)$/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }
    const code_client = 'CLI-' + String(nextNum).padStart(3, '0');
    const [result] = await pool.query(
      'INSERT INTO clients (code_client,nom_client,telephone,adresse,email,rccm,niu,rib,regime_fiscal) VALUES (?,?,?,?,?,?,?,?,?)',
      [code_client, nom_client, telephone||null, adresse||null, email||null, rccm||null, niu||null, rib||null, regime_fiscal||'REEL']
    );
    res.status(201).json({ id: result.insertId, code_client, nom_client });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  const { nom_client, telephone, adresse, email, rccm, niu, rib, regime_fiscal } = req.body;
  try {
    await pool.query(
      'UPDATE clients SET nom_client=?,telephone=?,adresse=?,email=?,rccm=?,niu=?,rib=?,regime_fiscal=? WHERE id=?',
      [nom_client, telephone||null, adresse||null, email||null, rccm||null, niu||null, rib||null, regime_fiscal||'REEL', req.params.id]
    );
    res.json({ message: 'Client mis à jour' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/clients/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE clients SET actif=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Client désactivé' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
