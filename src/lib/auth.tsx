// Auth: sesi Supabase + profil/peran pengguna.
//
// - Mode online: login email/kata sandi via Supabase Auth. Setelah
//   login, profil (nama + role owner/kasir) dibaca dari tabel
//   profiles, dibuat otomatis oleh trigger saat signup (004).
// - Mode demo (tanpa Supabase): tidak ada login; pengguna dianggap
//   owner agar semua fitur demo tetap bisa dicoba.
//
// Default aman: bila peran tidak diketahui, pengguna dianggap BUKAN
// owner (harga beli & laba disembunyikan) sampai profil terbaca.

/* eslint-disable react-refresh/only-export-components -- Modul auth
   sengaja mengekspor provider, hook, dan helper akun dalam satu file:
   ketiganya berbagi klien Supabase dan tipe AuthState. Satu-satunya
   akibat: Fast Refresh (HMR) tidak jalan untuk file ini di dev. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { isDemoMode, supabase } from './supabase'
import { fetchProfil } from './api'
import type { Peran, Profil } from './types'
import i18n, { terjemahkanGalatDb } from './i18n'

export interface AuthState {
  /** Akun Supabase yang login (null bila belum login / mode demo). */
  user: User | null
  /** Profil dari tabel profiles (null bila belum login). */
  profil: Profil | null
  peran: Peran | null
  /** True selama sesi + profil awal masih dimuat. */
  loading: boolean
  /** True bila peran terbaca sebagai owner (atau mode demo). */
  isOwner: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (
    email: string,
    password: string,
    nama: string,
  ) => Promise<{ needsConfirmation: boolean; error: string | null }>
  signOut: () => Promise<void>
  /** Baca ulang profil akun yang login (mis. setelah ubah nama). */
  muatUlangProfil: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/** Pesan error Supabase Auth diterjemahkan ke bahasa tampilan. */
function terjemahkanError(pesan: string): string {
  if (/invalid login credentials/i.test(pesan)) {
    return i18n.t('galat.emailSalah')
  }
  if (/email not confirmed/i.test(pesan)) {
    return i18n.t('galat.emailBelumKonfirmasi')
  }
  if (/user already registered|already registered/i.test(pesan)) {
    return i18n.t('galat.emailTerdaftar')
  }
  if (/password.*at least 6|password should/i.test(pesan)) {
    return i18n.t('galat.sandiMin6')
  }
  if (/invalid email/i.test(pesan)) {
    return i18n.t('galat.emailTidakValid')
  }
  if (/too many requests|rate limit/i.test(pesan)) {
    return i18n.t('galat.terlaluBanyak')
  }
  if (/network|fetch failed|failed to fetch/i.test(pesan)) {
    return i18n.t('galat.tidakTerhubung')
  }
  return pesan
}

const PROFIL_DEMO: Profil = {
  id: 'demo',
  nama: 'Demo',
  email: null,
  role: 'owner',
  created_at: '',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [profil, setProfil] = useState<Profil | null>(
    isDemoMode ? PROFIL_DEMO : null,
  )
  const [loading, setLoading] = useState(!isDemoMode)

  const muatProfil = useCallback(async (u: User | null) => {
    if (!u) {
      setProfil(null)
      return
    }
    try {
      const p = await fetchProfil(u.id)
      setProfil(p)
    } catch {
      // Profil gagal dibaca (mis. gangguan jaringan): peran dianggap
      // bukan owner sampai berhasil dibaca, default aman.
      setProfil(null)
    }
  }, [])

  useEffect(() => {
    if (isDemoMode || !supabase) return
    let aktif = true
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!aktif) return
      const u = data.session?.user ?? null
      setUser(u)
      await muatProfil(u)
      if (aktif) setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!aktif) return
        const u = session?.user ?? null
        setUser(u)
        if (!u) {
          setProfil(null)
          queryClient.clear()
        } else {
          await muatProfil(u)
        }
        setLoading(false)
      },
    )
    return () => {
      aktif = false
      listener.subscription.unsubscribe()
    }
  }, [muatProfil, queryClient])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return i18n.t('galat.supabaseBelumSiap')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) return terjemahkanError(error.message)
    return null
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, nama: string) => {
      if (!supabase) {
        return {
          needsConfirmation: false,
          error: i18n.t('galat.supabaseBelumSiap'),
        }
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nama } },
      })
      if (error) {
        return {
          needsConfirmation: false,
          error: terjemahkanError(error.message),
        }
      }
      // Tanpa sesi berarti konfirmasi email aktif: akun dibuat, tapi
      // belum bisa masuk sebelum tautan di email diklik.
      return { needsConfirmation: !data.session, error: null }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setProfil(null)
    queryClient.clear()
  }, [queryClient])

  const muatUlangProfil = useCallback(async () => {
    await muatProfil(user)
  }, [muatProfil, user])

  const peran: Peran | null = profil?.role ?? null

  const value = useMemo<AuthState>(
    () => ({
      user,
      profil,
      peran,
      loading,
      isOwner: peran === 'owner',
      signIn,
      signUp,
      signOut,
      muatUlangProfil,
    }),
    [user, profil, peran, loading, signIn, signUp, signOut, muatUlangProfil],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>.')
  return ctx
}

