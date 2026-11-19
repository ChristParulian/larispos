# Warung POS: SQL Supabase

Migrasi SQL untuk Warung POS, sesuai spesifikasi beku
`warung-pos-spec-gratis-pro.pdf`. Backend Supabase saja, tanpa Express.
Checkout hanya lewat fungsi `buat_transaksi()` di database.

## File

| File | Isi |
|---|---|
| `001_free_core.sql` | **Core (wajib).** Tabel `profiles` (peran owner/kasir), `kategori`, `produk` (harga beli, harga jual, stok), `transaksi`, `item_transaksi`, `log_stok`. RLS aktif di semua tabel. Fungsi atomik `buat_transaksi()` + grant demo sementara untuk `anon`. |
| `002_seed_12_produk.sql` | **Seed.** 12 produk warung realistis di 4 kategori (Sembako, Minuman, Makanan Ringan, Perawatan & Rumah Tangga), masing-masing dengan harga beli, harga jual, dan stok awal. Idempotent (aman dijalankan ulang). |
| `003_pro_addon.sql` | **Pro-only.** Tabel `pelanggan`, `piutang`, `pembayaran_hutang` + trigger cicilan otomatis + view ringkasan piutang + perpanjangan `buat_transaksi()` untuk pembayaran Bon. **Jangan masukkan ke repo publik ini.** |
| `004_tahap2_auth.sql` | **Tahap 2.** Login + peran: trigger profil otomatis saat signup (akun pertama = owner, sisanya kasir), penjaga peran & harga beli, RLS baca hanya untuk pengguna login, dan pencabutan grant `anon` ke `buat_transaksi()`. Jalankan SETELAH frontend Tahap 2 (dengan halaman login) tayang. |
| `006_satuan.sql` | **Core.** Tabel master `satuan` untuk daftar satuan produk (dikelola lewat CRUD di tab Satuan halaman Produk; form produk memilih dari daftar ini). Kolom `produk.satuan` tetap teks, bukan foreign key: hapus satuan tidak merusak produk lama, ubah nama memperbarui produk yang memakainya. Seed awal diambil dari satuan yang dipakai produk. |
| `007_transaksi_batal.sql` | **Core.** Kolom `transaksi.status` (`selesai`/`dibatalkan`) + fungsi `batalkan_transaksi()`: membatalkan transaksi mengembalikan stok semua item dan mencatatnya di log stok, transaksi tetap tampil di riwayat tapi tidak dihitung di laporan. |
| `009_ubah_transaksi.sql` | **Core.** Fungsi `ubah_transaksi()`: ubah item transaksi (stok lama dikembalikan, item baru diproses seperti checkout, total dihitung ulang, metode bayar tidak berubah). Di core, transaksi hanya bisa diubah dalam 24 jam setelah dibuat; Bon tidak bisa diubah di core. |
| `011_tambah_email_profil.sql` | **Core.** Kolom `email` di tabel `profiles` + trigger signup ikut menyimpan email akun baru + backfill email akun lama dari `auth.users`. Halaman Pengguna memakai email untuk mengenali tiap akun. |
| `012_sinkron_email_profil.sql` | **Core.** Trigger yang menyalin perubahan email di `auth.users` ke `profiles.email`, supaya email yang diubah pengguna lewat tautan konfirmasi langsung tampil benar di halaman Pengguna. |

## Urutan menjalankan

Di Supabase Dashboard → SQL Editor, jalankan berurutan (copy-paste per file):

1. `001_free_core.sql`: dulu, di project utama **dan** project Pro.
2. `002_seed_12_produk.sql`: setelah 001.
3. `004_tahap2_auth.sql`: setelah frontend Tahap 2 (dengan halaman login) tayang, di project utama **dan** project Pro.
4. `003_pro_addon.sql`: **hanya di project Pro**, setelah 001 + 002 (urutan terhadap 004 bebas).
5. `006_satuan.sql`: setelah 001, di project utama **dan** project Pro. Seed awal diambil dari satuan yang dipakai produk.
6. `007_transaksi_batal.sql`: setelah 001, di project utama **dan** project Pro.
7. `009_ubah_transaksi.sql`: setelah 007, di project utama **dan** project Pro.
8. `011_tambah_email_profil.sql`: setelah 004, di project utama **dan** project Pro.
9. `012_sinkron_email_profil.sql`: setelah 011, di project utama **dan** project Pro.

