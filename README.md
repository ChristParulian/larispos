# LarisPOS: Sistem Kasir Warung Kelontong

LarisPOS adalah aplikasi kasir (Point of Sale) open source untuk warung
kelontong. Dibangun dengan React, TypeScript, dan Tailwind CSS, dengan
Supabase sebagai backend dan database, serta Vercel sebagai platform
hosting.

Aplikasi ini siap dipakai untuk operasional harian: melayani transaksi
di kasir, mengelola produk dan stok, serta memantau laporan penjualan.

**Demo:** https://larispos-olive.vercel.app

Akun demo: kata sandi keduanya `password`:
- Owner: owner@larispos.com
- Kasir: kasir@larispos.com

Demo sudah diisi data contoh (40 transaksi dalam 7 hari, 12 produk,
dan beberapa produk dengan stok menipis), supaya semua halaman bisa
langsung dilihat.

## Fitur

- **Kasir**: Pencarian produk, keranjang belanja, pembayaran tunai
  atau QRIS, dan perhitungan kembalian otomatis. Setiap transaksi
  diproses secara atomik melalui fungsi database `buat_transaksi()`,
  sehingga harga, total, dan stok selalu konsisten. Struk digital
  tersedia di layar, dapat dibagikan melalui WhatsApp, atau disimpan
  sebagai PDF.
- **Produk & Stok**: Manajemen produk dan kategori, pencatatan harga
  beli dan harga jual, serta riwayat pergerakan stok.
- **Laporan**: Ringkasan penjualan harian, estimasi laba kotor,
  produk terlaris, dan riwayat transaksi lengkap.
- **Login & Peran**: Akun Owner dapat mengakses harga beli, laba,
  dan mengelola pengguna; akun Kasir fokus melayani penjualan.
  Akun pertama yang terdaftar otomatis menjadi Owner.
- **Mode Demo**: Aplikasi dapat dijalankan tanpa Supabase, dengan
  12 produk contoh yang tersimpan lokal di browser.

## Teknologi

| Lapisan  | Teknologi                                       |
| -------- | ----------------------------------------------- |
| Frontend | React, TypeScript, Vite, Tailwind CSS           |
| Backend  | Supabase (PostgreSQL, Auth, Row Level Security) |
| Hosting  | Vercel                                          |

## Memulai

```bash
npm install
npm run dev
```

Buka http://localhost:5173. Tanpa konfigurasi Supabase, aplikasi
berjalan dalam mode demo dengan data contoh lokal.

## Menghubungkan Supabase

1. Buat project di [Supabase](https://supabase.com/dashboard).
2. Buka **SQL Editor**, lalu jalankan file migrasi di folder
   `supabase/` secara berurutan:
   - `001_free_core.sql`: skema database, RLS, dan fungsi transaksi
   - `002_seed_12_produk.sql`: 12 produk contoh
   - `004_tahap2_auth.sql`: login dan peran pengguna
3. Salin `.env.example` menjadi `.env`, lalu isi dari
   **Project Settings → API**:
   - `VITE_SUPABASE_URL`: Project URL
   - `VITE_SUPABASE_ANON_KEY`: anon / publishable key
4. Jalankan ulang `npm run dev`.

Detail skema dan urutan migrasi tersedia di
[`supabase/README.md`](supabase/README.md).

## Deploy ke Vercel

- Framework preset: **Vite**: build command `npm run build`,
  output directory `dist`.
- Tambahkan environment variables `VITE_SUPABASE_URL` dan
  `VITE_SUPABASE_ANON_KEY` di pengaturan project Vercel.
- File `vercel.json` sudah mengatur rewrite agar refresh di rute
  seperti `/kasir` dan `/laporan` tetap berfungsi.

## Keamanan

- Semua akses data dibatasi oleh Row Level Security (RLS) di
  PostgreSQL, sehingga anon key aman digunakan di frontend.
- Transaksi hanya dapat dibuat melalui fungsi database
  `buat_transaksi()`: browser tidak dapat menulis langsung ke
  tabel transaksi, item transaksi, atau log stok.
- Harga dan total selalu dihitung ulang di database, bukan
  dipercaya dari input browser.
- Hanya pengguna yang sudah login yang dapat mengakses data dan
  melakukan checkout.
- Service role key tidak pernah digunakan di frontend, Vercel,
  maupun repo ini, karena key tersebut melewati RLS.

## Perintah

| Perintah          | Kegunaan                              |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Server pengembangan (Vite)            |
| `npm run build`   | Type-check + build produksi ke `dist/` |
| `npm run preview` | Pratinjau hasil build                 |

## Struktur

```
larispos/
├── src/
│   ├── components/   Layout, Struk (struk digital)
│   ├── lib/          supabase client, api, auth, mode demo, format, struk
│   └── pages/        KasirPage, ProdukPage, LaporanPage, LoginPage, PenggunaPage
├── supabase/         Migrasi SQL (001 core, 002 seed, 004 auth)
├── vercel.json       SPA rewrite
└── .env.example      Template environment variables
```

## Lisensi

MIT: lihat [`LICENSE`](LICENSE).
