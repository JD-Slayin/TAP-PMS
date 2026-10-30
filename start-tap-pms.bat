@echo off
REM Starts TAP-PMS so the PHONE can reach it too (php artisan serve alone only listens on this laptop).
cd /d "%~dp0"
where php >nul 2>nul || set "PATH=C:\xampp\php;%PATH%"
echo.
echo ==== Laptop IP address (use the 192.168.x.x or 172.x one) ====
ipconfig | findstr /R /C:"IPv4"
echo.
echo Laptop (admin/employee):  http://THAT-IP:8000
echo Phone  (kiosk)         :  http://THAT-IP:8000/kiosk
echo Use the SAME http://THAT-IP:8000 host on both. Do not open the system through XAMPP/localhost.
echo The IP changes when you change hotspot/Wi-Fi; then reopen both pages with the new IP.
echo.
php artisan serve --host=0.0.0.0 --port=8000
pause
