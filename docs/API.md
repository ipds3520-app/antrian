# API Antrian BPS

Base URL: `NEXT_PUBLIC_APP_URL` (contoh `http://localhost:3000`).

Semua response sukses berbentuk `{ "data": ... }`. Error berbentuk:

```json
{ "message": "Pesan error", "code": "KODE_OPSIONAL" }
```

## Autentikasi

API menerima dua cara autentikasi:

1. **Cookie** `antrian_session` (otomatis untuk browser).
2. **Bearer token** pada header:

```http
Authorization: Bearer <session-token>
```

Token sesi didapat dari response `request-link` verification atau login admin. Token berlaku sesuai `SESSION_TTL_MINUTES` (default 60 menit). Setelah kedaluwarsa, pengguna harus login ulang.

### Kode status umum

| Status | Arti |
| --- | --- |
| `400` | Input tidak valid |
| `401` | Belum login / token kedaluwarsa |
| `403` | Role tidak diizinkan |
| `404` | Data tidak ditemukan |
| `409` | Konflik jadwal |
| `500` | Kesalahan server |

## Layanan

Nilai `service` yang valid:

| Value | Label |
| --- | --- |
| `rekomendasi_statistik` | Rekomendasi Statistik |
| `konsultasi_statistik` | Konsultasi Statistik |
| `perpustakaan` | Perpustakaan |

Format `bookedDate`: `YYYY-MM-DD`. Format `time`: `HH:mm` (detik diabaikan).

---

## Auth pengguna

### 1. Minta magic link

`POST /api/auth/request-link`

```json
{
    "email": "pengguna@example.com"
}
```

Response `200`:

```json
{
    "message": "Tautan masuk telah dikirim. Buka email Anda untuk melanjutkan.",
    "emailSent": true
}
```

Email dikirim oleh **Supabase Auth** menggunakan template Magic Link. Bila pengiriman gagal, response `502` dengan kode `EMAIL_FAILED`.

Akun dengan `role = 'admin'` ditolak dengan `403` dan kode `ADMIN_USE_PASSWORD`. Admin harus login lewat `POST /api/admin/auth/login`.

### 2. Verifikasi magic link

Email berisi tautan ke:

```text
GET /api/auth/verify?token_hash=<token-hash>&type=email&redirect=/user
```

- Di browser: sesi diset lewat cookie, lalu redirect.
- Untuk aplikasi Android: tambahkan `&format=json` atau kirim header `Accept: application/json` untuk mendapatkan token.

Response JSON `200`:

```json
{
    "data": {
        "token": "<session-token>",
        "expiresAt": "2026-10-30T08:00:00.000Z",
        "user": {
            "id": "uuid",
            "email": "pengguna@example.com",
            "name": "Pengguna",
            "role": "user",
            "phone": null
        }
    }
}
```

Android juga bisa memanggil endpoint verifikasi secara eksplisit:

`POST /api/auth/verify`

```json
{
    "token_hash": "<token-hash-dari-email>",
    "type": "email"
}
```

`type` opsional; nilai yang didukung: `email`, `magiclink`, `signup`. Response sama dengan di atas dan cookie juga ikut diset.

> `redirect` hanya menerima path internal (misalnya `/user`). Token sesi aplikasi hanya dikembalikan lewat response JSON endpoint ini.

### 3. Cek sesi

`GET /api/auth/session`

Response:

```json
{
    "data": {
        "user": {
            "id": "uuid",
            "email": "pengguna@example.com",
            "name": "Pengguna",
            "role": "user",
            "phone": "628123456789"
        }
    }
}
```

### 4. Logout

`DELETE /api/auth/session`

Menghapus cookie sesi. Token bearer yang sudah diterbitkan tetap valid sampai masa berlakunya habis.

---

## Auth admin

### Login admin

`POST /api/admin/auth/login`

```json
{
    "email": "admin@example.com",
    "password": "password-rahasia"
}
```

Response `200`:

```json
{
    "data": {
        "token": "<session-token-admin>",
        "expiresAt": "2026-10-30T08:00:00.000Z",
        "user": {
            "id": "uuid",
            "email": "admin@example.com",
            "name": "Admin",
            "role": "admin",
            "phone": null
        }
    }
}
```

Cookie sesi juga diset. Endpoint admin membutuhkan `role = admin`.

---

## Layanan & slot waktu

`GET /api/services` — publik.

```json
{
    "data": {
        "services": [
            { "value": "rekomendasi_statistik", "label": "Rekomendasi Statistik" },
            { "value": "konsultasi_statistik", "label": "Konsultasi Statistik" },
            { "value": "perpustakaan", "label": "Perpustakaan" }
        ],
        "timeSlots": ["08:00", "08:30", "..."]
    }
}
```

---

## API pengguna

### Riwayat appointment

`GET /api/user/appointments`

Mengembalikan seluruh appointment yang email-nya sama dengan email sesi, terbaru lebih dulu.

```json
{
    "data": [
        {
            "id": "uuid",
            "createdAt": "2026-10-30T01:00:00.000Z",
            "name": "Pengguna",
            "email": "pengguna@example.com",
            "phone": "628123456789",
            "bookedDate": "2026-10-31",
            "time": "09:00",
            "service": "konsultasi_statistik",
            "serviceLabel": "Konsultasi Statistik",
            "queueNumber": 3,
            "status": "upcoming"
        }
    ]
}
```

