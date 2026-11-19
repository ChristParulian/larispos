-- =====================================================================
-- Warung POS, 012_sinkron_email_profil.sql
-- Core: sinkronkan email profiles saat email akun Auth berubah.
--
-- Pengguna bisa mengubah emailnya sendiri lewat aplikasi
-- (supabase.auth.updateUser). Supabase baru mengubah email di
-- auth.users setelah tautan konfirmasi di email baru diklik.
-- Trigger ini menyalin email baru ke profiles.email begitu
-- perubahan itu terjadi, supaya halaman Pengguna selalu
-- menampilkan email yang benar tanpa perlu update manual.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sinkronkan_email_profil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_users_sinkron_email ON auth.users;
CREATE TRIGGER trg_auth_users_sinkron_email
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sinkronkan_email_profil();
