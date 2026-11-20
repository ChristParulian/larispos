-- 015_ubah_email_langsung.sql
-- Ganti email langsung dari aplikasi, tanpa link konfirmasi.
-- Skala proyek kecil (warung kelontong): pemilik mengenal semua
-- pengguna, jadi konfirmasi email dianggap berlebihan. Fungsi ini
-- hanya mengubah email pengguna yang sedang masuk (auth.uid()),
-- menolak email yang sudah dipakai akun lain, dan membersihkan
-- permintaan ganti email yang tertunda supaya tidak menimpa
-- perubahan ini di kemudian hari. Trigger 012 tetap menyalin
-- email baru ke profiles.email.

CREATE OR REPLACE FUNCTION public.ubah_email_sendiri(p_email_baru text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus masuk dulu.';
  END IF;
  IF p_email_baru IS NULL OR p_email_baru !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Format email tidak valid.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = p_email_baru AND id <> auth.uid()
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
  WHERE id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ubah_email_sendiri(text) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.ubah_email_sendiri(text) TO authenticated;
