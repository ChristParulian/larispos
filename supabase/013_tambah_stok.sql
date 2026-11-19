-- =====================================================================
-- Warung POS, 013_tambah_stok.sql
-- Core: fungsi tambah_stok() untuk restock.
--
-- Selama ini stok hanya bisa diubah lewat halaman Ubah Produk
-- (menimpa angka stok tanpa jejak) atau lewat transaksi. Fungsi
-- ini menambah stok sejumlah yang diminta dan mencatatnya di
-- log_stok (alasan 'restock' atau catatan yang diisi) dalam satu
-- transaksi atomik, supaya riwayat stok selalu lengkap. Bisa
-- dipakai owner maupun kasir; penambahan stok selalu tercatat,
-- jadi tidak ada perubahan stok tanpa jejak.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.tambah_stok(
  p_produk_id uuid,
  p_jumlah integer,
  p_alasan text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stok integer;
  v_baru integer;
BEGIN
  IF p_jumlah IS NULL OR p_jumlah < 1 THEN
    RAISE EXCEPTION 'Jumlah stok harus minimal 1.';
  END IF;
  SELECT stok INTO v_stok
  FROM public.produk
  WHERE id = p_produk_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan.';
  END IF;
  v_baru := v_stok + p_jumlah;
  UPDATE public.produk SET stok = v_baru WHERE id = p_produk_id;
  INSERT INTO public.log_stok
    (produk_id, transaksi_id, perubahan, stok_sebelum, stok_sesudah, alasan)
  VALUES
    (p_produk_id, NULL, p_jumlah, v_stok, v_baru,
     COALESCE(NULLIF(TRIM(p_alasan), ''), 'restock'));
  RETURN v_baru;
END;
$$;

-- Postgres memberi EXECUTE ke PUBLIC secara default; cabut dari
-- anon dan PUBLIC, beri hanya ke pengguna login.
REVOKE EXECUTE ON FUNCTION
  public.tambah_stok(uuid, integer, text)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.tambah_stok(uuid, integer, text)
  TO authenticated;
