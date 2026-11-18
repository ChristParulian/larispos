# LarisPOS — Warung POS Gratis

Sistem kasir (Point of Sale) gratis untuk warung kelontong — lisensi MIT,
repo publik. Frontend **React + Vite + TypeScript + Tailwind CSS**,
backend **Supabase saja** (tanpa Express), di-hosting di **Vercel**.

Versi Gratis ini adalah core yang stabil dan benar-benar bisa dipakai
jualan sehari-hari: kasir, produk & stok, dan laporan harian. Fitur Pro
(bon / piutang, PWA offline, laporan mendalam + Apriori) ditambahkan
nanti sebagai modul di atas core yang sama — bukan di repo ini.

## Fitur (Gratis)

- **Kasir** — cari produk berdasarkan nama, keranjang dengan qty +/−,
  total & kembalian jelas di layar, bayar **Tunai** atau **QRIS**.
  Checkout lewat fungsi database `buat_transaksi()` (harga & total
  dihitung ulang di database, stok berkurang otomatis, atomik).
  Setelah bayar: **struk digital** di layar, kirim teks via **WhatsApp**,
  atau simpan/cetak **PDF**.
- **Produk & Stok** — daftar produk dengan cari + filter kategori,
  tambah/ubah produk (nama, kategori, satuan, harga beli opsional,
  harga jual, stok), hapus produk yang belum pernah terjual, dan
  riwayat pergerakan stok (`log_stok`).
- **Laporan** — total penjualan harian, estimasi laba kotor (harga jual
  − harga beli), **Top 5** produk terlaris, dan riwayat transaksi yang
  bisa dibuka detailnya.
- **Login & peran** — akun **Owner** melihat harga beli, laba, dan
  mengatur pengguna; akun **Kasir** fokus berjualan tanpa akses harga
  beli dan laba. Akun pertama yang mendaftar menjadi Owner.
- **Mode demo** — tanpa Supabase pun aplikasi tetap jalan dengan 12
  produk seed lokal, jelas berlabel "Mode demo — data lokal".

Yang **tidak** ada di Gratis (Pro nanti): bon / hutang-piutang, PWA &
mode offline, printer thermal, Apriori.

## Cara menjalankan (lokal)

```bash
npm install
npm run dev
```

Buka http://localhost:5173 — tanpa `.env`, aplikasi jalan dalam **mode
demo** (12 produk seed, transaksi tersimpan di browser saja).

## Setup Supabase (database nyata)

1. Buat project di [Supabase](https://supabase.com/dashboard)
   (Free plan, 1 project = 1 database).
2. Buka **SQL Editor**, jalankan file di folder `supabase/` **berurutan**:
   - `001_free_core.sql` — tabel core + RLS + fungsi `buat_transaksi()`.
   - `002_seed_12_produk.sql` — 12 produk awal di 4 kategori.
   - `004_tahap2_auth.sql` — login + peran, cabut akses anon.
     Jalankan setelah aplikasi dengan halaman login tayang.
   
   > `003_pro_addon.sql` adalah migrasi **Pro-only** dan tidak boleh
   > masuk repo publik Gratis.
3. Salin `.env.example` menjadi `.env`, isi dari **Project Settings → API**:
   - `VITE_SUPABASE_URL` — Project URL
   - `VITE_SUPABASE_ANON_KEY` — anon / publishable key
4. Jalankan ulang `npm run dev`. Banner mode demo hilang — data kini
   dari Supabase.

Detail skema, urutan migrasi, dan checklist pengujian ada di
[`supabase/README.md`](supabase/README.md).

## Deploy ke Vercel

- Framework preset: **Vite**. Build command: `npm run build`.
  Output directory: `dist`.
- Tambahkan environment variables di Vercel:
  `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari project
  Supabase versi Gratis.
- `vercel.json` sudah berisi rewrite semua rute ke `/index.html`
  agar refresh di `/kasir` / `/laporan` tidak 404.

## Keamanan

- **Anon key** boleh ada di frontend/Vercel — semua akses data dibatasi
  Row Level Security (RLS).
- **`service_role` key TIDAK PERNAH ditaruh di Vercel, di frontend,
  atau di repo.** Kunci itu melewati RLS.
- Checkout hanya lewat `buat_transaksi()` — tidak ada penulisan langsung
  ke `transaksi` / `item_transaksi` / `log_stok` dari browser.
- Sejak Tahap 2, checkout hanya untuk pengguna login: grant `anon` ke
  `buat_transaksi()` dan akses baca anon dicabut di
  `004_tahap2_auth.sql`. Akun pertama yang mendaftar menjadi Owner;
  akun berikutnya menjadi Kasir.

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
│   ├── lib/          supabase client, api, mode demo, format, struk
│   └── pages/        KasirPage, ProdukPage, LaporanPage
├── supabase/         Migrasi SQL (001 core, 002 seed, 003 Pro-only)
├── vercel.json       SPA rewrite
└── .env.example      Template environment variables
```

## Lisensi

MIT — lihat [`LICENSE`](LICENSE).
