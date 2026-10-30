# TAP-PMS — Laravel Project

This is the Laravel-structured version of the current TAP-PMS v18 UI. The existing employee/admin screens and kiosk assets are preserved under `public/tap-pms-ui/`. Laravel handles the application entry point, API routes, shared kiosk synchronization, and proof/attachment uploads.

## Requirements

- PHP 8.2 or newer
- Composer 2
- PHP extensions required by Laravel, including PDO SQLite (or configure MySQL)
- XAMPP is optional; for this Laravel version use PHP/Composer from a terminal.

## Setup on Windows

1. Extract this ZIP into a folder such as `C:\xampp\htdocs\tap-pms-laravel`.
2. Open a terminal in that folder.
3. Install dependencies:
   ```bash
   composer install
   ```
4. Create your environment file:
   ```bash
   copy .env.example .env
   ```
   (PowerShell can use `Copy-Item .env.example .env`.)
5. Generate the app key:
   ```bash
   php artisan key:generate
   ```
6. Run database migrations and demo seed:
   ```bash
   php artisan migrate --seed
   ```
7. Start Laravel so the phone can reach it too (double-click `start-tap-pms.bat`, or run):
   ```bash
   php artisan serve --host=0.0.0.0 --port=8000
   ```
   (`php artisan serve` alone only listens on the laptop, so the phone cannot connect.)
8. Find the laptop IP with `ipconfig`. Open `http://LAPTOP-IP:8000` on the laptop and `http://LAPTOP-IP:8000/kiosk` on the phone. Both devices must use the SAME `http://LAPTOP-IP:8000` address; the sync badge shows the host and a `srv` id that must match on both. Do not open the pages through XAMPP/Apache (`localhost/...`).

## Main Laravel structure

- `app/Http/Controllers/` — Laravel controllers for shared sync and uploads
- `app/Models/` — Eloquent models for employees, schedules, attendance, requests, payroll runs
- `routes/web.php` and `routes/api.php` — web and API routes
- `database/migrations/` — relational schema for employee, schedule, attendance, manual attendance request, and payroll-run foundations
- `database/seeders/DatabaseSeeder.php` — one sample employee and assigned schedule for backend testing
- `public/tap-pms-ui/` — preserved v18 front-end assets and kiosk
- `storage/app/pms/live_data.json` — shared state used by the existing kiosk/UI sync mechanism

## API endpoints currently wired to Laravel

- `GET /api/v1/health`
- `GET /api/v1/sync`
- `POST /api/v1/sync`
- `POST /api/v1/uploads/attendance-proof`
- `POST /api/v1/uploads/leave`
- `POST /api/v1/uploads/request`

The shared sync endpoint keeps the existing revision check and file-lock behavior, now handled by a Laravel controller. Proof and attachment uploads are validated by Laravel and saved to `public/tap-pms-ui/proofs/`.

## Important scope note

The current v18 employee/admin business screens still use their existing browser demo/localStorage data layer. This ZIP gives the project a real Laravel application structure and migrates the shared kiosk sync and upload endpoints, but it does **not** yet replace every localStorage business operation with authenticated database-backed Laravel API endpoints. The Eloquent models and migrations are the foundation for that next migration step. Do not treat this as production-ready payroll software until authentication, authorization, all payroll/attendance APIs, and HR/EMS integration are fully migrated and tested.

## Schedule policy represented in the schema

The schedule table supports per-employee work start/end, lunch start/end, a 30-minute early clock-in window, and lunch tap windows (default 5 minutes before / 30 minutes after the configured boundary). The currently preserved kiosk UI has its own current attendance logic; connecting every kiosk decision to the database schedule is a subsequent integration task and must be tested against real assigned schedules.
