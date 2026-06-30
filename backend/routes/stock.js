const express = require('express');
const pool    = require('../db');
const { requireRole } = require('../middleware/auth');
const router  = express.Router();

// GET /api/stock
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *, (stock_actuel*prix_achat_moyen_pondere) AS valeur_stock_ht,
      CASE WHEN stock_actuel<=stock_minimum_alerte THEN 'ALERTE' ELSE 'OK' END AS statut_stock
      FROM produits WHERE actif=1 ORDER BY categorie, designation`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stock/alertes
router.get('/alertes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM produits WHERE actif=1 AND stock_actuel<=stock_minimum_alerte ORDER BY designation');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/stock/mouvements
router.get('/mouvements', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT sm.*, p.designation, p.unite_mesure, u.nom_utilisateur
      FROM stock_mouvements sm
      JOIN produits p ON sm.id_produit=p.id
      LEFT JOIN utilisateurs u ON sm.id_utilisateur=u.id
      ORDER BY sm.created_at DESC LIMIT 300`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/stock/produits — créer OU retrouver un produit par désignation
router.post('/produits', async (req, res) => {
  const { reference, designation, categorie, est_matiere_premiere,
          unite_mesure, conditionnement_achat, longueur_par_unite,
          largeur_par_unite, stock_minimum_alerte } = req.body;
  if (!designation || !categorie)
    return res.status(400).json({ error: 'designation et categorie requis' });
  try {
    // Vérifier si désignation existe déjà (insensible à la casse)
    const [exist] = await pool.query(
      'SELECT * FROM produits WHERE LOWER(designation)=LOWER(?) AND actif=1 LIMIT 1',
      [designation]);
    if (exist.length) return res.json({ id: exist[0].id, existe_deja: true, ...exist[0] });

    const [result] = await pool.query(
      `INSERT INTO produits
       (reference,designation,categorie,est_matiere_premiere,unite_mesure,
        conditionnement_achat,longueur_par_unite,largeur_par_unite,stock_minimum_alerte)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [reference||null,designation,categorie,est_matiere_premiere?1:0,
       unite_mesure||'unite',conditionnement_achat||'Unité',
       longueur_par_unite||0,largeur_par_unite||0,stock_minimum_alerte||0]);
    res.status(201).json({ id: result.insertId, existe_deja: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/stock/produits/:id — désactiver un produit (comptable + PDG + gestionnaire)
router.delete('/produits/:id',
  requireRole('PDG','GESTIONNAIRE','COMPTABLE'),
  async (req, res) => {
    try {
      await pool.query('UPDATE produits SET actif=0 WHERE id=?', [req.params.id]);
      res.json({ message: 'Produit désactivé' });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

// POST /api/stock/entree — entrée stock PUMP
router.post('/entree', async (req, res) => {
  const { id_produit, designation_libre, quantite, prix_achat, reference_doc, notes, categorie } = req.body;
  if (!quantite || prix_achat === undefined)
    return res.status(400).json({ error: 'quantite et prix_achat requis' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let prodId = id_produit;

    // Si pas d'id mais une désignation libre → créer le produit automatiquement
    if (!prodId && designation_libre) {
      const [exist] = await conn.query(
        'SELECT id FROM produits WHERE LOWER(designation)=LOWER(?) AND actif=1 LIMIT 1',
        [designation_libre]);
      if (exist.length) {
        prodId = exist[0].id;
      } else {
        const [nr] = await conn.query(
          `INSERT INTO produits (designation,categorie,unite_mesure,est_matiere_premiere)
           VALUES (?,?,?,1)`,
          [designation_libre, categorie||'Consommable', 'unite']);
        prodId = nr.insertId;
      }
    }

    const [[prod]] = await conn.query(
      'SELECT stock_actuel, prix_achat_moyen_pondere FROM produits WHERE id=? FOR UPDATE',
      [prodId]);
    if (!prod) { await conn.rollback(); return res.status(404).json({ error: 'Produit introuvable' }); }

    const sa   = parseFloat(prod.stock_actuel);
    const pa_a = parseFloat(prod.prix_achat_moyen_pondere);
    const qte  = parseFloat(quantite);
    const pa   = parseFloat(prix_achat);
    const ns   = sa + qte;
    const np   = ns > 0 ? (sa*pa_a + qte*pa) / ns : pa;

    await conn.query(
      'UPDATE produits SET stock_actuel=?,prix_achat_moyen_pondere=? WHERE id=?',
      [ns, np, prodId]);
    await conn.query(
      `INSERT INTO stock_mouvements
       (id_produit,type_mouvement,quantite,prix_unitaire,pump_avant,pump_apres,reference_doc,id_utilisateur,notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [prodId,'ENTREE',qte,pa,pa_a,np,reference_doc||null,req.user.id,notes||null]);

    await conn.commit();
    res.json({ message:'Entrée enregistrée', id_produit:prodId, nouveau_stock:ns, nouveau_pump:np });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
  finally { conn.release(); }
});

// POST /api/stock/sortie-manuelle
router.post('/sortie-manuelle',
  requireRole('PDG','GESTIONNAIRE','COMPTABLE'),
  async (req, res) => {
    const { id_produit, quantite, notes } = req.body;
    if (!id_produit || !quantite)
      return res.status(400).json({ error: 'id_produit et quantite requis' });
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[p]] = await conn.query(
        'SELECT stock_actuel FROM produits WHERE id=? FOR UPDATE', [id_produit]);
      if (!p) { await conn.rollback(); return res.status(404).json({ error: 'Produit introuvable' }); }
      const ns = Math.max(0, parseFloat(p.stock_actuel) - parseFloat(quantite));
      await conn.query('UPDATE produits SET stock_actuel=? WHERE id=?', [ns, id_produit]);
      await conn.query(
        `INSERT INTO stock_mouvements (id_produit,type_mouvement,quantite,id_utilisateur,notes)
         VALUES (?,?,?,?,?)`,
        [id_produit,'SORTIE_PERTE',quantite,req.user.id,notes||null]);
      await conn.commit();
      res.json({ message:'Sortie enregistrée', nouveau_stock: ns });
    } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); }
    finally { conn.release(); }
  });

module.exports = router;
