// Struk digital: teks untuk WhatsApp + data untuk tampilan / cetak PDF.
// Printer thermal tidak dipakai (spec), struk tampil di layar,
// dibagikan lewat WhatsApp, atau disimpan sebagai PDF lewat print browser.

import type { CartItem, CheckoutResult } from './types'
import { formatRupiah, formatTanggal, labelMetode } from './format'
import i18n from './i18n'

export function teksStruk(
  items: CartItem[],
  hasil: CheckoutResult,
  tanggalIso: string,
  namaToko = 'LarisPOS',
): string {
  const garis = '------------------------------'
  const baris = items
    .map(
      (it) =>
        `${it.produk.nama}\n  ${it.qty} x ${formatRupiah(it.produk.harga_jual)} = ${formatRupiah(it.qty * it.produk.harga_jual)}`,
    )
    .join('\n')
  return [
    namaToko.toUpperCase(),
    i18n.t('struk.judul'),
    formatTanggal(tanggalIso),
    `No. ${hasil.transaksi_id.slice(0, 8).toUpperCase()}`,
    garis,
    baris,
    garis,
    `${i18n.t('umum.total').padEnd(11)}: ${formatRupiah(hasil.total)}`,
    `${i18n.t('struk.bayar')} (${labelMetode(hasil.metode_bayar)}) : ${formatRupiah(hasil.dibayar)}`,
    `${i18n.t('struk.kembalian').padEnd(11)}: ${formatRupiah(hasil.kembalian)}`,
    garis,
    i18n.t('struk.terimaKasih'),
  ].join('\n')
}

/** Link wa.me untuk membagikan teks struk via WhatsApp. */
export function linkWhatsApp(teks: string): string {
  return `https://wa.me/?text=${encodeURIComponent(teks)}`
}