/** Ganti email sendiri, langsung tanpa link konfirmasi (RPC 015). */
export async function ubahEmailSendiri(
  emailBaru: string,
): Promise<string | null> {
  if (!supabase) return i18n.t('galat.supabaseBelumSiap')
  const { error } = await supabase.rpc('ubah_email_sendiri', {
    p_email_baru: emailBaru,
  })
  if (error) {
    return terjemahkanGalatDb(error.message)
  }
  // Segarkan sesi supaya token membawa email baru. Kalau gagal,
  // email tetap sudah berubah dan token ikut baru saat refresh
  // berikutnya, jadi kegagalan ini tidak dilaporkan.
  await supabase.auth.refreshSession().catch(() => undefined)
  return null
}

/** Owner ganti email pengguna lain, langsung tanpa link konfirmasi (RPC 016). */
export async function ubahEmailPengguna(
  penggunaId: string,
  emailBaru: string,
): Promise<string | null> {
  if (!supabase) return i18n.t('galat.supabaseBelumSiap')
  const { error } = await supabase.rpc('ubah_email_pengguna', {
    p_pengguna_id: penggunaId,
    p_email_baru: emailBaru,
  })
  if (error) {
    return terjemahkanGalatDb(error.message)
  }
  return null
}

/** Owner atur kata sandi baru untuk pengguna lain (RPC 016). */
export async function aturSandiPengguna(
  penggunaId: string,
  sandiBaru: string,
): Promise<string | null> {
  if (!supabase) return i18n.t('galat.supabaseBelumSiap')
  const { error } = await supabase.rpc('atur_sandi_pengguna', {
    p_pengguna_id: penggunaId,
    p_sandi_baru: sandiBaru,
  })
  if (error) {
    return terjemahkanGalatDb(error.message)
  }
  return null
}

/**
 * Ubah kata sandi akun sendiri. Kata sandi saat ini diverifikasi
 * dulu (masuk ulang), supaya orang yang memegang sesi terbuka
 * tidak bisa mengganti kata sandi begitu saja.
 */
export async function ubahKataSandiSendiri(
  email: string,
  sandiLama: string,
  sandiBaru: string,
): Promise<string | null> {
  if (!supabase) return i18n.t('galat.supabaseBelumSiap')
  if (sandiBaru.length < 8) return i18n.t('galat.sandiBaruMin8')
  const { error: errMasuk } = await supabase.auth.signInWithPassword({
    email,
    password: sandiLama,
  })
  if (errMasuk) return i18n.t('galat.sandiLamaSalah')
  const { error } = await supabase.auth.updateUser({ password: sandiBaru })
  if (error) return terjemahkanError(error.message)
  return null
}

/**
 * Kirim email berisi tautan atur ulang kata sandi ke alamat yang
 * diberikan. Dipakai halaman Masuk ("Lupa kata sandi") dan owner
 * untuk membantu pengguna lain. Tautan mengarah ke
 * /atur-ulang-sandi, tempat pengguna membuat kata sandi barunya
 * sendiri; owner tidak pernah melihat atau mengatur kata sandi
 * orang lain.
 */
export async function kirimLinkAturUlangSandi(
  email: string,
): Promise<string | null> {
  if (!supabase) return i18n.t('galat.supabaseBelumSiap')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/atur-ulang-sandi`,
  })
  if (error) return terjemahkanError(error.message)
  return null
}

/**
 * Atur kata sandi baru dari tautan pemulihan (halaman
 * /atur-ulang-sandi). Dipanggil saat sesi pemulihan aktif.
 */
export async function aturUlangSandiBaru(
  sandiBaru: string,
): Promise<string | null> {
  if (!supabase) return i18n.t('galat.supabaseBelumSiap')
  if (sandiBaru.length < 8) return i18n.t('galat.sandiBaruMin8')
  const { error } = await supabase.auth.updateUser({ password: sandiBaru })
  if (error) return terjemahkanError(error.message)
  return null
}
