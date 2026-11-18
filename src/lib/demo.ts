// Mode demo lokal: dipakai bila VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// tidak diisi. Data awal = 12 produk seed yang sama persis dengan
// supabase/002_seed_12_produk.sql. Transaksi demo disimpan di
// localStorage browser saja (bukan database) dan stok berkurang lokal,
// supaya kasir + laporan tetap bisa dicoba tanpa project Supabase.

import type {
  CheckoutResult,
  Kategori,
  LogStok,
  Produk,
  ProdukInput,
  Transaksi,
} from './types'

const KEY_PRODUK = 'larispos-demo-produk'
const KEY_TRANSAKSI = 'larispos-demo-transaksi'
const KEY_LOG = 'larispos-demo-log-stok'

export const DEMO_KATEGORI: Kategori[] = [
  { id: 'demo-kat-sembako', nama: 'Sembako' },
  { id: 'demo-kat-minuman', nama: 'Minuman' },
  { id: 'demo-kat-snack', nama: 'Makanan Ringan' },
  { id: 'demo-kat-rt', nama: 'Perawatan & Rumah Tangga' },
]

const SEED: Array<
  Omit<Produk, 'id' | 'kategori_id' | 'kategori'> & { kategori: string }
> = [
  // Sembako (5) — sama dengan 002_seed_12_produk.sql
  { kategori: 'Sembako', nama: 'Beras Premium 5 kg', satuan: 'karung', harga_beli: 58000, harga_jual: 65000, stok: 20 },
  { kategori: 'Sembako', nama: 'Minyak Goreng 1 Liter', satuan: 'botol', harga_beli: 17500, harga_jual: 20000, stok: 24 },
  { kategori: 'Sembako', nama: 'Gula Pasir 1 kg', satuan: 'kg', harga_beli: 15500, harga_jual: 17500, stok: 30 },
  { kategori: 'Sembako', nama: 'Telur Ayam 1 kg', satuan: 'kg', harga_beli: 26000, harga_jual: 29000, stok: 15 },
  { kategori: 'Sembako', nama: 'Mie Instan Goreng', satuan: 'bungkus', harga_beli: 2600, harga_jual: 3500, stok: 60 },
  // Minuman (3)
  { kategori: 'Minuman', nama: 'Kopi Sachet', satuan: 'sachet', harga_beli: 900, harga_jual: 1500, stok: 100 },
  { kategori: 'Minuman', nama: 'Air Mineral 600 ml', satuan: 'botol', harga_beli: 2200, harga_jual: 3000, stok: 48 },
  { kategori: 'Minuman', nama: 'Susu Kental Manis 370 g', satuan: 'kaleng', harga_beli: 11000, harga_jual: 13500, stok: 24 },
  // Makanan Ringan (2)
  { kategori: 'Makanan Ringan', nama: 'Biskuit Kelapa', satuan: 'bungkus', harga_beli: 4500, harga_jual: 6000, stok: 30 },
  { kategori: 'Makanan Ringan', nama: 'Keripik Singkong', satuan: 'bungkus', harga_beli: 6000, harga_jual: 8000, stok: 25 },
  // Perawatan & Rumah Tangga (2)
  { kategori: 'Perawatan & Rumah Tangga', nama: 'Sabun Mandi Batang', satuan: 'pcs', harga_beli: 3200, harga_jual: 4500, stok: 36 },
  { kategori: 'Perawatan & Rumah Tangga', nama: 'Deterjen Bubuk 800 g', satuan: 'bungkus', harga_beli: 14000, harga_jual: 17000, stok: 18 },
]

function seedProduk(): Produk[] {
  return SEED.map((p, i) => {
    const kat = DEMO_KATEGORI.find((k) => k.nama === p.kategori) ?? null
    return {
      id: `demo-produk-${i + 1}`,
      kategori_id: kat ? kat.id : null,
      nama: p.nama,
      satuan: p.satuan,
      harga_beli: p.harga_beli,
      harga_jual: p.harga_jual,
      stok: p.stok,
      kategori: kat,
    }
  })
}

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Penyimpanan penuh / privat — demo tetap jalan di memori sesi ini.
  }
}

function withKategori(list: Produk[]): Produk[] {
  return list.map((p) => ({
    ...p,
    kategori:
      DEMO_KATEGORI.find((k) => k.id === p.kategori_id) ?? null,
  }))
}

export function demoGetProduk(): Produk[] {
  const saved = load<Produk[]>(KEY_PRODUK)
  if (saved) return withKategori(saved)
  const awal = seedProduk()
  save(KEY_PRODUK, awal)
  return awal
}

export function demoGetTransaksi(): Transaksi[] {
  return load<Transaksi[]>(KEY_TRANSAKSI) ?? []
}

