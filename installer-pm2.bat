@echo off
chcp 65001 >nul
title BJC ERP - Installation demarrage automatique

cd /d "%~dp0"

echo.
echo ================================================
echo   BJC ERP - Installation demarrage automatique
echo   L ERP demarrera seul a chaque allumage du PC
echo ================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js non installe !
    echo Allez sur https://nodejs.org et installez la version LTS
    pause
    exit /b 1
)

echo [1/5] Node.js detecte - OK
node -v

echo.
echo [2/5] Installation de PM2...
call npm install -g pm2 >nul 2>&1
call npm install -g pm2-windows-startup >nul 2>&1
echo PM2 installe - OK

echo.
echo [3/5] Installation des dependances...
cd backend
call npm install >nul 2>&1
cd ..
cd frontend
call npm install >nul 2>&1
cd ..
echo Dependances installees - OK

echo.
echo [4/5] Compilation du frontend...
cd frontend
call npm run build
cd ..
echo Compilation terminee - OK

echo.
echo [5/5] Configuration du demarrage automatique...
call pm2 delete bjc-erp >nul 2>&1
call pm2 start backend\server.js --name bjc-erp
call pm2 save
call pm2-startup install
echo Configuration terminee - OK

echo.
echo ================================================
echo   Installation reussie !
echo.
echo   L ERP demarre maintenant automatiquement
echo   a chaque allumage de l ordinateur.
echo.
echo   Acces depuis ce PC  : http://localhost:3001
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do echo   Acces reseau WiFi  : http://%%b:3001
)
echo.
echo   Commandes utiles dans CMD :
echo     pm2 status          - voir si ERP tourne
echo     pm2 restart bjc-erp - redemarrer
echo     pm2 stop bjc-erp    - arreter
echo     pm2 logs bjc-erp    - voir les erreurs
echo ================================================
echo.
pause
