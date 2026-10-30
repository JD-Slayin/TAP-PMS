# Laptop + phone setup (XAMPP)
1. Laptop: start Apache in XAMPP. Copy this folder to C:\xampp\htdocs\tap-pms-ui
2. Phone joins the laptop's Windows Mobile Hotspot (or both on the same wifi). Laptop: run `ipconfig`, note IPv4 (e.g. 192.168.137.1).
3. Windows Firewall: allow Apache HTTP Server on Private networks.
4. Diagnose: phone -> http://192.168.137.1/tap-pms-ui/check.html (shows what is wrong + NFC test)
4b. Test: phone browser -> http://192.168.137.1/tap-pms-ui/sync.php must show {"rev":0,"state":null}
5. Laptop: http://192.168.137.1/tap-pms-ui/index.html  | Phone: http://192.168.137.1/tap-pms-ui/kiosk.html
   Both pages show a Synced / Server unreachable badge. Always open via the SAME http://IP/... address, never the file directly.
6. NFC on phone (Chrome Android): chrome://flags -> "Insecure origins treated as secure" -> add http://192.168.137.1 -> Enable -> Relaunch.
7. Enrol cards: Admin > Workforce > edit RFID, type the UID (colons ok). To reset all data: replace live_data.json with {"rev":0,"state":null} and clear site data in each browser.
8. Photo proof (camera): on the phone, kiosk.html asks for camera permission when you press "Enable NFC Reader". The same Chrome flag in step 6 also allows the camera on http://IP. Photos are saved by upload.php into the proofs/ folder (make sure it is writable). Each IN and OUT tap saves one picture. In kiosk.html set REQUIRE_PHOTO = false if you want punches to work even without a camera.
