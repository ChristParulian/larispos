// Tipe data yang mencerminkan tabel di supabase/001_free_core.sql.
// Harga dalam Rupiah (bigint di Postgres, tanpa desimal).

export interface Kategori {
  id: string
  nama: string
}

export interface Produk {
  id: string
  kategori_id: string | null
  nama: string
  satuan: string
  harga_beli: number | null
  harga_jual: number
  stok: number
  kategori?: Kategori | null
}

export interface ProdukInput {
  nama: string
  kategori_id: string | null
  satuan: string
  harga_beli: number | null
  harga_jual: number
  stok: number
}

export interface ItemTransaksi {
  id: string
  transaksi_id: string
  produk_id: string
  qty: number
  harga_jual: number
  harga_beli: number | null
  subtotal: number
  produk?: { nama: string } | null
}

export interface Transaksi {
  id: string
  created_at: string
  metode_bayar: 'tunai' | 'qris' | 'bon'
  total: number
  dibayar: number
  kembalian: number
  item_transaksi?: ItemTransaksi[]
}

export interface LogStok {
  id: string
  produk_id: string
  transaksi_id: string | null
  perubahan: number
  stok_sebelum: number
  stok_sesudah: number
  alasan: string
  created_at: string
  produk?: { nama: string } | null
}

/** Hasil kembalian fungsi buat_transaksi() — lihat 001_free_core.sql. */
export interface CheckoutResult {
  transaksi_id: string
  total: number
  dibayar: number
  kembalian: number
  metode_bayar: string
  piutang_id: string | null
}

export interface CartItem {
  produk: Produk
  qty: number
}

/** Peran pengguna (tabel profiles, lihat 001 + 004). */
export type Peran = 'owner' | 'kasir'

export interface Profil {
  id: string
  nama: string | null
  role: Peran
  created_at: string
}
