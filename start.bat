@echo off
cd /d D:\EdusWeb
echo ============================================
echo  Pornire EdusWeb
echo ============================================
echo.

echo [1/2] Pornesc serverul Node pe portul 9000...
start "EdusWeb Server" cmd /k "node server.js"

timeout /t 2 /nobreak >nul

echo [2/2] Pornesc ngrok cu contul EdusWeb...
start "EdusWeb Ngrok" cmd /k "D:\ngrok\ngrok.exe --config D:\EdusWeb\ngrok-edusweb.yml http 9000"

echo.
echo ============================================
echo  Gata!
echo   - Local:   http://localhost:9000
echo   - Public:  vezi fereastra ngrok
echo ============================================
pause