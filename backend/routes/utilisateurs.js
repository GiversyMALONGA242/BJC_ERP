const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// Toutes ces routes nécessitent le rôle PDG
router.use(requireRole('PDG'));

// GET /api/utilisateurs
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nom_utilisateur, role, actif, created_at, derniere_connexion FROM utilisateurs ORDER BY id`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/utilisateurs/logs
router.get('/logs', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT al.*, u.nom_utilisateur, u.role FROM audit_logs al
       LEFT JOIN utilisateurs u ON al.id_utilisateur = u.id
       ORDER BY al.created_at DESC LIMIT 100`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/utilisateurs
router.post('/', async (req, res) => {
  const { nom_utilisateur, mot_de_passe, role } = req.body;
  if (!nom_utilisateur || !mot_de_passe || !role)
    return res.status(400).json({ error: 'nom_utilisateur, mot_de_passe, role requis' });
  if (mot_de_passe.length < 6)
    return res.status(400).json({ error: 'Mot de passe min. 6 caractères' });
  try {
    const hash = await bcrypt.hash(mot_de_passe, 12);
    const [result] = await pool.query(
      'INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe_hash, role) VALUES (?,?,?)',
      [nom_utilisateur, hash, role]);
    res.status(201).json({ id: result.insertId, nom_utilisateur, role });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Nom utilisateur déjà pris' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/utilisateurs/:id/password
router.put('/:id/password', async (req, res) => {
  const { nouveau_mot_de_passe } = req.body;
  if (!nouveau_mot_de_passe || nouveau_mot_de_passe.length < 6)
    return res.status(400).json({ error: 'Mot de passe min. 6 caractères' });
  try {
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 12);
    await pool.query('UPDATE utilisateurs SET mot_de_passe_hash=? WHERE id=?', [hash, req.params.id]);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/utilisateurs/:id/role
router.put('/:id/role', async (req, res) => {
  const { role } = req.body;
  const roles = ['PDG','GESTIONNAIRE','COMPTABLE','CAISSIERE'];
  if (!roles.includes(role)) return res.status(400).json({ error: 'Rôle invalide' });
  try {
    await pool.query('UPDATE utilisateurs SET role=? WHERE id=?', [role, req.params.id]);
    res.json({ message: 'Rôle mis à jour' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/utilisateurs/:id (désactivation)
router.delete('/:id', async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'Impossible de désactiver son propre compte' });
  try {
    await pool.query('UPDATE utilisateurs SET actif=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Utilisateur désactivé' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
