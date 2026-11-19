import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import id from '../locales/id'
import en from '../locales/en'

/** Bahasa tampilan: Indonesia (bawaan) atau Inggris. */
export type Bahasa = 'id' | 'en'

const KUNCI_BAHASA = 'larispos-bahasa'

/** Bahasa yang tersimpan di perangkat ini, atau 'id' bila belum ada. */
export function bahasaTersimpan(): Bahasa {
  try {
    return localStorage.getItem(KUNCI_BAHASA) === 'en' ? 'en' : 'id'
  } catch {
    return 'id'
  }
}

/** Ganti bahasa tampilan dan simpan pilihan di perangkat ini. */
export function simpanBahasa(bahasa: Bahasa): void {
  try {
    localStorage.setItem(KUNCI_BAHASA, bahasa)
  } catch {
    // Penyimpanan tidak tersedia (misalnya mode privat), pilihan
    // hanya berlaku sampai halaman dimuat ulang.
  }
  void i18n.changeLanguage(bahasa)
}

i18n.use(initReactI18next).init({
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  lng: bahasaTersimpan(),
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
})

export default i18n

/** Pesan galat database yang diterjemahkan apa adanya. */
const GALAT_DB_TETAP: Array<[string, string]> = [
  ['Keranjang kosong.', 'galat.keranjangKosong'],
  ['Jumlah (qty) harus lebih dari 0 untuk semua item.', 'galat.qtyPositif'],
  ['Produk tidak ditemukan.', 'galat.produkTidakDitemukan'],
  ['Transaksi tidak ditemukan.', 'galat.transaksiTidakDitemukan'],
  ['Transaksi ini sudah dibatalkan.', 'galat.transaksiSudahBatal'],
  [
    'Transaksi yang sudah dibatalkan tidak bisa diubah.',
    'galat.transaksiBatalTidakBisaDiubah',
  ],
  ['Transaksi Bon hanya bisa diubah di versi Pro.', 'galat.bonHanyaPro'],
  [
    'Transaksi hanya bisa diubah dalam 24 jam setelah dibuat.',
    'galat.ubah24Jam',
  ],
  ['Pembayaran Bon hanya tersedia di versi Pro.', 'galat.pembayaranBonHanyaPro'],
  ['Pembayaran Bon wajib memilih pelanggan.', 'galat.bonWajibPelanggan'],
  ['Pelanggan hanya dipakai untuk pembayaran Bon.', 'galat.pelangganHanyaBon'],
  [
    'Hanya owner yang boleh mengubah peran pengguna.',
    'galat.hanyaOwnerUbahPeran',
  ],
  ['Owner terakhir tidak boleh diubah menjadi kasir.', 'galat.ownerTerakhir'],
  ['Hanya owner yang boleh mengisi harga beli.', 'galat.hanyaOwnerHargaBeli'],
  [
    'Hanya owner yang boleh mengubah harga beli.',
    'galat.hanyaOwnerUbahHargaBeli',
  ],
  [
    'Pembayaran hutang tidak boleh diubah langsung; hapus lalu catat ulang.',
    'galat.hutangTidakBisaDiubah',
  ],
  ['Jumlah stok harus minimal 1.', 'galat.jumlahStokMinimal'],
]

/** Pesan galat database dengan nilai di dalamnya (pola + kunci). */
const GALAT_DB_POLAA: Array<{
  pola: RegExp
  kunci: string
  nilai: (cocok: RegExpMatchArray) => Record<string, string>
}> = [
  {
    pola: /^Stok "(.*)" tidak cukup \(sisa (\d+), diminta (\d+)\)\.$/,
    kunci: 'galat.stokTidakCukup',
    nilai: (c) => ({ nama: c[1], sisa: c[2], diminta: c[3] }),
  },
  {
    pola: /^Uang dibayar \(Rp([\d.]+)\) kurang dari total \(Rp([\d.]+)\)\.$/,
    kunci: 'galat.uangKurang',
    nilai: (c) => ({ dibayar: c[1], total: c[2] }),
  },
  {
    pola: /^Pembayaran Rp([\d.]+) melebihi sisa hutang Rp([\d.]+)\.$/,
    kunci: 'galat.bayarMelebihiHutang',
    nilai: (c) => ({ bayar: c[1], sisa: c[2] }),
  },
  {
    pola: /^Produk tidak ditemukan: (.+)$/,
    kunci: 'galat.produkTidakDitemukanId',
    nilai: (c) => ({ id: c[1] }),
  },
  {
    pola: /^Pelanggan tidak ditemukan: (.+)$/,
    kunci: 'galat.pelangganTidakDitemukan',
    nilai: (c) => ({ id: c[1] }),
  },
  {
    pola: /^Piutang tidak ditemukan: (.+)$/,
    kunci: 'galat.piutangTidakDitemukan',
    nilai: (c) => ({ id: c[1] }),
  },
  {
    pola: /^Metode bayar tidak dikenal: (.+)$/,
    kunci: 'galat.metodeTidakDikenal',
    nilai: (c) => ({ metode: c[1] }),
  },
  {
    pola: /^Metode bayar "(.*)" tidak tersedia di core \(Bon hanya di modul Pro\)\.$/,
    kunci: 'galat.metodeTidakDiCore',
    nilai: (c) => ({ metode: c[1] }),
  },
]

/**
 * Terjemahkan pesan galat dari database (dan mode demo, yang memakai
 * pesan yang sama) ke bahasa tampilan saat ini. Pesan yang tidak
 * dikenal dikembalikan apa adanya.
 */
export function terjemahkanGalatDb(pesan: string): string {
  for (const [asli, kunci] of GALAT_DB_TETAP) {
    if (pesan === asli) return i18n.t(kunci)
  }
  for (const { pola, kunci, nilai } of GALAT_DB_POLAA) {
    const cocok = pesan.match(pola)
    if (cocok) return i18n.t(kunci, nilai(cocok))
  }
  return pesan
}
