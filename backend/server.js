require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const fs      = require('fs');

const authRoutes         = require('./routes/auth');
const clientsRoutes      = require('./routes/clients');
const bonsCommandeRoutes = require('./routes/bons_commande');
const catalogueRoutes    = require('./routes/catalogue');
const ventesRoutes       = require('./routes/ventes');
const stockRoutes        = require('./routes/stock');
const chargesRoutes      = require('./routes/charges');
const statsRoutes        = require('./routes/stats');
const utilisateursRoutes = require('./routes/utilisateurs');
const archiveRoutes      = require('./routes/archives');
const fichesTechniquesRoutes = require('./routes/fiches_techniques');
const payeRoutes         = require('./routes/paye');
const { verifyToken }    = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

// Dossier archives
const ARCHIVES_DIR = process.env.ARCHIVES_DIR ||
  path.join(require('os').homedir(), 'BJC_Archives');
if (!fs.existsSync(ARCHIVES_DIR)) fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
app.locals.ARCHIVES_DIR = ARCHIVES_DIR;

// Securite headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS reseau local
app.use(cors({ origin: true, credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'] }));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes publiques
app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) =>
  res.json({ status: 'OK', app: 'BJC ERP', version: '2.1.0' }));

// Routes protegees
app.use('/api/clients',          verifyToken, clientsRoutes);
app.use('/api/bons-commande',    verifyToken, bonsCommandeRoutes);
app.use('/api/catalogue',        verifyToken, catalogueRoutes);
app.use('/api/ventes',           verifyToken, ventesRoutes);
app.use('/api/stock',            verifyToken, stockRoutes);
app.use('/api/charges',          verifyToken, chargesRoutes);
app.use('/api/stats',            verifyToken, statsRoutes);
app.use('/api/utilisateurs',     verifyToken, utilisateursRoutes);
app.use('/api/archives',         verifyToken, archiveRoutes);
app.use('/api/fiches-techniques',verifyToken, fichesTechniquesRoutes);
app.use('/api/paye',             verifyToken, payeRoutes);

// Servir frontend build en production
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api'))
      res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));
app.use((err, req, res, next) => {
  console.error('[ERREUR]', err.message);
  res.status(500).json({ error: 'Erreur serveur' });
});

app.listen(PORT, '0.0.0.0', () => {
  const nets = require('os').networkInterfaces();
  let localIP = 'VOTRE_IP';
  for (const n of Object.values(nets))
    for (const net of n)
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
  console.log('\n=== IMPRIMERIE BJC ERP v2.1 ===');
  console.log('Local  : http://localhost:' + PORT);
  console.log('Reseau : http://' + localIP + ':' + PORT);
  console.log('Archives: ' + ARCHIVES_DIR + '\n');
});
