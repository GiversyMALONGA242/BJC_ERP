@echo off
chcp 65001 >nul
title BJC ERP - Arret

echo.
echo [INFO] Arret de l ERP BJC...
taskkill /F /IM node.exe >nul 2>&1
echo [OK] Serveurs arretes.

pm2 kill >nul 2>&1
echo [OK] PM2 arrete.

echo.
echo [OK] Tout est arrete. Vous pouvez fermer cette fenetre.
pause