Project utama dan Pro adalah project Supabase yang berbeda, dengan URL
dan anon key masing-masing: jangan tertukar.

## Yang masih perlu project Supabase nyata untuk diuji

File-file ini ditulis dari spesifikasi dan **belum pernah dijalankan**
(spec sendiri menyatakan schema & seed belum pernah diuji di Supabase
nyata: pengujian pertamanya di Tahap 1). Setelah project dibuat, uji:

1. Jalankan 001 → 002 di SQL Editor, pastikan tanpa error.
2. Panggil `buat_transaksi()` sebagai `anon` (demo tanpa login) dan
   sebagai user login; pastikan transaksi + item tersimpan, stok
   berkurang, `log_stok` terisi, dan total dihitung dari harga database
   (coba kirim harga palsu dari klien: harus diabaikan).
3. Uji penolakan: stok kurang, keranjang kosong, uang tunai kurang,
   metode `bon` di project utama (harus ditolak), produk tidak ada,
   dan pastikan tidak ada data setengah jadi yang tertinggal.
4. Uji RLS: `anon` tidak bisa INSERT langsung ke `transaksi` /
   `item_transaksi` / `log_stok`; `anon` tidak bisa membaca tabel Pro.
5. Di project Pro: jalankan 003, uji Bon (stok berkurang, kas tidak
   bertambah, piutang tercatat), uji cicilan (sisa berkurang otomatis,
   status jadi `lunas` saat sisa 0), uji tolak bayar melebihi sisa.
6. Di Tahap 2 (login kasir aktif): jalankan `004_tahap2_auth.sql`
   (mencabut grant `anon` ke `buat_transaksi()` dan akses baca anon),
   lalu uji: kasir tanpa login sudah tidak bisa checkout maupun
   membaca produk; akun pertama yang mendaftar menjadi owner, akun
   berikutnya kasir; kasir tidak bisa mengubah harga beli maupun
   mengangkat dirinya menjadi owner.

## Aturan keamanan kunci (dari spec: jangan dilanggar)

- **Anon key** boleh ada di frontend/Vercel, karena semua akses data
  dibatasi RLS.
- **`service_role` key TIDAK PERNAH ditaruh di Vercel, di frontend,
  atau di repo.** Kunci itu melewati RLS dan hanya boleh dipakai di
  lingkungan server yang aman / Edge Functions.
- File-file SQL di folder ini tidak berisi kredensial apa pun.

## Catatan desain

- `buat_transaksi()` memakai `SECURITY DEFINER` + `FOR UPDATE` pada
  baris produk: harga dihitung ulang dari database, dan dua kasir tidak
  bisa menjual stok terakhir secara bersamaan. Semua langkah dalam satu
  transaksi: gagal di satu titik, semuanya batal.
- `item_transaksi` menyimpan snapshot `harga_jual` **dan** `harga_beli`
  saat transaksi, supaya laporan laba kasar historis tidak rusak bila
  harga berubah kemudian.
- Parameter `p_allow_minus` (default `false`): kasir online menolak bila
  stok kurang; sinkronisasi antrean offline Pro memanggil dengan `true`
  agar transaksi tidak pernah gagal saat sync dan stok boleh minus +
  tanda restock (sesuai aturan offline spec).
- `transaksi.metode_bayar` sudah mengizinkan `'bon'` sejak 001, supaya
  migrasi Pro tidak perlu `ALTER TABLE` core: yang menolak Bon di
  core adalah fungsinya, bukan constraint tabel.
- Pembayaran hutang tidak bisa di-`UPDATE` (harus hapus lalu catat
  ulang); hapus pembayaran otomatis mengembalikan sisa hutang.
- View `v_piutang_pelanggan` memakai `security_invoker = true`
  (butuh Postgres 15+; Supabase saat ini memenuhinya).
