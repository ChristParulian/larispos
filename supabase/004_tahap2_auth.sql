-- =====================================================================
-- Warung POS, 004_tahap2_auth.sql
-- Tahap 2: login + peran owner/kasir (repo publik).
--
-- PENTING, URUTAN PENERAPAN: jalankan file ini SETELAH frontend
-- Tahap 2 (dengan halaman login) sudah tayang di Vercel. Migrasi ini
-- mencabut akses anon: tanpa login, kasir/laporan tidak bisa dipakai.
-- Menjalankannya sebelum frontend login tayang akan mematikan demo.
--
-- Isi:
--   1. Trigger pembuatan profil otomatis saat akun Auth dibuat:
--      akun PERTAMA menjadi owner, akun berikutnya menjadi kasir.
--      Akun Auth yang sudah ada sebelum migrasi ini ikut dibuatkan
--      profilnya (backfill, akun tertua menjadi owner bila belum
--      ada owner).
--   2. Penjaga peran: hanya owner yang boleh mengubah role, dan
--      owner terakhir tidak boleh diturunkan menjadi kasir.
--   3. Penjaga harga beli: hanya owner yang boleh mengisi/mengubah
--      harga_beli produk. Kasir tetap bisa mengelola produk lain
--      (nama, harga jual, stok) dan berjualan seperti biasa.
--   4. RLS: baca kategori/produk/transaksi/item/log hanya untuk
--      pengguna login (akses anon Tahap 1 dicabut); pembuatan profil
--      hanya lewat trigger (policy INSERT profil dihapus).
--   5. REVOKE EXECUTE buat_transaksi() FROM anon, mencabut grant
--      sementara Tahap 1 (lihat 001). Checkout hanya untuk pengguna
--      login.
--
-- Catatan keamanan: penyembunyian harga_beli dari kasir ditegakkan
-- di UI + trigger tulis ini. SELECT harga_beli lewat API langsung
-- masih bisa dilakukan akun login mana pun (Postgres tidak bisa
-- membedakan owner/kasir di level kolom karena keduanya memakai
-- peran database 'authenticated' yang sama). Untuk warung kecil ini
-- sudah memadai; pemisahan kolom penuh ada di roadmap Pro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profil otomatis saat signup.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_nama text;
BEGIN
  -- Akun pertama (belum ada owner) menjadi owner; sisanya kasir.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'owner') THEN
    v_role := 'kasir';
  ELSE
    v_role := 'owner';
  END IF;
  v_nama := NEW.raw_user_meta_data ->> 'nama';
  INSERT INTO public.profiles (id, nama, role)
  VALUES (NEW.id, NULLIF(v_nama, ''), v_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_profil ON auth.users;
CREATE TRIGGER trg_auth_users_profil
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: akun Auth yang sudah ada sebelum migrasi ini (misalnya
-- dibuat sebelum trigger di atas ada) dibuatkan profilnya. Akun
-- tertua menjadi owner bila belum ada owner sama sekali.
INSERT INTO public.profiles (id, nama, role)
SELECT
  u.id,
  NULLIF(u.raw_user_meta_data ->> 'nama', ''),
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) = 1
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'owner')
    THEN 'owner'
    ELSE 'kasir'
  END
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- ---------------------------------------------------------------------
-- 2. Penjaga peran di profiles.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jaga_peran_profil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hanya berlaku untuk perubahan lewat API (ada JWT). Perubahan
  -- langsung dari Dashboard / service_role (auth.uid() NULL)
  -- tidak dibatasi trigger ini.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Hanya owner yang boleh mengubah role siapa pun (termasuk
    -- role-nya sendiri). Tanpa ini, kasir bisa mengangkat dirinya
    -- sendiri menjadi owner lewat policy "pengguna ubah profil
    -- sendiri" di 001.
    IF public.role_saya() IS DISTINCT FROM 'owner' THEN
      RAISE EXCEPTION 'Hanya owner yang boleh mengubah peran pengguna.';
    END IF;
    -- Owner terakhir tidak boleh diturunkan menjadi kasir.
    IF OLD.role = 'owner' AND NEW.role = 'kasir' AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE role = 'owner' AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'Owner terakhir tidak boleh diubah menjadi kasir.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_jaga_peran ON public.profiles;
CREATE TRIGGER trg_profiles_jaga_peran
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.jaga_peran_profil();

-- ---------------------------------------------------------------------
-- 3. Penjaga harga beli di produk.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jaga_harga_beli()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Perubahan dari Dashboard / service_role (auth.uid() NULL)
  -- tidak dibatasi. Checkout (buat_transaksi) hanya mengubah stok,
  -- harga_beli tidak berubah, jadi tidak terpengaruh.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.harga_beli IS NOT NULL
       AND public.role_saya() IS DISTINCT FROM 'owner' THEN
      RAISE EXCEPTION 'Hanya owner yang boleh mengisi harga beli.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.harga_beli IS DISTINCT FROM NEW.harga_beli
       AND public.role_saya() IS DISTINCT FROM 'owner' THEN
      RAISE EXCEPTION 'Hanya owner yang boleh mengubah harga beli.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produk_jaga_harga_beli ON public.produk;
CREATE TRIGGER trg_produk_jaga_harga_beli
  BEFORE INSERT OR UPDATE ON public.produk
  FOR EACH ROW EXECUTE FUNCTION public.jaga_harga_beli();

-- ---------------------------------------------------------------------
-- 4. RLS: cabut akses baca anon (Tahap 1), hanya pengguna login.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "semua baca kategori" ON public.kategori;
CREATE POLICY "pengguna login baca kategori"
  ON public.kategori FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "semua baca produk" ON public.produk;
CREATE POLICY "pengguna login baca produk"
  ON public.produk FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "demo baca transaksi" ON public.transaksi;
CREATE POLICY "pengguna login baca transaksi"
  ON public.transaksi FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "demo baca item transaksi" ON public.item_transaksi;
CREATE POLICY "pengguna login baca item transaksi"
  ON public.item_transaksi FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "demo baca log stok" ON public.log_stok;
CREATE POLICY "pengguna login baca log stok"
  ON public.log_stok FOR SELECT TO authenticated USING (true);

-- Pembuatan profil hanya lewat trigger signup (bagian 1). Policy
-- INSERT langsung dari klien dihapus agar tidak ada yang bisa
-- menyisipkan profil dengan role 'owner' untuk dirinya sendiri.
DROP POLICY IF EXISTS "pengguna buat profil sendiri" ON public.profiles;

-- ---------------------------------------------------------------------
-- 5. Cabut grant anon ke buat_transaksi() (grant sementara Tahap 1).
-- Postgres memberikan EXECUTE ke PUBLIC secara default saat fungsi
-- dibuat, dan anon termasuk PUBLIC, jadi mencabut dari anon saja
-- TIDAK cukup; PUBLIC harus dicabut juga. Grant eksplisit ke
-- authenticated (dari 001) tetap berlaku.
-- ---------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION
  public.buat_transaksi(jsonb, text, bigint, uuid, boolean)
  FROM anon, PUBLIC;
