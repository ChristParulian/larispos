// Struk digital setelah pembayaran: tampil di layar, bagikan via
// WhatsApp, atau simpan/cetak PDF lewat dialog print browser.
// Saat print, hanya struk yang tercetak (lihat print CSS di index.css).

import type { CartItem, CheckoutResult } from '../lib/types'
import { formatRupiah, formatTanggal, labelMetode } from '../lib/format'
import { linkWhatsApp, teksStruk } from '../lib/receipt'

interface Props {
  items: CartItem[]
  hasil: CheckoutResult
  tanggalIso: string
  onTutup: () => void
  onTransaksiBaru: () => void
}

export default function Struk({ items, hasil, tanggalIso, onTutup, onTransaksiBaru }: Props) {
  const teks = teksStruk(items, hasil, tanggalIso)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* Area struk — satu-satunya yang tercetak. */}
        <div className="print-area px-6 py-6">
          <div className="text-center">
            <h2 className="text-lg font-bold">LARISPOS — WARUNG</h2>
            <p className="text-sm text-stone-500">Struk Belanja</p>
            <p className="text-sm text-stone-500">{formatTanggal(tanggalIso)}</p>
            <p className="text-sm text-stone-500">
              No. {hasil.transaksi_id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <hr className="my-4 border-dashed border-stone-300" />

          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.produk.id} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{it.produk.nama}</span>
                  <span className="shrink-0">
                    {formatRupiah(it.qty * it.produk.harga_jual)}
                  </span>
                </div>
                <div className="text-stone-500">
                  {it.qty} {it.produk.satuan} x{' '}
                  {formatRupiah(it.produk.harga_jual)}
                </div>
              </li>
            ))}
          </ul>

          <hr className="my-4 border-dashed border-stone-300" />

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Total</dt>
              <dd className="font-bold">{formatRupiah(hasil.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Bayar ({labelMetode(hasil.metode_bayar)})</dt>
              <dd>{formatRupiah(hasil.dibayar)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Kembalian</dt>
              <dd className="font-bold text-emerald-700">
                {formatRupiah(hasil.kembalian)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-center text-sm text-stone-500">
            Terima kasih sudah belanja!
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t px-6 py-4 no-print">
          <div className="flex flex-wrap gap-2">
            <a
              href={linkWhatsApp(teks)}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-green-700"
            >
              Kirim via WhatsApp
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-900"
            >
              Simpan / Cetak PDF
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTransaksiBaru}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Transaksi Baru
            </button>
            <button
              type="button"
              onClick={onTutup}
              className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
