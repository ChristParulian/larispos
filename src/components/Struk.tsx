// Struk digital setelah pembayaran: tampil di layar, bagikan via
// WhatsApp, atau simpan/cetak PDF lewat dialog print browser.
// Saat print, hanya struk yang tercetak (lihat print CSS di index.css).

import { useTranslation } from 'react-i18next'
import type { CartItem, CheckoutResult } from '../lib/types'
import { formatRupiah, formatTanggal, labelMetode } from '../lib/format'
import { linkWhatsApp, teksStruk } from '../lib/receipt'
import { NAMA_TOKO_BAWAAN } from '../lib/api'
import { usePengaturan } from '../lib/usePengaturan'

interface Props {
  items: CartItem[]
  hasil: CheckoutResult
  tanggalIso: string
  onTutup: () => void
  onTransaksiBaru: () => void
}

export default function Struk({
  items,
  hasil,
  tanggalIso,
  onTutup,
  onTransaksiBaru,
}: Props) {
  const { t } = useTranslation()
  const { data: pengaturan } = usePengaturan()
  const namaToko = pengaturan?.nama_toko ?? NAMA_TOKO_BAWAAN
  const teks = teksStruk(items, hasil, tanggalIso, namaToko)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-white shadow-angkat sm:rounded-lg">
        {/* Area struk, satu-satunya yang tercetak. */}
        <div className="print-area px-6 py-6">
          <div className="text-center">
            <h2 className="text-lg font-bold">{namaToko.toUpperCase()}</h2>
            <p className="text-sm text-stone-600">{t('struk.judul')}</p>
            <p className="text-sm text-stone-600">
              {formatTanggal(tanggalIso)}
            </p>
            <p className="text-sm text-stone-600">
              No. {hasil.transaksi_id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <hr className="my-4 border-dashed border-garis" />

          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.produk.id} className="text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{it.produk.nama}</span>
                  <span className="shrink-0">
                    {formatRupiah(it.qty * it.produk.harga_jual)}
                  </span>
                </div>
                <div className="text-stone-600">
                  {it.qty} {it.produk.satuan} x{' '}
                  {formatRupiah(it.produk.harga_jual)}
                </div>
              </li>
            ))}
          </ul>

          <hr className="my-4 border-dashed border-garis" />

          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>{t('umum.total')}</dt>
              <dd className="font-bold">{formatRupiah(hasil.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>
                {t('struk.bayar')} ({labelMetode(hasil.metode_bayar)})
              </dt>
              <dd>{formatRupiah(hasil.dibayar)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('struk.kembalian')}</dt>
              <dd className="font-bold text-pinus-700">
                {formatRupiah(hasil.kembalian)}
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-center text-sm text-stone-600">
            {t('struk.terimaKasih')}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t px-6 py-4 no-print">
          <div className="flex flex-wrap gap-2">
            <a
              href={linkWhatsApp(teks)}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-green-700"
            >
              {t('struk.kirimWhatsApp')}
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-900"
            >
              {t('struk.simpanCetak')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTransaksiBaru}
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-pinus-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pinus-800"
            >
              {t('struk.transaksiBaru')}
            </button>
            <button
              type="button"
              onClick={onTutup}
              className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-garis px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-kertas-gelap"
            >
              {t('umum.tutup')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
