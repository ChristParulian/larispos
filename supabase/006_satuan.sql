-- =====================================================================
-- Warung POS, 006_satuan.sql
-- Tabel master satuan produk (core, repo publik).
--
-- Sebelum migrasi ini, satuan hanya teks bebas di produk.satuan
-- (diketik manual di form produk). Mulai sekarang daftar satuan
-- dikelola lewat CRUD di tab Satuan halaman Produk, dan form produk
-- memilih dari daftar itu.
--
-- Kolom produk.satuan TETAP teks, bukan foreign key:
--   * Menghapus satuan dari daftar tidak merusak produk lama,
--     produk tetap menampilkan satuannya.
--   * Mengubah nama satuan memperbarui produk yang memakai nama
--     lama (dilakukan aplikasi saat menyimpan).
--
-- Seed awal diambil dari satuan yang sudah dipakai produk saat ini.
-- =====================================================================

CREATE TABLE public.satuan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.satuan (nama)
SELECT DISTINCT satuan FROM public.produk
ON CONFLICT (nama) DO NOTHING;

ALTER TABLE public.satuan ENABLE ROW LEVEL SECURITY;

-- Sama seperti kategori setelah 004: hanya pengguna login.
CREATE POLICY "pengguna login baca satuan"
  ON public.satuan FOR SELECT TO authenticated USING (true);
CREATE POLICY "pengguna login kelola satuan"
  ON public.satuan FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
