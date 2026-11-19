-- =====================================================================
-- Warung POS, 014_batasi_kelola_produk_owner.sql
-- Core: hanya owner yang boleh tambah, ubah, dan hapus produk,
-- kategori, dan satuan. Kasir tetap bisa membaca ketiganya (untuk
-- berjualan) dan menambah stok lewat tambah_stok().
--
-- Latar: policy 001/006 memberi semua pengguna login akses tulis
-- penuh ke ketiga tabel ini; 004 hanya menjaga harga beli dan peran.
-- Sejak migrasi ini, tulis langsung ke ketiga tabel dibatasi owner.
-- Fungsi SECURITY DEFINER (buat_transaksi, tambah_stok,
-- batalkan_transaksi, ubah_transaksi) tidak terpengaruh karena
-- melewati RLS.
-- =====================================================================

-- Kategori: baca tetap untuk semua pengguna login (policy
-- "pengguna login baca kategori" dari 004 tidak diubah).
DROP POLICY IF EXISTS "pengguna login kelola kategori" ON public.kategori;
CREATE POLICY "owner kelola kategori"
  ON public.kategori FOR ALL TO authenticated
  USING (public.role_saya() = 'owner')
  WITH CHECK (public.role_saya() = 'owner');

-- Produk: sama. Trigger jaga_harga_beli dari 004 tetap berlaku
-- sebagai pengaman tambahan.
DROP POLICY IF EXISTS "pengguna login kelola produk" ON public.produk;
CREATE POLICY "owner kelola produk"
  ON public.produk FOR ALL TO authenticated
  USING (public.role_saya() = 'owner')
  WITH CHECK (public.role_saya() = 'owner');

-- Satuan: baca tetap untuk semua pengguna login (policy
-- "pengguna login baca satuan" dari 006 tidak diubah).
DROP POLICY IF EXISTS "pengguna login kelola satuan" ON public.satuan;
CREATE POLICY "owner kelola satuan"
  ON public.satuan FOR ALL TO authenticated
  USING (public.role_saya() = 'owner')
  WITH CHECK (public.role_saya() = 'owner');
