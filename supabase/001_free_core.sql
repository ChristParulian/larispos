-- =====================================================================
-- Warung POS — 001_free_core.sql
-- Skema inti (MIT, repo publik).
--
-- Sesuai spesifikasi beku (warung-pos-spec-gratis-pro.pdf):
--   * Backend Supabase saja, tanpa Express.
--   * Checkout HANYA lewat fungsi buat_transaksi(): harga dan total
--     dihitung ulang di database, tidak pernah dipercaya dari browser.
--   * Semua tabel dilindungi Row Level Security (RLS).
--   * Tabel profiles menyiapkan peran owner/kasir sejak awal, agar
--     Pro tidak perlu mengubah core kasir.
--
-- Urutan jalankan: file ini dulu (001), lalu 002_seed_12_produk.sql.
-- Migrasi Pro (003_pro_addon.sql) HANYA ditambahkan di project Pro.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: isi kolom updated_at otomatis.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- TABEL CORE
-- =====================================================================

-- Peran pengguna. Satu baris per akun Supabase Auth.
-- role 'owner' melihat semua data (termasuk harga beli & laba);
-- role 'kasir' fokus berjualan. Penyembunyian harga beli dari kasir
-- ditegakkan di UI + trigger sejak Tahap 2 (004).
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nama text,
  role text NOT NULL DEFAULT 'kasir'
    CHECK (role IN ('owner', 'kasir')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.kategori (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.produk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori_id uuid REFERENCES public.kategori (id) ON DELETE SET NULL,
  nama text NOT NULL UNIQUE,
  satuan text NOT NULL DEFAULT 'pcs',
  -- harga_beli boleh NULL (spec: "boleh kosong, tetapi disarankan
  -- diisi agar laba dapat dihitung"). harga_jual wajib ada.
  harga_beli bigint CHECK (harga_beli IS NULL OR harga_beli >= 0),
  harga_jual bigint NOT NULL CHECK (harga_jual >= 0),
  stok integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transaksi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- NULL saat demo tanpa login; terisi auth.uid() setelah login aktif.
  kasir_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  -- 'bon' sudah diizinkan di CHECK sejak awal agar migrasi Pro tidak
  -- perlu ALTER TABLE core. Fungsi buat_transaksi() di core
  -- tetap MENOLAK 'bon'; baru versi Pro yang menerimanya.
  metode_bayar text NOT NULL
    CHECK (metode_bayar IN ('tunai', 'qris', 'bon')),
  total bigint NOT NULL CHECK (total >= 0),
  dibayar bigint NOT NULL DEFAULT 0 CHECK (dibayar >= 0),
  kembalian bigint NOT NULL DEFAULT 0 CHECK (kembalian >= 0)
);

CREATE TABLE public.item_transaksi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaksi_id uuid NOT NULL
    REFERENCES public.transaksi (id) ON DELETE CASCADE,
  -- RESTRICT: produk yang pernah terjual tidak bisa dihapus begitu
  -- saja, supaya riwayat transaksi dan laporan tetap utuh.
  produk_id uuid NOT NULL
    REFERENCES public.produk (id) ON DELETE RESTRICT,
  qty integer NOT NULL CHECK (qty > 0),
  -- Harga DIKUNCI saat transaksi (snapshot), jadi perubahan harga
  -- jual/beli di kemudian hari tidak merusak laporan lama.
  harga_jual bigint NOT NULL CHECK (harga_jual >= 0),
  harga_beli bigint CHECK (harga_beli IS NULL OR harga_beli >= 0),
  subtotal bigint NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE public.log_stok (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produk_id uuid NOT NULL
    REFERENCES public.produk (id) ON DELETE CASCADE,
  transaksi_id uuid REFERENCES public.transaksi (id) ON DELETE SET NULL,
  -- Negatif untuk penjualan, positif untuk restock/koreksi.
  perubahan integer NOT NULL,
  stok_sebelum integer NOT NULL,
  stok_sesudah integer NOT NULL,
  alasan text NOT NULL DEFAULT 'penjualan',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger updated_at untuk produk.
CREATE TRIGGER trg_produk_updated_at
  BEFORE UPDATE ON public.produk
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indeks untuk pencarian kasir dan laporan.
CREATE INDEX idx_produk_kategori ON public.produk (kategori_id);
CREATE INDEX idx_produk_nama ON public.produk (nama);
CREATE INDEX idx_transaksi_created_at ON public.transaksi (created_at DESC);
CREATE INDEX idx_item_transaksi_transaksi ON public.item_transaksi (transaksi_id);
CREATE INDEX idx_item_transaksi_produk ON public.item_transaksi (produk_id);
CREATE INDEX idx_log_stok_produk ON public.log_stok (produk_id);
CREATE INDEX idx_log_stok_created_at ON public.log_stok (created_at DESC);

-- ---------------------------------------------------------------------
-- Helper: peran pengguna yang sedang login (dibaca dari profiles).
-- SECURITY DEFINER agar bisa dibaca di dalam policy RLS tanpa
-- rekursi (policy profiles sendiri memakai fungsi ini).
-- Mengembalikan NULL bila belum login (demo anon).
-- Didefinisikan SETELAH tabel profiles dibuat: fungsi LANGUAGE sql
-- divalidasi saat dibuat, jadi tabelnya harus sudah ada.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.role_saya()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- =====================================================================
-- ROW LEVEL SECURITY — aktif di SEMUA tabel core.
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_stok ENABLE ROW LEVEL SECURITY;

-- profiles: tiap pengguna mengelola profilnya sendiri; owner membaca
-- dan mengubah semua profil. Tidak ada policy DELETE: penghapusan
-- akun hanya lewat Dashboard / service_role (bukan dari frontend).
CREATE POLICY "pengguna baca profil sendiri"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "owner baca semua profil"
  ON public.profiles FOR SELECT
  USING (public.role_saya() = 'owner');
CREATE POLICY "pengguna buat profil sendiri"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY "pengguna ubah profil sendiri"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "owner ubah semua profil"
  ON public.profiles FOR UPDATE
  USING (public.role_saya() = 'owner');

-- kategori & produk: siapa pun (termasuk demo anon) boleh MEMBACA,
-- karena halaman kasir harus jalan tanpa login di Tahap 1.
-- CATATAN DEMO: SELECT anon pada produk ikut mengekspos harga_beli.
-- Akses anon ini dicabut di 004 (Tahap 2) begitu halaman login tayang.
CREATE POLICY "semua baca kategori"
  ON public.kategori FOR SELECT USING (true);
CREATE POLICY "semua baca produk"
  ON public.produk FOR SELECT USING (true);
-- Tulis kategori/produk hanya untuk pengguna login. Pemisahan
-- owner/kasir di UI + trigger ditegakkan sejak Tahap 2 (004).
CREATE POLICY "pengguna login kelola kategori"
  ON public.kategori FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "pengguna login kelola produk"
  ON public.produk FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- transaksi, item_transaksi, log_stok: TIDAK ADA policy INSERT /
-- UPDATE / DELETE. Penulisan langsung lewat API DITOLAK; satu-satunya
-- jalan masuk adalah fungsi buat_transaksi() (SECURITY DEFINER,
-- melewati RLS) — jadi stok dan total tidak bisa dimanipulasi dari
-- browser.
-- DEMO SEMENTARA (Tahap 1): anon boleh SELECT riwayat agar halaman
-- Kasir/Laporan bisa dicoba tanpa login. CABUT di Tahap 2 bersamaan
-- dengan pencabutan grant anon ke buat_transaksi() — lihat catatan
-- di bawah fungsi.
CREATE POLICY "demo baca transaksi"
  ON public.transaksi FOR SELECT USING (true);
CREATE POLICY "demo baca item transaksi"
  ON public.item_transaksi FOR SELECT USING (true);
CREATE POLICY "demo baca log stok"
  ON public.log_stok FOR SELECT USING (true);

-- =====================================================================
-- FUNGSI CHECKOUT ATOMIK — buat_transaksi()
-- =====================================================================
-- Satu-satunya cara membuat transaksi. Semua langkah berjalan dalam
-- satu transaksi database: bila satu langkah gagal (mis. stok kurang),
-- SEMUA dibatalkan — tidak ada transaksi setengah jadi.
--
-- Input dari browser HANYA: daftar {produk_id, qty}, metode bayar,
-- dan uang dibayar. Harga satuan, subtotal, dan total DIHITUNG ULANG
-- dari tabel produk — nilai apa pun yang dikirim browser diabaikan.
--
-- Parameter:
--   p_items         jsonb array: [{"produk_id": "...", "qty": 2}, ...]
--   p_metode_bayar  'tunai' | 'qris' di core ('bon' ditolak di sini,
--                   baru diterima setelah migrasi Pro 003).
--   p_dibayar       uang tunai dari pembeli (diabaikan untuk QRIS:
--                   otomatis = total, kembalian 0).
--   p_pelanggan_id  hanya dipakai Pro (Bon). Di core harus NULL.
--   p_allow_minus   false di kasir online (stok kurang = transaksi
--                   ditolak). true HANYA untuk sinkronisasi antrean
--                   offline Pro: transaksi tidak pernah gagal saat
--                   sync, stok boleh menjadi minus + tanda restock.
--
-- Mengembalikan jsonb: {transaksi_id, total, dibayar, kembalian,
-- metode_bayar, piutang_id (null di core)}.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.buat_transaksi(
  p_items jsonb,
  p_metode_bayar text,
  p_dibayar bigint DEFAULT 0,
  p_pelanggan_id uuid DEFAULT NULL,
  p_allow_minus boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaksi_id uuid;
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
  -- 1. Validasi metode bayar (core: hanya Tunai dan QRIS).
  IF p_metode_bayar NOT IN ('tunai', 'qris') THEN
    RAISE EXCEPTION 'Metode bayar "%" tidak tersedia di core (Bon hanya di modul Pro).',
      p_metode_bayar;
  END IF;
  IF p_pelanggan_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pembayaran Bon hanya tersedia di versi Pro.';
  END IF;

  -- 2. Validasi keranjang tidak kosong.
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Keranjang kosong.';
  END IF;

  -- 3. Gabungkan qty per produk (bila produk yang sama muncul dua
  --    kali di keranjang), simpan di tabel sementara.
  DROP TABLE IF EXISTS _bt_items;
  CREATE TEMP TABLE _bt_items (
    produk_id uuid PRIMARY KEY,
    qty integer NOT NULL,
    harga_jual bigint,
    harga_beli bigint,
    subtotal bigint
  ) ON COMMIT DROP;

  INSERT INTO _bt_items (produk_id, qty)
  SELECT produk_id, SUM(qty)
  FROM jsonb_to_recordset(p_items) AS t(produk_id uuid, qty integer)
  GROUP BY produk_id;

  IF EXISTS (SELECT 1 FROM _bt_items WHERE qty IS NULL OR qty <= 0) THEN
    RAISE EXCEPTION 'Jumlah (qty) harus lebih dari 0 untuk semua item.';
  END IF;

  -- 4. Kunci baris produk (FOR UPDATE) agar dua kasir tidak menjual
  --    stok terakhir secara bersamaan, lalu hitung total dari harga
  --    DI DATABASE — bukan dari browser.
  FOR v_row IN SELECT produk_id, qty FROM _bt_items LOOP
    SELECT p.nama, p.harga_jual, p.harga_beli, p.stok
      INTO v_nama, v_harga_jual, v_harga_beli, v_stok
      FROM public.produk p
     WHERE p.id = v_row.produk_id
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan: %', v_row.produk_id;
    END IF;

    IF v_stok < v_row.qty AND NOT p_allow_minus THEN
      RAISE EXCEPTION 'Stok "%" tidak cukup (sisa %, diminta %).',
        v_nama, v_stok, v_row.qty;
    END IF;

    UPDATE _bt_items
       SET harga_jual = v_harga_jual,
           harga_beli = v_harga_beli,
           subtotal = v_harga_jual * v_row.qty
     WHERE produk_id = v_row.produk_id;

    v_total := v_total + v_harga_jual * v_row.qty;
  END LOOP;

  -- 5. Validasi pembayaran.
  IF p_metode_bayar = 'tunai' THEN
    IF v_dibayar < v_total THEN
      RAISE EXCEPTION 'Uang dibayar (Rp%) kurang dari total (Rp%).',
        v_dibayar, v_total;
    END IF;
    v_kembalian := v_dibayar - v_total;
  ELSE -- qris: tidak ada kembalian; dibayar dianggap pas sebesar total.
    v_dibayar := v_total;
    v_kembalian := 0;
  END IF;

  -- 6. Simpan transaksi + item (harga sudah dikunci di langkah 4).
  INSERT INTO public.transaksi
    (kasir_id, metode_bayar, total, dibayar, kembalian)
  VALUES (auth.uid(), p_metode_bayar, v_total, v_dibayar, v_kembalian)
  RETURNING id INTO v_transaksi_id;

  INSERT INTO public.item_transaksi
    (transaksi_id, produk_id, qty, harga_jual, harga_beli, subtotal)
  SELECT v_transaksi_id, produk_id, qty, harga_jual, harga_beli, subtotal
    FROM _bt_items;

  -- 7. Kurangi stok dan tulis log stok per item.
  FOR v_row IN SELECT produk_id, qty FROM _bt_items LOOP
    UPDATE public.produk
       SET stok = stok - v_row.qty,
           updated_at = now()
     WHERE id = v_row.produk_id
    RETURNING stok INTO v_stok_sesudah;

    INSERT INTO public.log_stok
      (produk_id, transaksi_id, perubahan, stok_sebelum, stok_sesudah, alasan)
    VALUES (v_row.produk_id, v_transaksi_id, -v_row.qty,
            v_stok_sesudah + v_row.qty, v_stok_sesudah, 'penjualan');
  END LOOP;

  RETURN jsonb_build_object(
    'transaksi_id', v_transaksi_id,
    'total', v_total,
    'dibayar', v_dibayar,
    'kembalian', v_kembalian,
    'metode_bayar', p_metode_bayar,
    'piutang_id', NULL
  );
END;
$$;

-- ---------------------------------------------------------------------
-- GRANT SEMENTARA UNTUK DEMO TANPA LOGIN (Tahap 1).
-- Per spec: "Untuk demo awal, peran anon masih diizinkan memanggil
-- buat_transaksi() agar kasir dapat dicoba tanpa login. Izin ini
-- bersifat sementara dan dicabut setelah login kasir aktif pada
-- Tahap 2 roadmap."
--
-- CABUT di Tahap 2 dengan menjalankan 004_tahap2_auth.sql (mencabut
-- dari anon DAN PUBLIC — Postgres memberi EXECUTE ke PUBLIC secara
-- default, jadi mencabut dari anon saja tidak cukup) dan pada saat
-- yang sama mengganti policy SELECT "demo baca ..." di atas menjadi
-- TO authenticated.
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION
  public.buat_transaksi(jsonb, text, bigint, uuid, boolean)
  TO anon, authenticated;

-- Helper role_saya() juga perlu bisa dipanggil dari policy untuk
-- peran anon/authenticated (fungsi SECURITY DEFINER tetap butuh
-- EXECUTE grant agar bisa dieksekusi dari policy).
GRANT EXECUTE ON FUNCTION public.role_saya() TO anon, authenticated;