`status` dihitung dari tanggal + waktu:

- `upcoming` — belum lewat.
- `expired` — sudah lewat.

### Buat appointment

`POST /api/user/appointments`

```json
{
    "name": "Pengguna",
    "email": "pengguna@example.com",
    "phone": "081234567890",
    "bookedDate": "2026-10-31",
    "time": "09:00",
    "service": "konsultasi_statistik"
}
```

Catatan:

- `email` wajib sama dengan email sesi.
- `phone` dinormalisasi ke format `62...`.
- Tanggal/waktu yang sudah lewat ditolak.
- Satu pengguna hanya boleh punya satu appointment aktif per tanggal. Jika appointment pada tanggal tersebut sudah lewat, pengguna boleh memesan lagi.
- Nomor antrian dihitung otomatis per tanggal + layanan.

Response `201`:

```json
{
    "data": {
        "appointment": {
            "id": "uuid",
            "createdAt": "2026-10-30T01:00:00.000Z",
            "name": "Pengguna",
            "email": "pengguna@example.com",
            "phone": "628123456789",
            "bookedDate": "2026-10-31",
            "time": "09:00",
            "service": "konsultasi_statistik",
            "serviceLabel": "Konsultasi Statistik",
            "queueNumber": 3,
            "status": "upcoming"
        },
        "receipt": {
            "message": "Bukti Pendaftaran Antrian BPS...",
            "sent": true
        }
    }
}
```

Jika konflik jadwal, response `409`:

```json
{
    "message": "Anda masih memiliki appointment aktif pada tanggal tersebut",
    "code": "BOOKING_CONFLICT"
}
```

---

## API admin

### Daftar / riwayat semua appointment

`GET /api/admin/appointments`

Query opsional:

| Parameter | Keterangan |
| --- | --- |
| `q` | Cari nama, email, atau telepon |
| `date` | Filter tanggal tertentu (`YYYY-MM-DD`) |
| `from` | Filter tanggal mulai |
| `to` | Filter tanggal akhir |
| `service` | Filter layanan |
| `limit` | Default `50`, maksimal `200` |
| `offset` | Default `0` |

Tanpa filter, endpoint mengembalikan seluruh riwayat dari semua tanggal.

```json
{
    "data": {
        "data": [
            {
                "id": "uuid",
                "createdAt": "2026-10-30T01:00:00.000Z",
                "name": "Pengguna",
                "email": "pengguna@example.com",
                "phone": "628123456789",
                "bookedDate": "2026-10-31",
                "time": "09:00",
                "service": "perpustakaan",
                "serviceLabel": "Perpustakaan",
                "queueNumber": 1,
                "status": "upcoming"
            }
        ],
        "pagination": {
            "total": 1,
            "limit": 50,
            "offset": 0,
            "hasMore": false
        }
    }
}
```

### Detail appointment

`GET /api/admin/appointments/:id`

```json
{
    "data": {
        "id": "uuid",
        "bookedDate": "2026-10-31",
        "time": "09:00",
        "service": "perpustakaan",
        "queueNumber": 1,
        "status": "upcoming"
    }
}
```

### Tambah appointment

`POST /api/admin/appointments`

```json
{
    "name": "Pengguna",
    "email": "pengguna@example.com",
    "phone": "081234567890",
    "bookedDate": "2026-10-31",
    "time": "09:00",
    "service": "perpustakaan",
    "queueNumber": 1,
    "sendReceipt": false
}
```

- `queueNumber` opsional; jika kosong dihitung otomatis.
- `sendReceipt` opsional; jika `true`, kuitansi WhatsApp langsung dikirim.
- Admin boleh menambah appointment untuk tanggal lampau (untuk koreksi data).

### Ubah appointment

`PATCH /api/admin/appointments/:id`

Kirim field yang ingin diubah:

```json
{
    "time": "10:00",
    "service": "konsultasi_statistik"
}
```

Jika `bookedDate` atau `service` berubah dan `queueNumber` tidak dikirim, nomor antrian dihitung ulang.

### Hapus appointment

`DELETE /api/admin/appointments/:id`

```json
{
    "data": {
        "id": "uuid",
        "name": "Pengguna",
        "bookedDate": "2026-10-31"
    }
}
```

### Kirim ulang kuitansi WhatsApp

`POST /api/admin/appointments/:id/receipt`

```json
{
    "data": {
        "message": "Bukti Pendaftaran Antrian BPS...",
        "sent": true
    }
}
```

---

## Contoh alur Android

1. User memasukkan email di aplikasi.
2. Aplikasi memanggil `POST /api/auth/request-link`.
3. User membuka email dari Supabase Auth dan menekan tautan masuk.
4. Aplikasi menangkap `token_hash` dari tautan tersebut, lalu memanggil:

```http
POST /api/auth/verify
Content-Type: application/json

{ "token_hash": "<token_hash>", "type": "email" }
```

5. Simpan `data.token` dan `data.expiresAt`.
6. Gunakan header berikut untuk semua request pengguna:

```http
Authorization: Bearer <data.token>
```

7. Setelah `expiresAt`, arahkan user untuk meminta magic link baru.
