# Sistem Antrian BPS

Aplikasi antrian online dengan dua sisi terpisah:

- **Pengguna** masuk dengan tautan email (magic link), memesan appointment, dan melihat riwayatnya.
- **Admin** masuk dengan email + password, melihat seluruh riwayat, dan melakukan CRUD appointment.

Project ini memakai **Next.js + Supabase**. Database memakai tabel yang sudah ada di schema `public` Supabase:

| Tabel | Kolom yang dipakai |
| --- | --- |
| `users` | `id`, `created_at`, `email`, `name`, `role`, `password`, `phone` |
| `appointment` | `id`, `created_at`, `name`, `email`, `booked_date`, `time`, `service`, `phone`, `queue_number` |

> Jika nama kolom di Supabase berbeda (misalnya `queue_no`), sesuaikan tipe di `lib/types.ts`.

## Menjalankan project

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`.

### Environment

Isi `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — URL project Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key Supabase (key `anon` juga bisa dipakai). Dipakai Supabase Auth untuk mengirim email magic link.
- `AUTH_SECRET` — secret untuk menandatangani token sesi. Generate:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
  ```
- `NEXT_PUBLIC_APP_URL` — base URL aplikasi.
- `NEXT_PUBLIC_APP_TIMEZONE` — default `Asia/Jakarta`.
- `SESSION_TTL_MINUTES` — default `60` (bisa diubah ke `30`).
- `FONNTE_TOKEN` atau `WHATSAPP_API_URL` — pengiriman kuitansi WhatsApp.

Masa berlaku magic link diatur di Supabase Auth, bukan di environment aplikasi.

### Menyiapkan Supabase Auth untuk magic link

1. Aktifkan provider **Email** di Supabase Dashboard → **Authentication → Sign In / Providers**.
2. Set **Site URL** ke URL aplikasi, misalnya `http://localhost:3000` saat development.
3. Buka **Authentication → Emails → Magic Link**, lalu ganti isi template agar tautan mengarah ke endpoint verifikasi aplikasi:

   ```html
   <h2>Masuk ke Antrian BPS</h2>
   <p>Klik tombol di bawah ini untuk masuk.</p>
   <p>
       <a href="{{ .SiteURL }}/api/auth/verify?token_hash={{ .TokenHash }}&type=email">
           Masuk sekarang
       </a>
   </p>
   <p>Jika Anda tidak meminta tautan ini, abaikan email ini.</p>
   ```

4. Atur **Email OTP expiration** ke `900` detik (15 menit) bila ingin masa berlaku yang sama seperti sebelumnya. Nilai default Supabase adalah 1 jam.
5. Jika pengguna baru menerima email **Confirm signup**, ubah juga template tersebut dengan tautan `{{ .SiteURL }}/api/auth/verify?token_hash={{ .TokenHash }}&type=signup`.
6. Untuk production, atur custom SMTP di Supabase karena layanan email bawaan Supabase memiliki batas pengiriman yang rendah.

Email magic link dikirim oleh Supabase Auth. Aplikasi tetap menyimpan data pengguna di tabel `public.users`; Supabase Auth hanya dipakai untuk pengiriman dan verifikasi tautan.

### Menyiapkan admin

Admin harus sudah ada di tabel `users` dengan `role = 'admin'` dan `password` berupa hash bcrypt:

```bash
npm run hash-password -- "password-rahasia"
```

```sql
update users
set role = 'admin',
    password = '$2b$12$...hasil-hash...'
where email = 'admin@example.com';
```

Password plaintext lama juga masih bisa dipakai sebagai fallback, tetapi bcrypt sangat disarankan. Magic-link pengguna akan otomatis membuat baris `users` baru dengan role `user` saat verifikasi pertama. Akun dengan role `admin` tidak dapat memakai magic link dan harus masuk lewat `/auth/admin`.

## Alur autentikasi

### Pengguna

1. `POST /api/auth/request-link` dengan `{ "email": "..." }`.
2. Supabase Auth mengirim email berisi tautan ke `GET /api/auth/verify?token_hash=...&type=email`.
3. Verifikasi dilakukan ke Supabase Auth, lalu aplikasi membuat sesi sendiri dan redirect ke `/user`.
4. Sesi berupa cookie `HttpOnly` dan juga token yang bisa dipakai lewat header `Authorization: Bearer <token>` untuk Android.
5. Sesi berakhir sesuai `SESSION_TTL_MINUTES`, lalu pengguna harus meminta tautan masuk baru.

### Admin

1. `POST /api/admin/auth/login` dengan `{ "email": "...", "password": "..." }`.
2. Sesi disimpan di cookie yang sama, dengan role `admin`.
3. Admin diarahkan ke `/admin/dashboard`.

## Aturan appointment

- Pengguna hanya bisa memesan satu appointment **aktif** per tanggal.
- Appointment dianggap aktif sampai tanggal + waktunya lewat.
- Setelah appointment hari itu lewat, pengguna boleh memesan lagi untuk tanggal yang sama.
- Tanggal/waktu yang sudah lewat tidak bisa dipesan lewat API pengguna.
- Nomor antrian dibuat otomatis per tanggal + layanan, memakai advisory lock agar tidak bentrok saat ada request bersamaan.
- Layanan yang tersedia: `rekomendasi_statistik`, `konsultasi_statistik`, `perpustakaan`.

## Kuitansi WhatsApp

Setelah booking berhasil, kuitansi dikirim otomatis ke kolom `phone`. Provider yang didukung:

- **Fonnte** — set `WHATSAPP_PROVIDER=fonnte` dan `FONNTE_TOKEN`.
- **Generic webhook** — set `WHATSAPP_PROVIDER=generic` dan `WHATSAPP_API_URL`. Request berupa JSON `{ "target": "628...", "message": "..." }`.
- **log** — default, pesan hanya dicetak ke log server.

Admin bisa mengirim ulang kuitansi lewat `POST /api/admin/appointments/:id/receipt`.

## API

Dokumentasi lengkap ada di [`docs/API.md`](docs/API.md).

Ringkasan endpoint:

| Method | Path | Akses |
| --- | --- | --- |
| `POST` | `/api/auth/request-link` | publik |
| `GET` / `POST` | `/api/auth/verify` | publik |
| `GET` / `DELETE` | `/api/auth/session` | pengguna |
| `POST` | `/api/admin/auth/login` | publik |
| `GET` | `/api/services` | publik |
| `GET` / `POST` | `/api/user/appointments` | pengguna |
| `GET` / `POST` | `/api/admin/appointments` | admin |
| `GET` / `PATCH` / `DELETE` | `/api/admin/appointments/:id` | admin |
| `POST` | `/api/admin/appointments/:id/receipt` | admin |

## Catatan database
 
- Project memakai tabel Supabase `users` dan `appointment` di schema `public`.
- Operasi database menggunakan `@supabase/supabase-js` dengan key publishable/anon (Row Level Security berlaku sesuai konfigurasi Supabase).
- Tipe data row dipusatkan di `lib/types.ts`.
 
 ## Struktur utama
 
 ```
 app/
   auth/login        # login pengguna (magic link)
   auth/admin        # login admin
   user              # dashboard pengguna
   admin/dashboard   # dashboard admin
   api/...           # API pengguna & admin
 lib/
   supabase.ts       # Supabase client (Auth & database)
   types.ts          # tipe DTO & schema baris database
   email.ts          # pengiriman magic link lewat Supabase Auth
   auth.ts           # token sesi
   session.ts        # user dari cookie / bearer token
   appointments.ts   # validasi, booking, CRUD, queue number
   whatsapp.ts       # pengiriman kuitansi
 ```
