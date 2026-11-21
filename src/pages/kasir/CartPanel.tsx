// Panel keranjang pada halaman Kasir: isi keranjang, metode
// bayar, uang dibayar + tombol uang cepat, dan tombol Bayar.
// Dipakai panel samping (layar besar) dan panel bawah (HP)
// dengan state yang sama.

import { useTranslation } from 'react-i18next'
import { formatRupiah, labelMetode } from '../../lib/format'
import type { CartItem } from '../../lib/types'

export interface CartPanelProps {
  keranjang: CartItem[]
  onUbahQty: (produkId: string, delta: number) => void
  onKosongkan: () => void
  total: number
  metode: 'tunai' | 'qris'
  onMetode: (m: 'tunai' | 'qris') => void
  dibayar: string
  onDibayar: (v: string) => void
  dibayarNum: number
  kembalian: number
  uangKurang: boolean
  error: string | null
  bayarPending: boolean
  onBayar: () => void
}

/** Nominal tombol uang cepat: pecahan 10/20/50/100 ribu yang
    cukup membayar total, jadi kasir tidak perlu mengetuk nominal
    yang ujungnya kurang. Kalau total di atas 100 ribu, tawarkan
    pembulatan ke atas (kelipatan 50 ribu dan 100 ribu). */
function saranBayar(total: number): number[] {
  const pecahan = [10000, 20000, 50000, 100000].filter((n) => n >= total)
  if (pecahan.length > 0) return pecahan
  const ke50 = Math.ceil(total / 50000) * 50000
  const ke100 = Math.ceil(total / 100000) * 100000
  return ke50 === ke100 ? [ke100] : [ke50, ke100]
}

/** Isi keranjang + pembayaran, dipakai panel samping (desktop)
    dan panel bawah (HP) dengan state yang sama. */
export default function CartPanel(props: CartPanelProps) {
  const {
    keranjang,
    onUbahQty,
    onKosongkan,
    total,
    metode,
    onMetode,
    dibayar,
    onDibayar,
    dibayarNum,
    kembalian,
    uangKurang,
    error,
    bayarPending,
    onBayar,
  } = props
  const { t } = useTranslation()

  return (
    <div>
      {keranjang.length === 0 ? (
        <p className="mt-1 text-sm text-stone-600">
          {t('kasir.keranjangKosong')}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {keranjang.map((it) => (
            <li key={it.produk.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {it.produk.nama}
                </div>
                <div className="text-xs text-stone-600">
                  {formatRupiah(it.produk.harga_jual)} / {it.produk.satuan}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={t('kasir.kurangiProduk', {
                    nama: it.produk.nama,
                  })}
                  onClick={() => onUbahQty(it.produk.id, -1)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-garis text-xl font-bold hover:bg-kertas-gelap active:scale-95"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm font-semibold">
                  {it.qty}
                </span>
                <button
                  type="button"
                  aria-label={t('kasir.tambahProduk', { nama: it.produk.nama })}
                  onClick={() => onUbahQty(it.produk.id, 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-garis text-xl font-bold hover:bg-kertas-gelap active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="w-20 shrink-0 text-right text-sm font-semibold">
                {formatRupiah(it.qty * it.produk.harga_jual)}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-dashed border-garis pt-3">
        <div className="flex justify-between text-lg">
          <span className="font-semibold">{t('umum.total')}</span>
          <span className="font-bold text-pinus-700">
            {formatRupiah(total)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-sm font-medium">{t('kasir.metodeBayar')}</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(
            [
              { value: 'tunai', label: labelMetode('tunai') },
              { value: 'qris', label: labelMetode('qris') },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onMetode(m.value)}
              className={`min-h-11 rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors ${
                metode === m.value
                  ? 'border-pinus-700 bg-pinus-50 text-pinus-800'
                  : 'border-garis text-stone-600 hover:bg-kertas'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {metode === 'tunai' ? (
        <div className="mt-4">
          <label htmlFor="dibayar" className="text-sm font-medium">
            {t('kasir.uangDibayar')}
          </label>
          <input
            id="dibayar"
            type="text"
            inputMode="numeric"
            value={dibayar}
            onChange={(e) => onDibayar(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            className="input mt-1.5 text-lg font-semibold"
          />
          <div className="mt-2 flex justify-between text-base">
            <span>{t('struk.kembalian')}</span>
            <span
              className={`font-bold ${uangKurang ? 'text-red-600' : 'text-pinus-700'}`}
            >
              {uangKurang
                ? t('kasir.kurang', {
                    jumlah: formatRupiah(total - dibayarNum),
                  })
                : formatRupiah(kembalian)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {saranBayar(total).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onDibayar(String(n))}
                aria-label={t('kasir.bayarNominal', {
                  jumlah: formatRupiah(n),
                })}
                className="min-h-11 rounded-lg border border-garis px-3 py-2 text-sm font-semibold hover:bg-kertas-gelap"
              >
                {formatRupiah(n)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onDibayar(String(total))}
              disabled={total === 0}
              className="min-h-11 rounded-lg border border-aksen-600 px-3 py-2 text-sm font-bold text-aksen-700 hover:bg-aksen-100 disabled:opacity-50"
            >
              {t('kasir.uangPas')}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-kertas-gelap px-3 py-2.5 text-sm text-stone-600">
          {t('kasir.catatanQris')}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onKosongkan}
          disabled={keranjang.length === 0}
          className="btn-secondary flex-none px-4"
        >
          {t('kasir.kosongkan')}
        </button>
        <button
          type="button"
          onClick={onBayar}
          disabled={
            keranjang.length === 0 ||
            bayarPending ||
            (metode === 'tunai' && dibayarNum < total)
          }
          className="btn-primary min-h-12 flex-1 text-base"
        >
          {bayarPending ? t('kasir.memproses') : t('kasir.bayar')}
        </button>
      </div>
    </div>
  )
}
