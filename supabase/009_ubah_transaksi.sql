-- =====================================================================
-- Warung POS, 009_ubah_transaksi.sql
-- Ubah transaksi (core, repo publik).
--
-- Sejak migrasi ini, transaksi juga bisa DIUBAH di core (sebelumnya
-- hanya di Pro, lihat 008). Ubah berarti: item lama dikembalikan
-- ke stok, item baru diproses seperti checkout baru (harga dihitung
-- ulang dari database, stok dicek, log_stok ditulis), lalu total,
-- dibayar, dan kembalian transaksi dihitung ulang. Metode bayar
-- TIDAK berubah. Semua dalam satu transaksi database.
--
-- Pembeda dengan Pro: di core, transaksi hanya bisa diubah dalam
-- 24 JAM setelah dibuat. Batasnya 24 jam bergulir (bukan "hari
-- kalender") supaya tidak bergantung pada zona waktu database dan
-- supaya transaksi malam masih bisa diperbaiki besok pagi. Versi
-- Pro (010) menimpa fungsi ini tanpa batas waktu dan dengan
-- penanganan piutang Bon.
--
-- Aturan:
--   * Transaksi yang sudah dibatalkan tidak bisa diubah.
--   * Transaksi lebih dari 24 jam tidak bisa diubah.
--   * Bon tidak bisa diubah di core (hanya di Pro).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.ubah_transaksi(
  p_transaksi_id uuid,
  p_items jsonb,
  p_dibayar bigint DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_metode text;
  v_created_at timestamptz;
  v_total bigint := 0;
  v_kembalian bigint := 0;
  v_dibayar bigint := COALESCE(p_dibayar, 0);
  v_row record;
  v_nama text;
  v_harga_jual bigint;
  v_harga_beli bigint;
  v_stok integer;
  v_stok_sesudah integer;
BEGIN
  SELECT status, metode_bayar, created_at
    INTO v_status, v_metode, v_created_at
    FROM public.transaksi
   WHERE id = p_transaksi_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan.';
  END IF;
  IF v_status = 'dibatalkan' THEN
    RAISE EXCEPTION 'Transaksi yang sudah dibatalkan tidak bisa diubah.';
  END IF;
  IF v_metode = 'bon' THEN
    RAISE EXCEPTION 'Transaksi Bon hanya bisa diubah di versi Pro.';
  END IF;
  IF v_created_at < now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Transaksi hanya bisa diubah dalam 24 jam setelah dibuat.';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Keranjang kosong.';
  END IF;

  -- 1. Kembalikan stok item lama + catat di log_stok.
  FOR v_row IN
    SELECT produk_id, qty FROM public.item_transaksi
     WHERE transaksi_id = p_transaksi_id
  LOOP
    UPDATE public.produk
       SET stok = stok + v_row.qty,
           updated_at = now()
     WHERE id = v_row.produk_id
    RETURNING stok INTO v_stok_sesudah;

    IF FOUND THEN
      INSERT INTO public.log_stok
        (produk_id, transaksi_id, perubahan, stok_sebelum, stok_sesudah, alasan)
      VALUES (v_row.produk_id, p_transaksi_id, v_row.qty,
              v_stok_sesudah - v_row.qty, v_stok_sesudah,
              'ubah transaksi');
    END IF;
  END LOOP;

  DELETE FROM public.item_transaksi WHERE transaksi_id = p_transaksi_id;

  -- 2. Gabungkan qty per produk (pola yang sama seperti
  --    buat_transaksi), simpan di tabel sementara.
  DROP TABLE IF EXISTS _ut_items;
  CREATE TEMP TABLE _ut_items (
    produk_id uuid PRIMARY KEY,
    qty integer NOT NULL,
    harga_jual bigint,
    harga_beli bigint,
    subtotal bigint
  ) ON COMMIT DROP;

  INSERT INTO _ut_items (produk_id, qty)
  SELECT produk_id, SUM(qty)
  FROM jsonb_to_recordset(p_items) AS t(produk_id uuid, qty integer)
  GROUP BY produk_id;

  IF EXISTS (SELECT 1 FROM _ut_items WHERE qty IS NULL OR qty <= 0) THEN
    RAISE EXCEPTION 'Jumlah (qty) harus lebih dari 0 untuk semua item.';
  END IF;

  -- 3. Kunci baris produk, cek stok (sudah termasuk stok yang baru
  --    dikembalikan di langkah 1), hitung total dari harga database.
  FOR v_row IN SELECT produk_id, qty FROM _ut_items LOOP
    SELECT p.nama, p.harga_jual, p.harga_beli, p.stok
      INTO v_nama, v_harga_jual, v_harga_beli, v_stok
      FROM public.produk p
     WHERE p.id = v_row.produk_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan: %', v_row.produk_id;
    END IF;

    IF v_stok < v_row.qty THEN
      RAISE EXCEPTION 'Stok "%" tidak cukup (sisa %, diminta %).',
        v_nama, v_stok, v_row.qty;
    END IF;

    UPDATE _ut_items
       SET harga_jual = v_harga_jual,
           harga_beli = v_harga_beli,
           subtotal = v_harga_jual * v_row.qty
     WHERE produk_id = v_row.produk_id;

    v_total := v_total + v_harga_jual * v_row.qty;
  END LOOP;

  -- 4. Validasi pembayaran (metode tidak berubah).
  IF v_metode = 'tunai' THEN
    IF v_dibayar < v_total THEN
      RAISE EXCEPTION 'Uang dibayar (Rp%) kurang dari total (Rp%).',
        v_dibayar, v_total;
    END IF;
    v_kembalian := v_dibayar - v_total;
  ELSE -- qris: tidak ada kembalian; dibayar dianggap pas sebesar total.
    v_dibayar := v_total;
    v_kembalian := 0;
  END IF;

  -- 5. Simpan item baru + kurangi stok + tulis log stok.
  INSERT INTO public.item_transaksi
    (transaksi_id, produk_id, qty, harga_jual, harga_beli, subtotal)
  SELECT p_transaksi_id, produk_id, qty, harga_jual, harga_beli, subtotal
    FROM _ut_items;

  FOR v_row IN SELECT produk_id, qty FROM _ut_items LOOP
    UPDATE public.produk
       SET stok = stok - v_row.qty,
           updated_at = now()
     WHERE id = v_row.produk_id
    RETURNING stok INTO v_stok_sesudah;

    INSERT INTO public.log_stok
      (produk_id, transaksi_id, perubahan, stok_sebelum, stok_sesudah, alasan)
    VALUES (v_row.produk_id, p_transaksi_id, -v_row.qty,
            v_stok_sesudah + v_row.qty, v_stok_sesudah, 'ubah transaksi');
  END LOOP;

  -- 6. Perbarui total transaksi.
  UPDATE public.transaksi
     SET total = v_total,
         dibayar = v_dibayar,
         kembalian = v_kembalian
   WHERE id = p_transaksi_id;
END;
$$;

-- Sama seperti buat_transaksi(): cabut dari anon DAN PUBLIC.
REVOKE EXECUTE ON FUNCTION
  public.ubah_transaksi(uuid, jsonb, bigint)
  FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.ubah_transaksi(uuid, jsonb, bigint)
  TO authenticated;
