const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db');
const { verifyToken } = require('../middleware/auth');
const router  = express.Router();

let rateLimit;
try { rateLimit = require('express-rate-limit'); } catch(e){ rateLimit = null; }

const loginLimiter = rateLimit ? rateLimit({
  windowMs: 15*60*1000,
  max: 5,
  message: { error: 'Trop de tentatives, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false
}) : (req,res,next)=>next();

router.get('/users-list', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT nom_utilisateur, role FROM utilisateurs WHERE actif=1 ORDER BY nom_utilisateur');
    res.json(rows.map(r => ({ nom_utilisateur: r.nom_utilisateur })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur interne' }); }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { nom_utilisateur, mot_de_passe } = req.body;
  if (!nom_utilisateur || !mot_de_passe) return res.status(400).json({ error: 'Identifiants requis' });
  if(nom_utilisateur.length > 50 || mot_de_passe.length > 100) return res.status(400).json({ error: 'Identifiants invalides' });
  try {
    const [rows] = await pool.query('SELECT id, nom_utilisateur, mot_de_passe_hash, role, actif FROM utilisateurs WHERE nom_utilisateur=?', [nom_utilisateur]);
    if (!rows.length || !rows[0].actif) return res.status(401).json({ error: 'Identifiants incorrects' });
    const user = rows[0];
    const valid = await bcrypt.compare(mot_de_passe, user.mot_de_passe_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });
    const token = jwt.sign({ id: user.id, nom: user.nom_utilisateur, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
    await pool.query('UPDATE utilisateurs SET derniere_connexion=NOW() WHERE id=?', [user.id]);
    res.json({ token, user: { id: user.id, nom: user.nom_utilisateur, role: user.role } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Erreur interne' }); }
});

router.post('/logout', verifyToken, async (req, res) => {
  res.json({ message: 'Deconnecte' });
});
router.get('/me', verifyToken, (req, res) => res.json({ user: req.user }));
module.exports = router;
