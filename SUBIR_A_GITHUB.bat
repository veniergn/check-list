@echo off
title Subir Control de Avance a GitHub
color 0A
echo ====================================================
echo    SUBIENDO CONTROL DE AVANCE A GITHUB
echo ====================================================
echo.
cd /d "J:\control-de-avance (1)"
echo Conectando con https://github.com/informedeobra4-max/check-list.git ...
echo.
git push -u origin main --force
echo.
echo ====================================================
echo    SI DICE 'branch main set up to track origin/main'
echo    LOS ARCHIVOS YA SE SUBIERON CON EXITO A GITHUB.
echo ====================================================
echo.
pause
