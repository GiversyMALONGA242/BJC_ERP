require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const path    = require('path');
const fs      = require('fs');

let rateLimit;
try { rateLimit = require('express-rate-limit'); } catch(e){ console.warn('express-rate-limit manquant, rate limiting désactivé'); rateLimit = null; }

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

if(!process.env.JWT_SECRET){
  console.error('FATAL: JWT_SECRET manquant');
  process.exit(1);
}
if(process.env.JWT_SECRET.length < 16){
  console.warn('WARNING: JWT_SECRET trop court, utilise au moins 32 caracteres');
}

const ARCHIVES_DIR = process.env.ARCHIVES_DIR || path.join(require('os').homedir(), 'BJC_Archives');
if (!fs.existsSync(ARCHIVES_DIR)) fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
app.locals.ARCHIVES_DIR = ARCHIVES_DIR;

app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://bjc-print-frontend.onrender.com',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({ 
  origin: function(origin, callback){
    if(!origin) return callback(null, true);
    if(allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, true); // temporaire tolérant pour éviter autre crash CORS
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if(rateLimit){
  const globalLimiter = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false });
  app.use('/api/', globalLimiter);
}

app.use('/api/auth', authRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'OK', app: 'BJC ERP', version: '2.1.1' }));

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
  res.status(500).json({ error: 'Erreur serveur interne' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n=== BJC ERP v2.1.1 FIXED === Port:' + PORT);
});
