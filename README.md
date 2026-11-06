<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Sistem Antrian BPS</h3>

  <p align="center">
    Aplikasi antrian online untuk Badan Pusat Statistik.
    <br />
    <a href="docs/API.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/ipds3520-app/antrian/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/ipds3520-app/antrian/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

Sistem Antrian BPS adalah aplikasi antrian online dengan dua peran terpisah:

- **Pengguna** dapat mendaftar dengan email + password, masuk, mengambil antrian, melihat riwayat pribadi, dan mengubah profil (nama & nomor WhatsApp).
- **Admin** dapat masuk untuk melihat seluruh appointment, mengubah status, mengirim ulang kuitansi WhatsApp, menghapus appointment, serta melihat laporan per periode dan mengekspornya ke Excel/CSV.

Halaman utama menampilkan antrian hari ini secara publik tanpa perlu login. Pengguna dan admin yang sudah masuk akan melihat tombol menuju dashboard masing-masing.

Berikut alasan aplikasi ini dibuat:

- Mempermudah masyarakat mengambil nomor antrian layanan BPS tanpa datang lebih awal.
- Memberi petugas satu tempat untuk memantau dan menyelesaikan antrian.
- Menyediakan laporan berkala yang siap diekspor untuk kebutuhan administrasi.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Next.js][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Supabase][Supabase]][Supabase-url]
* [![Tailwind CSS][Tailwind.css]][Tailwind-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

Ikuti langkah berikut untuk menjalankan project di lingkungan lokal.

### Prerequisites

Pastikan perangkat sudah memiliki:

* Node.js 20 atau lebih baru
  ```sh
  node --version
  ```
* npm
  ```sh
  npm install npm@latest -g
  ```
* Project [Supabase](https://supabase.com) beserta URL dan publishable key-nya.
* (Opsional) Token [Fonnte](https://fonnte.com) atau URL webhook WhatsApp untuk pengiriman kuitansi.

### Installation

1. Clone repository
   ```sh
   git clone https://github.com/ipds3520-app/antrian.git
   ```
2. Masuk ke folder project dan install dependency
   ```sh
   cd antrian
   npm install
   ```
3. Salin file environment
   ```sh
   cp .env.example .env.local
   ```
4. Isi `.env.local`

   | Variable | Wajib | Keterangan |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Ya | URL project Supabase. |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ya | Publishable/anon key Supabase untuk akses database. |
   | `NEXT_PUBLIC_APP_URL` | Ya | Base URL aplikasi, misalnya `http://localhost:3000`. |
   | `NEXT_PUBLIC_APP_TIMEZONE` | Tidak | Default `Asia/Jakarta`. |
   | `SESSION_TTL_MINUTES` | Tidak | Masa berlaku sesi, default `60` menit. |
   | `WHATSAPP_PROVIDER` | Tidak | `fonnte`, `generic`, atau `log` (default). |
   | `FONNTE_TOKEN` | Jika `fonnte` | Token API Fonnte. |
   | `WHATSAPP_API_URL` | Jika `generic` | Endpoint webhook WhatsApp. |
   | `WHATSAPP_API_KEY` | Tidak | Bearer token untuk webhook generik. |

5. Siapkan tabel di Supabase schema `public`

   | Tabel | Kolom yang dipakai |
   | --- | --- |
   | `users` | `id`, `created_at`, `email`, `name`, `role`, `password`, `phone` |
   | `appointments` | `id`, `created_at`, `name`, `email`, `booked_date`, `time`, `service`, `phone`, `queue_number`, `status`, `completed_at` |

   `users.id` dan `appointments.id` menggunakan bigint/int8 yang dibuat otomatis oleh database. Jika nama kolom di project Supabase berbeda (misalnya `queue_no`), sesuaikan tipe di `lib/types.ts`.

6. Siapkan akun admin. Admin harus ada di tabel `users` dengan `role = 'admin'` dan password berupa hash bcrypt:
   ```sh
   npm run hash-password -- "password-rahasia"
   ```
   ```sql
   update users
   set role = 'admin',
       password = '$2b$12$...hasil-hash...'
   where email = 'admin@example.com';
   ```
   Akun admin masuk melalui `/auth/admin`. Password plaintext lama masih bisa dipakai sebagai fallback, tetapi bcrypt sangat disarankan.

7. Jalankan development server
   ```sh
   npm run dev
   ```
8. Buka [http://localhost:3000](http://localhost:3000)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

### Halaman dan peran

| Path | Akses | Fungsi |
| --- | --- | --- |
| `/` | Publik | Menampilkan antrian hari ini dan tombol masuk/dashboard sesuai peran. |
| `/auth/signup` | Publik | Pendaftaran pengguna (nama, email, WhatsApp, password). |
| `/auth/login` | Publik | Login pengguna dengan email + password. |
| `/user` | Pengguna | Antrian hari ini, ambil antrian, riwayat pribadi, dan edit profil. |
| `/auth/admin` | Publik | Login admin. |
| `/admin/dashboard` | Admin | Melihat seluruh appointment, mengubah status, kirim ulang kuitansi, dan menghapus. |
| `/admin/reports` | Admin | Laporan per hari/bulan/tahun/kustom dengan ekspor Excel dan CSV. |

### Alur autentikasi

**Pengguna**

1. Daftar di `/auth/signup` → `POST /api/auth/signup` dengan `{ name, email, phone, password }`. Tidak ada email konfirmasi.
2. Masuk secara eksplisit di `/auth/login` → `POST /api/auth/login` dengan `{ email, password }`.
3. Aplikasi membuat sesi sendiri berupa cookie `HttpOnly` dan mengarahkan ke `/user`.
4. Token sesi juga dapat dipakai lewat header `Authorization: Bearer <token>` untuk klien Android.
5. Sesi berakhir sesuai `SESSION_TTL_MINUTES`; pengguna harus login ulang.
6. Profil dapat diubah lewat `PATCH /api/user/profile` (nama & WhatsApp). Email tidak dapat diubah.
7. Logout kapan saja lewat `DELETE /api/auth/session`.

**Admin**

1. `POST /api/admin/auth/login` dengan `{ "email": "...", "password": "..." }`.
2. Sesi disimpan di cookie yang sama dengan role `admin`.
3. Admin diarahkan ke `/admin/dashboard`.

### Aturan appointment

- Pengguna hanya bisa memesan satu appointment **aktif** per tanggal.
- Appointment dianggap aktif sampai tanggal dan waktunya lewat.
- Setelah appointment hari itu lewat, pengguna boleh memesan lagi untuk tanggal yang sama.
- Tanggal/waktu yang sudah lewat tidak bisa dipesan lewat API pengguna.
- Nomor antrian dihitung otomatis per tanggal + layanan dari nomor terakhir.
- Layanan yang tersedia: `rekomendasi_statistik`, `konsultasi_statistik`, `perpustakaan`.
- Status appointment dikendalikan admin: `proses` atau `selesai`.

### Kuitansi WhatsApp

Setelah booking berhasil, kuitansi dikirim otomatis ke kolom `phone`. Provider yang didukung:

- **Fonnte** — set `WHATSAPP_PROVIDER=fonnte` dan `FONNTE_TOKEN`.
- **Generic webhook** — set `WHATSAPP_PROVIDER=generic` dan `WHATSAPP_API_URL`. Request berupa JSON `{ "target": "628...", "message": "..." }`.
- **log** — default, pesan hanya dicetak ke log server.

Admin dapat mengirim ulang kuitansi lewat `POST /api/admin/appointments/:id/receipt`.

### API

Dokumentasi lengkap ada di [`docs/API.md`](docs/API.md).

Ringkasan endpoint:

| Method | Path | Akses |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | publik |
| `POST` | `/api/auth/login` | publik |
| `GET` / `DELETE` | `/api/auth/session` | pengguna |
| `POST` | `/api/admin/auth/login` | publik |
| `GET` | `/api/services` | publik |
| `GET` / `POST` | `/api/user/appointments` | pengguna |
| `GET` / `PATCH` | `/api/user/profile` | pengguna |
| `GET` | `/api/admin/appointments` | admin |
| `GET` / `PATCH` / `DELETE` | `/api/admin/appointments/:id` | admin |
| `POST` | `/api/admin/appointments/:id/receipt` | admin |
| `GET` | `/api/admin/reports` | admin |

### Catatan database

- Project memakai tabel Supabase `users` dan `appointments` di schema `public`.
- Operasi database menggunakan `@supabase/supabase-js` dengan key publishable/anon (Row Level Security berlaku sesuai konfigurasi Supabase).
- Tipe data row dipusatkan di `lib/types.ts`.

### Struktur utama

```text
app/
  auth/login        # login pengguna (email + password)
  auth/signup       # daftar pengguna
  auth/admin        # login admin
  user              # dashboard pengguna
  admin/dashboard   # dashboard admin
  admin/reports     # laporan & ekspor appointment
  api/...           # API pengguna & admin
lib/
  supabase.ts       # Supabase client (database)
  types.ts          # tipe DTO & schema baris database
  auth.ts           # token sesi
  session.ts        # user dari cookie / bearer token
  appointments.ts   # validasi, booking, CRUD, queue number
  reports.ts        # rentang periode & ringkasan laporan
  export.ts         # ekspor CSV & Excel
  whatsapp.ts       # pengiriman kuitansi
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Autentikasi email + password untuk pengguna dan admin
- [x] Halaman publik antrian hari ini
- [x] Dashboard pengguna, riwayat pribadi, dan edit profil
- [x] Dashboard admin dengan pengaturan status dan kuitansi WhatsApp
- [x] Laporan per hari/bulan/tahun/kustom dengan ekspor Excel & CSV
- [ ] Notifikasi WhatsApp otomatis saat status appointment berubah
- [ ] Pengujian otomatis (unit & end-to-end)

Lihat [open issues](https://github.com/ipds3520-app/antrian/issues) untuk daftar fitur yang diusulkan dan masalah yang diketahui.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Jika Anda memiliki saran yang dapat membuat project ini lebih baik, silakan fork repo dan buat pull request. Anda juga dapat membuka issue dengan tag "enhancement". Jangan lupa beri bintang pada project ini! Terima kasih!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Top contributors:

<a href="https://github.com/ipds3520-app/antrian/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ipds3520-app/antrian" alt="contrib.rocks image" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/ipds3520-app/antrian.svg?style=for-the-badge
[contributors-url]: https://github.com/ipds3520-app/antrian/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/ipds3520-app/antrian.svg?style=for-the-badge
[forks-url]: https://github.com/ipds3520-app/antrian/network/members
[stars-shield]: https://img.shields.io/github/stars/ipds3520-app/antrian.svg?style=for-the-badge
[stars-url]: https://github.com/ipds3520-app/antrian/stargazers
[issues-shield]: https://img.shields.io/github/issues/ipds3520-app/antrian.svg?style=for-the-badge
[issues-url]: https://github.com/ipds3520-app/antrian/issues
[Next.js]: https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Supabase]: https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white
[Supabase-url]: https://supabase.com/
[Tailwind.css]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
