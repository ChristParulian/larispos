-- =====================================================================
-- Warung POS, 007_transaksi_batal.sql
-- Pembatalan transaksi (core, repo publik).
--
-- Transaksi yang sudah dibuat kini bisa DIBATALKAN (oleh owner,
-- lewat tombol di riwayat transaksi halaman Laporan). Pembatalan
-- TIDAK menghapus baris transaksi: statusnya menjadi 'dibatalkan',
-- stok semua item dikembalikan, dan pergerakan stok dicatat di
-- log_stok dengan alasan 'batal transaksi'. Transaksi yang
-- dibatalkan tetap tampil di riwayat (dengan penanda) tapi tidak
-- dihitung di laporan, dashboard, maupun laporan mendalam Pro.
--
-- Isi:
--   1. Kolom transaksi.status ('selesai' | 'dibatalkan').
--   2. Fungsi batalkan_transaksi() (SECURITY DEFINER, atomik).
--
-- Catatan Pro: versi Pro dari batalkan_transaksi() (di migrasi
-- 008, hanya di project Pro) MENGGANTIKAN fungsi ini dengan versi
-- yang juga menangani piutang Bon: bon tanpa pembayaran ikut
-- terhapus, bon yang sudah dicicil tidak bisa dibatalkan.
-- =====================================================================

ALTER TABLE public.transaksi
  ADD COLUMN status text NOT NULL DEFAULT 'selesai'
  CHECK (status IN ('selesai', 'dibatalkan'));

CREATE OR REPLACE FUNCTION public.batalkan_transaksi(
  p_transaksi_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_item record;
  v_stok_sesudah integer;
BEGIN
  SELECT status INTO v_status
    FROM public.transaksi
   WHERE id = p_transaksi_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan.';
  END IF;
  IF v_status = 'dibatalkan' THEN
    RAISE EXCEPTION 'Transaksi ini sudah dibatalkan.';
  END IF;

  -- Kembalikan stok tiap item + catat di log_stok.
  FOR v_item IN
    SELECT produk_id, qty FROM public.item_transaksi
     WHERE transaksi_id = p_transaksi_id
  LOOP
    UPDATE public.produk
       SET stok = stok + v_item.qty,
           updated_at = now()
     WHERE id = v_item.produk_id
    RETURNING stok INTO v_stok_sesudah;

    IF FOUND THEN
      INSERT INTO public.log_stok
        (produk_id, transaksi_id, perubahan, stok_sebelum, stok_sesudah, alasan)
      VALUES (v_item.produk_id, p_transaksi_id, v_item.qty,
              v_stok_sesudah - v_item.qty, v_stok_sesudah,
              'batal transaksi');
    END IF;
  END LOOP;

  UPDATE public.transaksi
     SET status = 'dibatalkan'
   WHERE id = p_transaksi_id;
END;
$$;

-- Sama seperti buat_transaksi(): cabut dari anon DAN PUBLIC
-- (Postgres memberi EXECUTE ke PUBLIC secara default).
REVOKE EXECUTE ON FUNCTION
  public.batalkan_transaksi(uuid)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.batalkan_transaksi(uuid)
  TO authenticated;
