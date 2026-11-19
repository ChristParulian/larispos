-- =====================================================================
-- Warung POS, 011_tambah_email_profil.sql
-- Core: tambah kolom email ke profiles.
--
-- Halaman Pengguna selama ini hanya bisa menampilkan potongan ID acak
-- (#XXXXXXXX) di bawah nama, karena tabel profiles tidak menyimpan
-- email. Dengan kolom ini, owner bisa mengenali tiap akun lewat
-- emailnya. Trigger signup diperbarui supaya akun baru langsung
-- menyimpan emailnya, dan akun yang sudah ada di-backfill dari
-- auth.users.
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Trigger signup ikut menyimpan email akun baru.
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
  INSERT INTO public.profiles (id, nama, email, role)
  VALUES (NEW.id, NULLIF(v_nama, ''), NEW.email, v_role)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill: isi email akun yang sudah ada dari auth.users.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;
