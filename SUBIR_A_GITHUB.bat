@echo off
title Subir Control de Avance a GitHub y Desplegar Netlify
color 0A
echo ====================================================
echo    SUBIENDO CONTROL DE AVANCE A GITHUB (MAIN)
echo ====================================================
echo.
cd /d "%~dp0"
echo Carpeta actual: %CD%
echo Conectando con GitHub (origin main)...
echo.
git push origin main
echo.
echo ====================================================
echo    SI SE ENVIARON LOS COMMITS CON EXITO:
echo    NETLIFY DETECTA EL PUSH Y DESPLIEGA AUTOMATICAMENTE.
echo ====================================================
echo.
pause
