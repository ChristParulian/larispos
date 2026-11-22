-- =====================================================================
-- Warung POS, 017_pengaturan_toko.sql
-- Pengaturan toko: nama toko dan logo (core, repo publik).
--
-- Satu baris untuk satu toko (tiap deployment melayani satu
-- warung), dengan id tetap 00000000-0000-0000-0000-000000000001.
-- Nama toko tampil di header, judul tab browser, dan struk; logo
-- tampil di header menggantikan logo bawaan.
--
-- Free dan Pro sama-sama bisa mengubah nama toko. Mengubah logo
-- hanya tersedia di Pro (unggah lewat Storage, lihat
-- 018_pro_logo_storage.sql); kolom logo_url ada di kedua proyek
-- supaya skemanya sama, dan tetap null di Free.
--
-- Hanya owner yang boleh mengubah; semua pengguna login boleh
-- membaca. Baris tidak bisa ditambah atau dihapus dari aplikasi.
-- =====================================================================

CREATE TABLE public.pengaturan (
  id uuid PRIMARY KEY,
  nama_toko text NOT NULL DEFAULT 'LarisPOS'
    CHECK (char_length(nama_toko) BETWEEN 1 AND 50),
  logo_url text,
  CONSTRAINT satu_baris
    CHECK (id = '00000000-0000-0000-0000-000000000001')
);

INSERT INTO public.pengaturan (id, nama_toko, logo_url)
VALUES ('00000000-0000-0000-0000-000000000001', 'LarisPOS', NULL);

ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pengguna login baca pengaturan"
  ON public.pengaturan FOR SELECT TO authenticated USING (true);

-- Sama seperti 014: hanya owner yang boleh mengubah.
CREATE POLICY "owner ubah pengaturan"
  ON public.pengaturan FOR UPDATE TO authenticated
  USING (public.role_saya() = 'owner')
  WITH CHECK (public.role_saya() = 'owner');
