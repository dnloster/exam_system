@echo off
chcp 65001 >nul
title Cai dat He thong Kiem tra Trac nghiem
cd /d "%~dp0"

echo.
echo  Dang khoi dong trinh cai dat tu dong...
echo  (Neu Windows hoi quyen, chon Yes / Co)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CAI-DAT.ps1"
if errorlevel 1 (
    echo.
    echo  Cai dat that bai. Xem thong bao loi phia tren.
    pause
)
