# CBT Online (Laravel 13 + React + MySQL)

Monorepo:

- `backend/` Laravel 13 (API)
- `frontend/` React + Vite (TypeScript)

## Prasyarat

- PHP 8.4+, Composer
- Node.js 22+, npm
- MySQL

## Setup MySQL

Buat database:

- Nama: `cbtonline`

Atur kredensial di `backend/.env`:

- `DB_HOST=127.0.0.1`
- `DB_PORT=3306`
- `DB_DATABASE=cbtonline`
- `DB_USERNAME=root`
- `DB_PASSWORD=`

## Menjalankan Backend

```bash
cd backend
composer install
php artisan migrate
php artisan db:seed
php artisan serve --port=8000
```

## Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default pakai API URL dari `frontend/.env`:

- `VITE_API_URL=http://localhost:8000/api`

## Akun Demo (seed)

Password untuk semua user: `password`

- Admin: username `admin`
- Guru: username `guru`
- Operator: username `operator`
- Peserta: username `peserta`
- Viewer: username `viewer`

## Ujian Demo

Seed membuat:

- `Exam` id = **1** (judul: **Ujian Demo**)
- Token akses ujian: **DEMO1234**

Flow demo sebagai peserta:

1. Login (username `peserta`, password `password`)
2. Buka `Start Exam (id=1)` dari dashboard
3. Masukkan token `DEMO1234`
4. Kerjakan, pindah soal, flag, lihat progress bar, timer, submit

## API endpoints (ringkas)

Auth:

- `POST /api/auth/login` body: `{ "username": "...", "password": "...", "device_name": "web" }`
- `GET /api/auth/me` (Bearer token)
- `POST /api/auth/logout` (Bearer token)

Bank Soal (role: admin|guru):

- `GET /api/question-banks`
- `POST /api/question-banks`
- `GET /api/question-banks/{questionBank}/questions`
- `POST /api/question-banks/{questionBank}/questions`
- `GET /api/question-banks/questions/template.xlsx`
- `GET /api/question-banks/{questionBank}/questions/export.xlsx`
- `POST /api/question-banks/{questionBank}/questions/import` (multipart form-data: `file`)

Ujian:

- `GET /api/exams` (role: admin|guru)
- `POST /api/exams` (role: admin|guru)
- `POST /api/exams/{exam}/token` (role: admin|operator)
- `POST /api/exams/{exam}/start` (role: peserta) body: `{ "access_token": "..." }`
- `PUT /api/attempts/{examAttempt}/answer` (role: peserta)
- `POST /api/attempts/{examAttempt}/events` (role: peserta)
- `POST /api/attempts/{examAttempt}/submit` (role: peserta)

Laporan (role: admin|guru|viewer):

- `GET /api/exams/{exam}/reports/results`
- `GET /api/exams/{exam}/reports/ranking`
- `GET /api/exams/{exam}/reports/export.xlsx`
- `GET /api/exams/{exam}/reports/export.pdf`

Analitik (role: admin|guru|viewer):

- `GET /api/exams/{exam}/analytics/summary`
- `GET /api/exams/{exam}/analytics/item-analysis`

Manajemen peserta (role: admin|guru):

- `GET /api/groups`
- `POST /api/groups`
- `POST /api/groups/{group}/members`
- `POST /api/exams/{exam}/participants/register`
- `GET /api/exams/{exam}/attendance`
- `POST /api/exams/{exam}/attendance/mark`

Grading essay (role: admin|guru):

- `GET /api/grading/pending-essays`
- `GET /api/grading/attempts/{examAttempt}`
- `POST /api/grading/attempts/{examAttempt}`

