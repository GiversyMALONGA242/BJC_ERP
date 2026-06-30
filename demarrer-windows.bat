@echo off
chcp 65001 >nul
title BJC ERP v2.0

cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js non installe - https://nodejs.org
    pause
    exit /b 1
)

if not exist "backend\node_modules" (
    echo [INFO] Installation backend...
    cd backend
    npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo [INFO] Installation frontend...
    cd frontend
    npm install
    cd ..
)

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo [ATTENTION] Editez backend\.env avec votre mot de passe MySQL
    notepad "backend\.env"
    pause
)

echo.
echo [INFO] Demarrage du serveur backend...
start "BJC-Backend" cmd /k "cd /d %~dp0backend && npm start"
timeout /t 5 /nobreak >nul

echo [INFO] Demarrage du serveur frontend...
start "BJC-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 0.0.0.0"
timeout /t 8 /nobreak >nul

echo [INFO] Ouverture du navigateur...
start "" "http://localhost:5173"

echo.
echo [OK] BJC ERP demarre !
echo [OK] Acces local   : http://localhost:5173
echo.
echo Pour les autres appareils sur le reseau WiFi :
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do echo [OK] Acces reseau : http://%%b:5173
)
echo.
echo NE FERMEZ PAS les deux fenetres noires qui sont ouvertes.
echo Appuyez sur une touche pour fermer cette fenetre.
pause >nul
