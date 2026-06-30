# 🖨️ IMPRIMERIE BJC — ERP v2.0

Application web complète de gestion pour l'Imprimerie BJC.
Accessible sur réseau local depuis PC Windows, Mac, téléphones Android/iOS.

---

## ⚡ DÉMARRAGE RAPIDE

### Option A — Développement (2 serveurs séparés)
Double-clic sur **`demarrer-windows.bat`**
→ Accès : `http://localhost:5173`

### Option B — Production (1 seul serveur, recommandé pour réseau local)
Double-clic sur **`installer-pm2.bat`**
→ Accès : `http://VOTRE_IP:3001`
→ L'ERP démarre automatiquement à chaque allumage du PC

---

## 📋 PRÉ-REQUIS

- **Node.js 18+** → https://nodejs.org (bouton LTS)
- **MySQL 5.7+ ou 8.0** → déjà installé

---

## 🗄️ INSTALLATION

### 1. Importer la base de données
```
mysql -u root -p < imprimerie_bjc_v2_schema.sql
```
Ou dans MySQL Workbench : Server → Data Import → sélectionner le fichier SQL

### 2. Configurer la connexion
```
cp backend/.env.example backend/.env
```
Éditez `backend/.env` :
```
DB_PASSWORD=VOTRE_MOT_DE_PASSE_MYSQL
```

### 3. Créer les comptes utilisateurs (1 seule fois)
```
cd backend
npm install
node scripts/migrate-passwords.js
```

### 4. Lancer
Double-clic `demarrer-windows.bat`

---

## 👥 COMPTES PAR DÉFAUT

| Utilisateur | Mot de passe | Rôle        |
|-------------|-------------|-------------|
| Admin       | 820108      | PDG         |
| Christ      | 820108      | PDG         |
| Roland      | 820108      | COMPTABLE   |
| LOUISIANA   | 820108      | CAISSIÈRE   |

**⚠️ Changez les mots de passe après la première connexion !**

---

## 📱 ACCÈS RÉSEAU LOCAL

1. Lancez l'ERP sur le PC serveur
2. Trouvez l'IP du serveur : tapez `ipconfig` dans CMD
3. Sur chaque téléphone/PC : ouvrez `http://192.168.X.X:5173`

Voir **`CONFIGURATION-MYSQL-RESEAU.txt`** pour autoriser les connexions MySQL.

---

## 🖼️ AJOUTER VOTRE LOGO ET CACHET

Placez ces fichiers dans `frontend/public/` :
- `logo.png` — votre logo (300×100 px)
- `cachet.png` — votre tampon (200×200 px)

Voir **`AJOUTER-LOGO-CACHET.txt`** pour les détails.

---

## 📁 MODULES

| Module | Description |
|--------|-------------|
| Tableau de bord | CA jour/mois, graphiques 12 mois et 30 jours, impayés |
| Bons de commande | Création BC → conversion Facture + BL, impression |
| Ventes | Historique filtrable jour/mois/année, suivi acomptes |
| Stock | Entrée libre ou par liste, PUMP automatique, alertes |
| Charges | Fixes/variables, 11 catégories, 4 modes paiement |
| Catalogue | 77 services, CRUD complet |
| Clients | RCCM, NIU, RIB, régime fiscal |
| Archives | Dossier par client, toutes factures/BC/BL accessibles |
| Utilisateurs | 4 rôles, bcrypt, journal connexions |

---

## 🔐 RÔLES ET PERMISSIONS

| Module | PDG | Gestionnaire | Comptable | Caissière |
|--------|:---:|:---:|:---:|:---:|
| Tableau de bord | ✅ | ✅ | ✅ | ✅ |
| Bons de commande | ✅ | ✅ | ❌ | ✅ |
| Ventes | ✅ | ✅ | ✅ | ✅ |
| Stock (lecture) | ✅ | ✅ | ✅ | ❌ |
| Stock (ajout/suppression) | ✅ | ✅ | ✅ | ❌ |
| Charges | ✅ | ❌ | ✅ | ❌ |
| Catalogue | ✅ | ✅ | ❌ | ❌ |
| Clients | ✅ | ✅ | ❌ | ✅ |
| Archives | ✅ | ✅ | ✅ | ✅ |
| Utilisateurs | ✅ | ❌ | ❌ | ❌ |

---

## 🛠️ DÉPANNAGE

**Erreur PowerShell rouge** → Utilisez CMD (cmd.exe) et non PowerShell

**Connexion MySQL échoue** → Vérifiez `DB_PASSWORD` dans `backend/.env`

**Téléphone ne trouve pas l'app** → Ouvrez les ports 3001 et 5173 dans le pare-feu Windows

**Application lente depuis un téléphone** → Utilisez `installer-pm2.bat` pour la version production optimisée

**Pour tout arrêter** → `taskkill /F /IM node.exe` dans CMD
