# TAP-PMS v18 on laptop and phone (Laravel)

1. Install dependencies in the project root with `composer install`.
2. Create `.env` from `.env.example`, then run `php artisan key:generate`.
3. Run `php artisan migrate --seed`.
4. Start the server with `php artisan serve --host=0.0.0.0 --port=8000`.
5. On the laptop, open `http://127.0.0.1:8000`; on a phone connected to the same Wi-Fi, open `http://LAPTOP-LAN-IP:8000/kiosk`.
6. Allow PHP/Laravel through Windows Firewall for private networks if the phone cannot connect.

The browser UI and kiosk use the same Laravel `/api/v1/sync` endpoint. Do not open the HTML file directly with `file://`; use the Laravel server URL.
