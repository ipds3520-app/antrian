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

Token sesi didapat dari response signup (tidak ada sesi), login pengguna, atau login admin. Token berlaku sesuai `SESSION_TTL_MINUTES` (default 60 menit). Setelah kedaluwarsa, pengguna harus login ulang.

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

### 1. Daftar akun pengguna

`POST /api/auth/signup`

```json
{
    "name": "Pengguna",
    "email": "pengguna@example.com",
    "phone": "081234567890",
    "password": "rahasia123"
}
```

Response `201`:

```json
{
    "data": {
        "user": {
            "id": "uuid",
            "email": "pengguna@example.com",
            "name": "Pengguna",
            "phone": "6281234567890"
        }
    }
}
```

Tidak ada email konfirmasi. Akun langsung aktif dan pengguna harus login secara eksplisit. Email yang sudah terdaftar menghasilkan `409` dengan kode `EMAIL_TAKEN`. Password minimal 8 karakter dan disimpan sebagai hash bcrypt di tabel `users`.

### 2. Login pengguna

`POST /api/auth/login`

```json
{
    "email": "pengguna@example.com",
    "password": "rahasia123"
}
```

Response `200` sama seperti login admin (token sesi + data pengguna), dan cookie `antrian_session` ikut diset.

Akun dengan `role = 'admin'` tidak dapat login lewat endpoint ini (gunakan `POST /api/admin/auth/login`). Akun lama yang belum memiliki password harus didaftarkan ulang atau diatur password-nya langsung di database.

### 3. Profil pengguna

`GET /api/user/profile` — lihat profil pengguna yang sedang login.

`PATCH /api/user/profile` — ubah `name` dan `phone`:

```json
{
    "name": "Nama Baru",
    "phone": "081234567890"
}
```

Email, role, dan password tidak dapat diubah lewat endpoint ini.

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
            "status": "proses"
        }
    ]
}
```

`status` dikendalikan oleh admin:

- `proses` — masih diproses.
- `selesai` — sudah selesai.

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
            "status": "proses"
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
                "status": "proses"
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
        "status": "proses"
    }
}
```

Admin tidak dapat menambah atau mengubah detail appointment. Admin hanya dapat mengubah status.

### Ubah status appointment

`PATCH /api/admin/appointments/:id`

```json
{
    "status": "selesai"
}
```

Nilai yang valid: `proses` atau `selesai`. Saat `selesai`, `completed_at` diisi; saat `proses`, `completed_at` dikosongkan.

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

### Laporan appointment

`GET /api/admin/reports`

Query parameter:

| Parameter | Nilai | Keterangan |
| --- | --- | --- |
| `period` | `day` \| `month` \| `year` \| `custom` | Jenis periode. Default `month`. |
| `date` | `YYYY-MM-DD` | Dipakai saat `period=day`. |
| `month` | `YYYY-MM` | Dipakai saat `period=month`. |
| `year` | `YYYY` | Dipakai saat `period=year`. |
| `from`, `to` | `YYYY-MM-DD` | Dipakai saat `period=custom`. |
| `service` | value layanan | Opsional. |
| `status` | `proses` \| `selesai` | Opsional. |

Contoh:

```text
GET /api/admin/reports?period=month&month=2026-11&service=perpustakaan
```

Response `200`:

```json
{
    "data": [
        {
            "id": "uuid",
            "bookedDate": "2026-11-03",
            "time": "09:00",
            "name": "Pengguna",
            "email": "pengguna@example.com",
            "phone": "628123456789",
            "service": "perpustakaan",
            "serviceLabel": "Perpustakaan",
            "queueNumber": 1,
            "status": "selesai",
            "createdAt": "2026-11-01T01:00:00.000Z",
            "completedAt": "2026-11-03T02:00:00.000Z"
        }
    ],
    "summary": {
        "total": 1,
        "proses": 0,
        "selesai": 1,
        "byService": [
            {
                "service": "perpustakaan",
                "label": "Perpustakaan",
                "total": 1,
                "selesai": 1
            }
        ]
    },
    "range": {
        "period": "month",
        "from": "2026-11-01",
        "to": "2026-11-30"
    }
}
```

Halaman admin `/admin/reports` memakai endpoint ini dan dapat mengekspor hasil sebagai Excel (`.xls`) atau CSV.

---

## Contoh alur Android

1. User mengisi form daftar dan aplikasi memanggil:

```http
POST /api/auth/signup
Content-Type: application/json

{ "name": "Pengguna", "email": "pengguna@example.com", "phone": "081234567890", "password": "rahasia123" }
```

2. Setelah akun dibuat, user login secara eksplisit:

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "pengguna@example.com", "password": "rahasia123" }
```

3. Simpan `data.token` dan `data.expiresAt` dari response.
4. Gunakan header berikut untuk semua request pengguna:

```http
Authorization: Bearer <data.token>
```

5. Setelah `expiresAt`, arahkan user untuk login kembali.
