// Struk digital: teks untuk WhatsApp + data untuk tampilan / cetak PDF.
// Printer thermal tidak dipakai (spec) — struk tampil di layar,
// dibagikan lewat WhatsApp, atau disimpan sebagai PDF lewat print browser.

import type { CartItem, CheckoutResult } from './types'
import { formatRupiah, formatTanggal, labelMetode } from './format'

export function teksStruk(
  items: CartItem[],
  hasil: CheckoutResult,
  tanggalIso: string,
): string {
  const garis = '------------------------------'
  const baris = items
    .map(
      (it) =>
        `${it.produk.nama}\n  ${it.qty} x ${formatRupiah(it.produk.harga_jual)} = ${formatRupiah(it.qty * it.produk.harga_jual)}`,
    )
    .join('\n')
  return [
    'LARISPOS — WARUNG',
    'Struk Belanja',
    formatTanggal(tanggalIso),
    `No. ${hasil.transaksi_id.slice(0, 8).toUpperCase()}`,
    garis,
    baris,
    garis,
    `Total      : ${formatRupiah(hasil.total)}`,
    `Bayar (${labelMetode(hasil.metode_bayar)}) : ${formatRupiah(hasil.dibayar)}`,
    `Kembalian  : ${formatRupiah(hasil.kembalian)}`,
    garis,
    'Terima kasih sudah belanja!',
  ].join('\n')
}

/** Link wa.me untuk membagikan teks struk via WhatsApp. */
export function linkWhatsApp(teks: string): string {
  return `https://wa.me/?text=${encodeURIComponent(teks)}`
}
