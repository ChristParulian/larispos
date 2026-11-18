# DESIGN.md: LarisPOS

Arah visual LarisPOS. File ini memberi desain jiwanya; antislop
(`.agents/skills/`) hanya menyaring slop di atas arah ini. Untuk
pekerjaan UI, baca file ini dulu, lalu terapkan antislop sebagai filter.

> Reading this as: a POS app for Indonesian warung owners, in a
> light-grey, green-grey, and yellow "warung modern" language, dial
> ENERGY 1 / RHYTHM 1 / MOTION 1.

## Dial (Part 3 antislop)

- **ENERGY 1, tenang.** Ini alat kerja harian, bukan halaman promosi.
  Desain menyapa pelan supaya kasir fokus berjualan.
- **RHYTHM 1, seragam.** Tata letak konsisten di semua halaman agar
  kasir bekerja cepat tanpa belajar ulang.
- **MOTION 1, hover saja.** Hanya status hover/active dan transisi
  kecil. Tidak ada animasi masuk, parallax, atau gerakan hiasan.

## Identitas: "warung modern"

Tenang, bersih, dan bisa dipercaya, seperti warung kelontong yang
rapi. Bukan tampilan startup teknologi, bukan pula template generik.

## Palet (maksimal 2 warna inti + 1 aksen, R-29)

Palet berasal dari ColorHunt (F5F7F8, F4CE14, 495E57, 45474B),
dipilih owner.

| Token | Hex | Alasan (R-31) |
| --- | --- | --- |
| `kertas` | `#F5F7F8` | Latar abu terang, bersih dan netral, membuat kartu putih dan konten terbaca jelas. |
| `pinus-700` | `#495E57` | Hijau abu-abu sebagai warna utama: tenang, dewasa, dan jelas bukan hijau emerald bawaan AI. |
| `pinus-900` | `#2C3834` | Header gelap: memberi jangkar visual dan memisahkan navigasi dari konten. |
| `aksen-500` | `#F4CE14` | Kuning cerah dipakai hemat: sorotan, penanda aktif, dan angka bon. Satu aksen, di momen penting saja. |
| `tinta` | `#45474B` | Teks utama: arang, lebih lembut dari hitam murni. |
| `garis` | `#CECFD0` | Garis pemisah abu terang, senada latar. |

Netral (putih kartu, stone untuk teks sekunder) tidak dihitung
sebagai warna inti. Merah hanya untuk bahaya dan error, sesuai
maknanya, bukan dekorasi.

Kontras sudah diperiksa dengan `contrast-check.py` (antislop-human):
teks sekunder memakai `stone-600` (7,10:1 di atas kertas), bukan
`stone-500` (4,46:1, di bawah standar AA). Jangan turunkan lagi. Pasangan
kunci lain juga lolos AA: putih di atas pinus-700 6,95:1, aksen-600
di atas kertas 5,18:1, aksen-800 di atas aksen-100 10,91:1.

## Tipografi

- **Plus Jakarta Sans** (Google Fonts, `display=swap`, fallback
  sistem). Alasan: dirancang di Indonesia, karakternya cocok dengan
  produk warung Indonesia, dan terbaca baik di layar HP kecil.
- Judul halaman `.judul-halaman`: besar, tebal, tracking rapat.
  Alasan: hierarki jelas sekilas pandang.
- Label `.eyebrow`: kecil, uppercase, tracking lebar, di atas angka
  atau section. Alasan: memberi konteks sebelum angka dibaca.
- Angka memakai `tabular-nums` di seluruh aplikasi. Alasan: harga
  dan total sejajar rapi di tabel, keranjang, dan laporan.

## Komponen

- **Kartu** (`.card`): `rounded-lg`, border hangat, bayangan
  lembut (`shadow-kartu`). Alasan: kartu duduk sedikit di atas
  kertas sehingga hierarki terbaca, tanpa terlihat melayang.
  Bayangan hanya untuk kartu, chrome (header, menu bawah), dan
  elemen yang benar-benar mengambang (bar total HP, bottom sheet,
  modal struk). Tombol, kolom isian, dan lencana tetap datar.
  Semua bayangan senada tinta dan hijau gelap, bukan abu abu
  dingin bawaan (lihat token `--shadow-*` di `index.css`).
- **Tombol primer** (`.btn-primary`): hijau pinus solid, `rounded-lg`
  (bukan pil). Alasan: tegas dan konsisten dengan sudut kartu.
- **Navigasi bawah (semua ukuran layar)**: satu-satunya navigasi,
  item aktif ditandai garis kuning di atas dan warna pinus, bukan
  pil berwarna. Alasan: penanda yang tenang dan tidak berteriak,
  dan kasir tidak perlu belajar dua pola navigasi.
- **Mark merek** (`BrandMark` di `icons.tsx`): toko kelontong satu
  warna, atap tenda bergelombang. Alasan: satu satunya motif
  identitas yang berulang, membuat desain ini milik LarisPOS.
- **Ikon**: SVG inline buatan sendiri, relevan dengan isinya
  (keranjang, kotak, grafik, pengguna). Bukan set ikon generik.

## Larangan

Tidak ada gradien, glassmorphism, emoji, hijau emerald, kartu
statistik pelangi, ikon dalam lingkaran berwarna, atau elemen
berbentuk pil di mana mana. Tidak ada karakter em dash di teks apa
pun (aturan antislop R-02): pakai koma, titik dua, atau tanda
hubung.

## Perilaku

- Mobile-first: pengguna warung kebanyakan memakai HP. Target sentuh
  minimal 44px. Menu bawah (footer) adalah satu-satunya navigasi
  di semua ukuran layar; tidak ada navigasi atas.
- Setiap tampilan data punya tiga kondisi: kosong, memuat, dan error
  (R-27). Tidak ada tombol atau tautan yang tidak berfungsi (R-26).
