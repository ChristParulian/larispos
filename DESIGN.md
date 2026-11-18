# DESIGN.md: LarisPOS

Arah visual LarisPOS. File ini memberi desain jiwanya; antislop
(`.agents/skills/`) hanya menyaring slop di atas arah ini. Untuk
pekerjaan UI, baca file ini dulu, lalu terapkan antislop sebagai filter.

> Reading this as: a POS app for Indonesian warung owners, in a warm
> paper-and-pine "warung modern" language, dial ENERGY 1 / RHYTHM 1 /
> MOTION 1.

## Dial (Part 3 antislop)

- **ENERGY 1, tenang.** Ini alat kerja harian, bukan halaman promosi.
  Desain menyapa pelan supaya kasir fokus berjualan.
- **RHYTHM 1, seragam.** Tata letak konsisten di semua halaman agar
  kasir bekerja cepat tanpa belajar ulang.
- **MOTION 1, hover saja.** Hanya status hover/active dan transisi
  kecil. Tidak ada animasi masuk, parallax, atau gerakan hiasan.

## Identitas: "warung modern"

Hangat, tenang, dan bisa dipercaya, seperti warung kelontong yang
rapi. Bukan tampilan startup teknologi, bukan pula template generik.

## Palet (maksimal 2 warna inti + 1 aksen, R-29)

| Token | Hex | Alasan (R-31) |
| --- | --- | --- |
| `kertas` | `#FAF6F0` | Latar kertas hangat, terasa seperti nota dan rak kayu warung, bukan abu abu dingin bawaan template. |
| `pinus-700` | `#1B4332` | Hijau pinus gelap sebagai warna utama: tegas, dewasa, dan jelas bukan hijau emerald bawaan AI. |
| `pinus-900` | `#112C21` | Header gelap: memberi jangkar visual dan memisahkan navigasi dari konten. |
| `aksen-600` | `#B45309` | Amber hangat dipakai hemat: sorotan, penanda aktif, dan angka bon. Satu aksen, di momen penting saja. |
| `tinta` | `#1C1917` | Teks utama: hitam hangat, lebih lembut dari hitam murni. |
| `garis` | `#E7DDCD` | Garis pemisah hangat, senada kertas. |

Netral (putih kartu, stone untuk teks sekunder) tidak dihitung
sebagai warna inti. Merah hanya untuk bahaya dan error, sesuai
maknanya, bukan dekorasi.

Kontras sudah diperiksa dengan `contrast-check.py` (antislop-human):
teks sekunder memakai `stone-600` (7,09:1 di atas kertas), bukan
`stone-500` (4,46:1, di bawah standar AA). Jangan turunkan lagi.

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

- **Kartu datar** (`.card`): `rounded-lg`, border hangat, tanpa
  bayangan. Alasan: bayangan hanya untuk elemen yang benar-benar
  mengambang (bar total HP, bottom sheet, modal struk).
- **Tombol primer** (`.btn-primary`): hijau pinus solid, `rounded-lg`
  (bukan pil). Alasan: tegas dan konsisten dengan sudut kartu.
- **Navigasi bawah (semua ukuran layar)**: satu-satunya navigasi,
  item aktif ditandai garis amber di atas dan warna pinus, bukan
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
