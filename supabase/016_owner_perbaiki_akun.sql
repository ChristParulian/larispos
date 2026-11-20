-- 016_owner_perbaiki_akun.sql
-- Owner memperbaiki akun pengguna lain langsung dari aplikasi:
-- ganti email dan atur kata sandi baru, tanpa link konfirmasi dan
-- tanpa membuka dashboard Supabase. Skala proyek kecil (warung
-- kelontong): pemilik mengenal semua pengguna dan menjadi admin
-- akun mereka. Kedua fungsi hanya boleh dipanggil owner
-- (role_saya() = 'owner') dan hanya untuk pengguna lain; akun
-- sendiri tetap diubah dari halaman Profil Saya. Kata sandi
-- disimpan sebagai hash bcrypt (pgcrypto), dan semua sesi
-- pengguna yang bersangkutan dihapus supaya dia harus masuk
-- ulang dengan kata sandi baru. Trigger 012 tetap menyalin
-- email baru ke profiles.email.

CREATE OR REPLACE FUNCTION public.ubah_email_pengguna(p_pengguna_id uuid, p_email_baru text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus masuk dulu.';
  END IF;
  IF public.role_saya() <> 'owner' THEN
    RAISE EXCEPTION 'Hanya owner yang boleh mengubah email pengguna lain.';
  END IF;
  IF p_pengguna_id = auth.uid() THEN
    RAISE EXCEPTION 'Ubah email sendiri dari halaman Profil Saya.';
  END IF;
  IF p_email_baru IS NULL OR p_email_baru !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Format email tidak valid.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_pengguna_id) THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = p_email_baru AND id <> p_pengguna_id
  ) THEN
    RAISE EXCEPTION 'Email ini sudah dipakai akun lain.';
  END IF;
  UPDATE auth.users
  SET email = p_email_baru,
      email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_sent_at = NULL,
      updated_at = now()
  WHERE id = p_pengguna_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.atur_sandi_pengguna(p_pengguna_id uuid, p_sandi_baru text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus masuk dulu.';
  END IF;
  IF public.role_saya() <> 'owner' THEN
    RAISE EXCEPTION 'Hanya owner yang boleh mengatur kata sandi pengguna lain.';
  END IF;
  IF p_pengguna_id = auth.uid() THEN
    RAISE EXCEPTION 'Ubah kata sandi sendiri dari halaman Profil Saya.';
  END IF;
  IF p_sandi_baru IS NULL OR length(p_sandi_baru) < 8 THEN
    RAISE EXCEPTION 'Kata sandi baru minimal 8 karakter.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_pengguna_id) THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan.';
  END IF;
  UPDATE auth.users
  SET encrypted_password = crypt(p_sandi_baru, gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = p_pengguna_id;
  DELETE FROM auth.sessions WHERE user_id = p_pengguna_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ubah_email_pengguna(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ubah_email_pengguna(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.atur_sandi_pengguna(uuid, text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.atur_sandi_pengguna(uuid, text) TO authenticated;
