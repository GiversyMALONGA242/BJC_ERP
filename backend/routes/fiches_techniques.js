const express = require('express');
const pool    = require('../db');
const { requireRole } = require('../middleware/auth');
const router  = express.Router();

// GET toutes les fiches
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ft.*, cs.designation AS service_nom,
             cat.nom AS service_categorie,
             p.designation AS produit_nom,
             p.unite_mesure
      FROM fiches_techniques ft
      JOIN catalogue_services cs ON ft.id_service=cs.id
      JOIN categories_services cat ON cs.id_categorie=cat.id
      JOIN produits p ON ft.id_produit_brut=p.id
      ORDER BY cs.designation, p.designation`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET fiches d'un service
router.get('/service/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ft.*, p.designation AS produit_nom, p.unite_mesure,
             p.stock_actuel, p.prix_achat_moyen_pondere
      FROM fiches_techniques ft
      JOIN produits p ON ft.id_produit_brut=p.id
      WHERE ft.id_service=?`, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST creer une fiche
router.post('/', requireRole('PDG','GESTIONNAIRE','COMPTABLE'), async (req, res) => {
  const { id_service, id_produit_brut, quantite_conso, unite_conso } = req.body;
  if (!id_service || !id_produit_brut || quantite_conso === undefined)
    return res.status(400).json({ error: 'id_service, id_produit_brut, quantite_conso requis' });
  try {
    // Verifier si la liaison existe deja
    const [exist] = await pool.query(
      'SELECT id FROM fiches_techniques WHERE id_service=? AND id_produit_brut=?',
      [id_service, id_produit_brut]);
    if (exist.length)
      return res.status(409).json({ error: 'Cette liaison existe deja' });
    const [r] = await pool.query(
      'INSERT INTO fiches_techniques (id_service,id_produit_brut,quantite_conso,unite_conso) VALUES (?,?,?,?)',
      [id_service, id_produit_brut, quantite_conso, unite_conso||null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT modifier quantite
router.put('/:id', requireRole('PDG','GESTIONNAIRE','COMPTABLE'), async (req, res) => {
  const { quantite_conso, unite_conso } = req.body;
  try {
    await pool.query(
      'UPDATE fiches_techniques SET quantite_conso=?,unite_conso=? WHERE id=?',
      [quantite_conso, unite_conso||null, req.params.id]);
    res.json({ message: 'Fiche mise a jour' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE supprimer liaison
router.delete('/:id', requireRole('PDG','GESTIONNAIRE','COMPTABLE'), async (req, res) => {
  try {
    await pool.query('DELETE FROM fiches_techniques WHERE id=?', [req.params.id]);
    res.json({ message: 'Liaison supprimee' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