export function demoGetLogStok(): LogStok[] {
  return load<LogStok[]>(KEY_LOG) ?? []
}

export function demoSaveProduk(input: ProdukInput, id?: string): Produk {
  const list = demoGetProduk()
  if (id) {
    const idx = list.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Produk tidak ditemukan.')
    const updated: Produk = { ...list[idx], ...input }
    list[idx] = updated
    save(KEY_PRODUK, list)
    return withKategori([updated])[0]
  }
  if (list.some((p) => p.nama.toLowerCase() === input.nama.toLowerCase())) {
    throw new Error(`Produk "${input.nama}" sudah ada.`)
  }
  const baru: Produk = {
    id: `demo-produk-${Date.now()}`,
    ...input,
  }
  list.push(baru)
  save(KEY_PRODUK, list)
  return withKategori([baru])[0]
}

export function demoHapusProduk(id: string): void {
  const transaksi = demoGetTransaksi()
  const pernahTerjual = transaksi.some((t) =>
    (t.item_transaksi ?? []).some((it) => it.produk_id === id),
  )
  if (pernahTerjual) {
    throw new Error(
      'Produk yang pernah terjual tidak bisa dihapus (menjaga riwayat transaksi).',
    )
  }
  save(
    KEY_PRODUK,
    demoGetProduk().filter((p) => p.id !== id),
  )
}

/** Meniru perilaku buat_transaksi() untuk mode demo (stok, total, log). */
export function demoCheckout(
  items: Array<{ produk_id: string; qty: number }>,
  metode: 'tunai' | 'qris',
  dibayarInput: number,
): CheckoutResult {
  const produkList = demoGetProduk()
  if (items.length === 0) throw new Error('Keranjang kosong.')

  let total = 0
  const itemDetail = items.map((it) => {
    const p = produkList.find((x) => x.id === it.produk_id)
    if (!p) throw new Error('Produk tidak ditemukan.')
    if (it.qty <= 0) throw new Error('Jumlah (qty) harus lebih dari 0.')
    if (p.stok < it.qty) {
      throw new Error(
        `Stok "${p.nama}" tidak cukup (sisa ${p.stok}, diminta ${it.qty}).`,
      )
    }
    const subtotal = p.harga_jual * it.qty
    total += subtotal
    return { produk: p, qty: it.qty, subtotal }
  })

  let dibayar = dibayarInput
  let kembalian = 0
  if (metode === 'tunai') {
    if (dibayar < total) {
      throw new Error(
        `Uang dibayar (Rp${dibayar.toLocaleString('id-ID')}) kurang dari total (Rp${total.toLocaleString('id-ID')}).`,
      )
    }
    kembalian = dibayar - total
  } else {
    dibayar = total
    kembalian = 0
  }

  const transaksiId = `demo-trx-${Date.now()}`
  const now = new Date().toISOString()

  const transaksi: Transaksi = {
    id: transaksiId,
    created_at: now,
    metode_bayar: metode,
    total,
    dibayar,
    kembalian,
    item_transaksi: itemDetail.map((d, i) => ({
      id: `${transaksiId}-item-${i}`,
      transaksi_id: transaksiId,
      produk_id: d.produk.id,
      qty: d.qty,
      harga_jual: d.produk.harga_jual,
      harga_beli: d.produk.harga_beli,
      subtotal: d.subtotal,
      produk: { nama: d.produk.nama },
    })),
  }

  // Kurangi stok + tulis log stok.
  const logs = demoGetLogStok()
  const produkBaru = produkList.map((p) => {
    const d = itemDetail.find((x) => x.produk.id === p.id)
    if (!d) return p
    const stokSesudah = p.stok - d.qty
    logs.unshift({
      id: `${transaksiId}-log-${p.id}`,
      produk_id: p.id,
      transaksi_id: transaksiId,
      perubahan: -d.qty,
      stok_sebelum: p.stok,
      stok_sesudah: stokSesudah,
      alasan: 'penjualan',
      created_at: now,
      produk: { nama: p.nama },
    })
    return { ...p, stok: stokSesudah }
  })
  save(KEY_PRODUK, produkBaru)
  save(KEY_LOG, logs)
  save(KEY_TRANSAKSI, [transaksi, ...demoGetTransaksi()])

  return {
    transaksi_id: transaksiId,
    total,
    dibayar,
    kembalian,
    metode_bayar: metode,
    piutang_id: null,
  }
}

/** Kembalikan data demo ke 12 produk seed awal (hapus transaksi demo). */
export function demoReset(): void {
  localStorage.removeItem(KEY_PRODUK)
  localStorage.removeItem(KEY_TRANSAKSI)
  localStorage.removeItem(KEY_LOG)
}
