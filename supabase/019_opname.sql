-- =====================================================================
-- Warung POS, 019_opname.sql
-- Core: fungsi sesuaikan_stok() untuk opname (koreksi stok satu
-- produk).
--
-- Tambah Stok hanya menambah, dan penjualan hanya mengurangi lewat
-- transaksi. Opname menutup celahnya: owner menghitung stok fisik
-- lalu menetapkan angka yang benar, dengan alasan yang wajib diisi
-- (mis. rusak, kedaluwarsa, hilang). Selisihnya tercatat di
-- log_stok (alasan 'opname: ...') dalam satu transaksi atomik.
--
-- Hanya owner yang boleh memakai fungsi ini: mengurangi stok
-- adalah perubahan destruktif, sama seperti membatalkan transaksi.
-- Sesi opname Pro (020) memakai log yang sama untuk tiap selisih.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sesuaikan_stok(
  p_produk_id uuid,
  p_stok_baru integer,
  p_alasan text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stok integer;
  v_perubahan integer;
BEGIN
  IF public.role_saya() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Hanya owner yang boleh menyesuaikan stok.';
  END IF;
  IF p_stok_baru IS NULL OR p_stok_baru < 0 THEN
    RAISE EXCEPTION 'Stok baru minimal 0.';
  END IF;
  IF p_alasan IS NULL OR btrim(p_alasan) = '' THEN
    RAISE EXCEPTION 'Alasan penyesuaian wajib diisi.';
  END IF;
  SELECT stok INTO v_stok
  FROM public.produk
  WHERE id = p_produk_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan.';
  END IF;
  v_perubahan := p_stok_baru - v_stok;
  UPDATE public.produk SET stok = p_stok_baru WHERE id = p_produk_id;
  INSERT INTO public.log_stok
    (produk_id, transaksi_id, perubahan, stok_sebelum, stok_sesudah, alasan)
  VALUES
    (p_produk_id, NULL, v_perubahan, v_stok, p_stok_baru,
     'opname: ' || btrim(p_alasan));
  RETURN p_stok_baru;
END;
$$;

-- Postgres memberi EXECUTE ke PUBLIC secara default; cabut dari
-- anon dan PUBLIC, beri hanya ke pengguna login.
REVOKE EXECUTE ON FUNCTION
  public.sesuaikan_stok(uuid, integer, text)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.sesuaikan_stok(uuid, integer, text)
  TO authenticated;
