// ============================================================
// SCRIPT DE MIGRATION — Hashage des mots de passe existants
// Exécuter UNE SEULE FOIS après import du dump MySQL
//
// Usage : node scripts/migrate-passwords.js
// ============================================================
require('dotenv').config({ path: '../.env' });
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// ── Mots de passe originaux du prototype (à changer après migration)
const PASSWORDS = {
  'Admin':    '820108',
  'Christ':   '820108',
  'Roland':   '820108',
  'LOUISIANA':'820108'
};

async function main() {
  const pool = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'imprimerie_bjc'
  });

  console.log('🔐 Migration des mots de passe...\n');

  for (const [nom, pwd] of Object.entries(PASSWORDS)) {
    const hash = await bcrypt.hash(pwd, 12);
    const [result] = await pool.execute(
      `UPDATE utilisateurs SET mot_de_passe_hash = ? WHERE nom_utilisateur = ?`,
      [hash, nom]
    );
    if (result.affectedRows > 0) {
      console.log(`  ✅  ${nom} — hash généré`);
    } else {
      console.log(`  ⚠️   ${nom} — utilisateur introuvable en BD`);
    }
  }

  // Insérer les utilisateurs s'ils n'existent pas encore
  console.log('\n📦 Vérification des utilisateurs...');
  for (const [nom, pwd] of Object.entries(PASSWORDS)) {
    const [rows] = await pool.execute(
      'SELECT id FROM utilisateurs WHERE nom_utilisateur = ?', [nom]
    );
    if (!rows.length) {
      const hash = await bcrypt.hash(pwd, 12);
      const role = nom === 'Roland' ? 'COMPTABLE' : nom === 'LOUISIANA' ? 'CAISSIERE' : 'PDG';
      await pool.execute(
        'INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe_hash, role) VALUES (?,?,?)',
        [nom, hash, role]
      );
      console.log(`  ➕  ${nom} créé avec rôle ${role}`);
    }
  }

  await pool.end();
  console.log('\n✅ Migration terminée ! Changez les mots de passe depuis l\'interface web.\n');
}

main().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
