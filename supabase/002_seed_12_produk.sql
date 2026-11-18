-- =====================================================================
-- Warung POS — 002_seed_12_produk.sql
-- Data awal: 12 produk warung kelontong yang realistis,
-- tersebar di 4 kategori. Dijalankan SETELAH 001_free_core.sql.
--
-- Harga dalam Rupiah (kolom bigint, tanpa desimal). Harga beli
-- disarankan diisi agar laporan laba kasar bisa dihitung (spec).
-- Idempotent: aman dijalankan ulang (ON CONFLICT DO NOTHING).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Kategori
-- ---------------------------------------------------------------------
INSERT INTO public.kategori (nama) VALUES
  ('Sembako'),
  ('Minuman'),
  ('Makanan Ringan'),
  ('Perawatan & Rumah Tangga')
ON CONFLICT (nama) DO NOTHING;

-- ---------------------------------------------------------------------
-- Produk (12)
-- harga_beli / harga_jual / stok awal realistis untuk warung kelontong.
-- ---------------------------------------------------------------------
INSERT INTO public.produk (kategori_id, nama, satuan, harga_beli, harga_jual, stok)
SELECT k.id, p.nama, p.satuan, p.harga_beli, p.harga_jual, p.stok
FROM public.kategori k
JOIN (VALUES
  -- Sembako (5)
  ('Sembako', 'Beras Premium 5 kg',        'karung', 58000, 65000, 20),
  ('Sembako', 'Minyak Goreng 1 Liter',     'botol',  17500, 20000, 24),
  ('Sembako', 'Gula Pasir 1 kg',           'kg',     15500, 17500, 30),
  ('Sembako', 'Telur Ayam 1 kg',           'kg',     26000, 29000, 15),
  ('Sembako', 'Mie Instan Goreng',         'bungkus', 2600,  3500,  60),
  -- Minuman (3)
  ('Minuman', 'Kopi Sachet',               'sachet', 900,   1500,  100),
  ('Minuman', 'Air Mineral 600 ml',        'botol',  2200,  3000,  48),
  ('Minuman', 'Susu Kental Manis 370 g',   'kaleng', 11000, 13500, 24),
  -- Makanan Ringan (2)
  ('Makanan Ringan', 'Biskuit Kelapa',     'bungkus', 4500, 6000,  30),
  ('Makanan Ringan', 'Keripik Singkong',   'bungkus', 6000, 8000,  25),
  -- Perawatan & Rumah Tangga (2)
  ('Perawatan & Rumah Tangga', 'Sabun Mandi Batang', 'pcs', 3200, 4500, 36),
  ('Perawatan & Rumah Tangga', 'Deterjen Bubuk 800 g', 'bungkus', 14000, 17000, 18)
) AS p(kategori, nama, satuan, harga_beli, harga_jual, stok)
  ON k.nama = p.kategori
ON CONFLICT (nama) DO NOTHING;

-- Cek hasil (opsional, tampil di SQL Editor):
-- SELECT k.nama AS kategori, pr.nama, pr.satuan, pr.harga_beli,
--        pr.harga_jual, pr.stok
-- FROM public.produk pr JOIN public.kategori k ON k.id = pr.kategori_id
-- ORDER BY k.nama, pr.nama;
