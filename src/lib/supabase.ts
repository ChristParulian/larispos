import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Kredensial dibaca dari environment Vite. Bila salah satu kosong,
// aplikasi berjalan dalam MODE DEMO (data lokal, tanpa Supabase)
// dan TIDAK crash, lihat src/lib/demo.ts.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined

export const isDemoMode: boolean = !supabaseUrl || !supabaseAnonKey

export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(supabaseUrl as string, supabaseAnonKey as string)

/** Klien Supabase, atau throw bila sedang mode demo (dipakai jalur online). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.',
    )
  }
  return supabase
}
