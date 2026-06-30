#!/bin/bash
# ============================================================
# IMPRIMERIE BJC — Démarrage ERP (macOS / Linux)
# Rendre exécutable : chmod +x demarrer-macos.sh
# Lancer : ./demarrer-macos.sh  ou  double-clic dans Finder
# ============================================================

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BOLD}${BLUE}  ██████╗      ██╗ ██████╗ ${NC}"
echo -e "${BOLD}${BLUE}  ██╔══██╗     ██║██╔════╝ ${NC}"
echo -e "${BOLD}${BLUE}  ██████╔╝     ██║██║       ${NC}"
echo -e "${BOLD}${BLUE}  ██╔══██╗██   ██║██║       ${NC}"
echo -e "${BOLD}${BLUE}  ██████╔╝╚█████╔╝╚██████╗ ${NC}"
echo -e "${BOLD}${BLUE}  ╚═════╝  ╚════╝  ╚═════╝ ${NC}"
echo -e "${BOLD}  Imprimerie BJC — ERP v1.0${NC}"
echo ""

# Répertoire du script
cd "$(dirname "$0")"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERREUR] Node.js n'est pas installé !${NC}"
    echo "Téléchargez-le sur https://nodejs.org"
    read -p "Appuyez sur Entrée pour quitter"
    exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}[OK]${NC} Node.js ${NODE_VER} détecté"

# Installer les dépendances si absent
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Installation des dépendances backend..."
    cd backend && npm install --silent && cd ..
fi
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Installation des dépendances frontend..."
    cd frontend && npm install --silent && cd ..
fi

# Copier .env si absent
if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}[ATTENTION]${NC} backend/.env créé depuis .env.example"
    echo -e "           ${BOLD}Editez-le avec vos identifiants MySQL avant de continuer !${NC}"
    if command -v nano &> /dev/null; then
        read -p "Voulez-vous l'éditer maintenant ? (o/n) " yn
        [ "$yn" = "o" ] && nano backend/.env
    fi
fi

# Récupérer l'IP locale
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "IP introuvable")
else
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

echo ""
echo -e "${GREEN}[INFO]${NC} Démarrage de l'ERP..."
echo -e "${BOLD}  → Interface web : http://localhost:5173${NC}"
echo -e "${BOLD}  → Réseau local  : http://${LOCAL_IP}:5173${NC}"
echo ""
echo -e "  Connectez vos téléphones/PCs sur le même WiFi"
echo -e "  et ouvrez : ${BLUE}http://${LOCAL_IP}:5173${NC}"
echo ""
echo -e "${YELLOW}  Ctrl+C pour arrêter${NC}"
echo ""

# Démarrer backend en arrière-plan
cd backend && npm start &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
sleep 2

# Démarrer frontend
cd frontend && npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
cd ..

# Ouvrir le navigateur automatiquement
sleep 3
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:5173" 2>/dev/null
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5173" 2>/dev/null
fi

# Attendre Ctrl+C
trap "echo ''; echo -e '${YELLOW}[INFO] Arrêt de l ERP...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait
