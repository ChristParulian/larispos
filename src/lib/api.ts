// Lapisan data: satu API untuk halaman, dua sumber di belakangnya.
// - Mode online: Supabase (tabel + RPC buat_transaksi di 001_free_core.sql).
// - Mode demo: data lokal di src/lib/demo.ts.
//
// Checkout SELALU lewat RPC buat_transaksi() saat online, harga dan
// total dihitung ulang di database, tidak pernah dipercaya dari browser.
// Tidak ada INSERT langsung ke transaksi / item_transaksi / log_stok
// (ditolak RLS, sesuai desain skema).

import { isDemoMode, requireSupabase } from './supabase'
import {
  demoCheckout,
  demoGetKategori,
  demoGetLogStok,
  demoGetProduk,
  demoGetSatuan,
  demoGetTransaksi,
  demoHapusKategori,
  demoHapusProduk,
  demoHapusSatuan,
  demoSaveKategori,
  demoSaveProduk,
  demoSaveSatuan,
} from './demo'
import type {
  CheckoutResult,
  Kategori,
  LogStok,
  Peran,
  Produk,
  ProdukInput,
  Profil,
  Satuan,
  Transaksi,
} from './types'

const PRODUK_SELECT = 'id, kategori_id, nama, satuan, harga_beli, harga_jual, stok, kategori:kategori_id ( id, nama )'
const TRANSAKSI_SELECT = `
  id, created_at, metode_bayar, total, dibayar, kembalian,
  item_transaksi (
    id, transaksi_id, produk_id, qty, harga_jual, harga_beli, subtotal,
    produk:produk_id ( nama )
  )
`
const LOG_SELECT = `
  id, produk_id, transaksi_id, perubahan, stok_sebelum, stok_sesudah, alasan, created_at,
  produk:produk_id ( nama )
`

export async function fetchKategori(): Promise<Kategori[]> {
  if (isDemoMode) return demoGetKategori()
  const { data, error } = await requireSupabase()
    .from('kategori')
    .select('id, nama')
    .order('nama')
  if (error) throw error
  return (data ?? []) as Kategori[]
}

/** Pesan duplikat yang ramah untuk pelanggaran UNIQUE nama (kategori/satuan). */
function duplikatError(error: unknown, label: string, nama: string): Error {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === '23505'
  ) {
    return new Error(`${label} "${nama}" sudah ada.`)
  }
  return error instanceof Error
    ? error
    : new Error(`Gagal menyimpan ${label.toLowerCase()}.`)
}

/** Simpan (tambah/ubah) kategori. Nama unik, ditegakkan database. */
export async function saveKategori(
  nama: string,
  id?: string,
): Promise<Kategori> {
  const namaBersih = nama.trim()
  if (!namaBersih) throw new Error('Nama kategori tidak boleh kosong.')
  if (isDemoMode) return demoSaveKategori(namaBersih, id)
  const sb = requireSupabase()
  if (id) {
    const { data, error } = await sb
      .from('kategori')
      .update({ nama: namaBersih })
      .eq('id', id)
      .select('id, nama')
      .single()
    if (error) throw duplikatError(error, 'Kategori', namaBersih)
    return data as Kategori
  }
  const { data, error } = await sb
    .from('kategori')
    .insert({ nama: namaBersih })
    .select('id, nama')
    .single()
  if (error) throw duplikatError(error, 'Kategori', namaBersih)
  return data as Kategori
}

export async function fetchSatuan(): Promise<Satuan[]> {
  if (isDemoMode) return demoGetSatuan()
  const { data, error } = await requireSupabase()
    .from('satuan')
    .select('id, nama')
    .order('nama')
  if (error) throw error
  return (data ?? []) as Satuan[]
}

/**
 * Simpan (tambah/ubah) satuan. Nama unik, ditegakkan database.
 * Ubah nama satuan memperbarui produk yang memakai nama lama,
 * karena produk menyimpan satuannya sebagai teks (lihat 006).
 */
export async function saveSatuan(nama: string, id?: string): Promise<Satuan> {
  const namaBersih = nama.trim()
  if (!namaBersih) throw new Error('Nama satuan tidak boleh kosong.')
  if (isDemoMode) return demoSaveSatuan(namaBersih, id)
  const sb = requireSupabase()
  if (id) {
    const { data: lama, error: errLama } = await sb
      .from('satuan')
      .select('nama')
      .eq('id', id)
      .single()
    if (errLama) throw errLama
    const { data, error } = await sb
      .from('satuan')
      .update({ nama: namaBersih })
      .eq('id', id)
      .select('id, nama')
      .single()
    if (error) throw duplikatError(error, 'Satuan', namaBersih)
    const namaLama = (lama as { nama: string }).nama
    if (namaLama !== namaBersih) {
      const { error: errProduk } = await sb
        .from('produk')
        .update({ satuan: namaBersih })
        .eq('satuan', namaLama)
      if (errProduk) throw errProduk
    }
    return data as Satuan
  }
  const { data, error } = await sb
    .from('satuan')
    .insert({ nama: namaBersih })
    .select('id, nama')
    .single()
  if (error) throw duplikatError(error, 'Satuan', namaBersih)
  return data as Satuan
}

/**
 * Hapus satuan dari daftar. Produk yang memakainya tidak ikut
 * terhapus dan tetap menampilkan satuannya (teks di produk.satuan).
 */
export async function hapusSatuan(id: string): Promise<void> {
  if (isDemoMode) {
    demoHapusSatuan(id)
    return
  }
  const { error } = await requireSupabase()
    .from('satuan')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Hapus kategori. Produk di dalamnya tidak ikut terhapus, kategorinya
 * menjadi kosong (ON DELETE SET NULL di skema).
 */
export async function hapusKategori(id: string): Promise<void> {
  if (isDemoMode) {
    demoHapusKategori(id)
    return
  }
  const { error } = await requireSupabase()
    .from('kategori')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function fetchProduk(): Promise<Produk[]> {
  if (isDemoMode) return demoGetProduk()
  const { data, error } = await requireSupabase()
    .from('produk')
    .select(PRODUK_SELECT)
    .order('nama')
  if (error) throw error
  return (data ?? []) as unknown as Produk[]
}

/**
 * Simpan (tambah/ubah) produk. Bila includeHargaBeli false (kasir),
 * kolom harga_beli DIHILANGKAN dari payload agar nilainya tidak
 * tertimpa null, trigger jaga_harga_beli (004) juga menolak
 * perubahan harga beli oleh kasir.
 */
export async function saveProduk(
  input: ProdukInput,
  id?: string,
  opts?: { includeHargaBeli?: boolean },
): Promise<Produk> {
  if (isDemoMode) return demoSaveProduk(input, id)
  const sb = requireSupabase()
  const payload: Record<string, unknown> = {
    nama: input.nama,
    kategori_id: input.kategori_id,
    satuan: input.satuan,
    harga_jual: input.harga_jual,
    stok: input.stok,
  }
  if (opts?.includeHargaBeli ?? true) {
    payload.harga_beli = input.harga_beli
  }
  if (id) {
    const { data, error } = await sb
      .from('produk')
      .update(payload)
      .eq('id', id)
      .select(PRODUK_SELECT)
      .single()
    if (error) throw error
    return data as unknown as Produk
  }
  const { data, error } = await sb
    .from('produk')
    .insert(payload)
    .select(PRODUK_SELECT)
    .single()
  if (error) throw error
  return data as unknown as Produk
}

export async function hapusProduk(id: string): Promise<void> {
  if (isDemoMode) {
    demoHapusProduk(id)
    return
  }
  const { error } = await requireSupabase().from('produk').delete().eq('id', id)
  if (error) throw error
}

export async function fetchLogStok(limit = 100): Promise<LogStok[]> {
  if (isDemoMode) return demoGetLogStok().slice(0, limit)
  const { data, error } = await requireSupabase()
    .from('log_stok')
    .select(LOG_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as LogStok[]
}

/** Riwayat transaksi + itemnya, terbaru dulu. Filter tanggal opsional (YYYY-MM-DD, zona lokal). */
export async function fetchTransaksi(tanggal?: string): Promise<Transaksi[]> {
  if (isDemoMode) {
    const semua = demoGetTransaksi()
    if (!tanggal) return semua
    return semua.filter((t) => t.created_at.slice(0, 10) === tanggal)
  }
  let query = requireSupabase()
    .from('transaksi')
    .select(TRANSAKSI_SELECT)
    .order('created_at', { ascending: false })
    .limit(200)
  if (tanggal) {
    query = query
      .gte('created_at', `${tanggal}T00:00:00`)
      .lt('created_at', `${tanggal}T23:59:59.999`)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Transaksi[]
}

/** Profil satu pengguna (dipakai AuthProvider setelah login). */
export async function fetchProfil(userId: string): Promise<Profil | null> {
  if (isDemoMode) return null
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, nama, role, created_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Profil | null
}

/** Semua profil (hanya owner yang boleh membaca, ditegakkan RLS). */
export async function fetchSemuaProfil(): Promise<Profil[]> {
  if (isDemoMode) return []
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, nama, role, created_at')
    .order('created_at')
  if (error) throw error
  return (data ?? []) as Profil[]
}

/** Ubah peran pengguna (hanya owner; trigger menjaga owner terakhir). */
export async function ubahPeranProfil(id: string, role: Peran): Promise<void> {
  if (isDemoMode) return
  const { error } = await requireSupabase()
    .from('profiles')
    .update({ role })
    .eq('id', id)
  if (error) throw error
}

export interface CheckoutItem {
  produk_id: string
  qty: number
}

/**
 * Checkout via fungsi database buat_transaksi().
 * Signature SQL: buat_transaksi(p_items jsonb, p_metode_bayar text,
 * p_dibayar bigint, p_pelanggan_id uuid, p_allow_minus boolean).
 * Core hanya memakai p_items, p_metode_bayar, p_dibayar.
 */
export async function checkout(
  items: CheckoutItem[],
  metode: 'tunai' | 'qris',
  dibayar: number,
): Promise<CheckoutResult> {
  if (isDemoMode) return demoCheckout(items, metode, dibayar)
  const { data, error } = await requireSupabase().rpc('buat_transaksi', {
    p_items: items,
    p_metode_bayar: metode,
    p_dibayar: dibayar,
  })
  if (error) throw error
  return data as unknown as CheckoutResult
}
