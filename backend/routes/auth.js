const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

// GET /api/auth/users-list
router.get('/users-list', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT nom_utilisateur, role FROM utilisateurs WHERE actif=1 ORDER BY nom_utilisateur');
    res.json(rows.map(r => ({ nom_utilisateur: r.nom_utilisateur })));;
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/login — pas de limite de tentatives (réseau local interne)
router.post('/login', async (req, res) => {
  const { nom_utilisateur, mot_de_passe } = req.body;
  if (!nom_utilisateur || !mot_de_passe)
    return res.status(400).json({ error: 'Identifiants requis' });
  try {
    const [rows] = await pool.query(
      'SELECT id, nom_utilisateur, mot_de_passe_hash, role, actif FROM utilisateurs WHERE nom_utilisateur=?',
      [nom_utilisateur]);
    if (!rows.length || !rows[0].actif)
      return res.status(401).json({ error: 'Identifiants incorrects' });
    const user = rows[0];
    const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe_hash);
    if (!valid)
      return res.status(401).json({ error: 'Identifiants incorrects' });
    // JWT valable 24h
    const token = jwt.sign(
      { id: user.id, nom: user.nom_utilisateur, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    await pool.query('UPDATE utilisateurs SET derniere_connexion=NOW() WHERE id=?', [user.id]);
    await pool.query(
      'INSERT INTO audit_logs (id_utilisateur, action, ip_address) VALUES (?,?,?)',
      [user.id, 'CONNEXION', req.ip]).catch(() => {});
    res.json({ token, user: { id: user.id, nom: user.nom_utilisateur, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/logout
router.post('/logout', verifyToken, async (req, res) => {
  await pool.query(
    'INSERT INTO audit_logs (id_utilisateur, action, ip_address) VALUES (?,?,?)',
    [req.user.id, 'DECONNEXION', req.ip]).catch(() => {});
  res.json({ message: 'Deconnecte' });
});

// GET /api/auth/me
router.get('/me', verifyToken, (req, res) => res.json({ user: req.user }));

module.exports = router;
