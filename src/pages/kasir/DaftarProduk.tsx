// Daftar produk pada halaman Kasir: judul + badge keranjang,
// cari produk, filter kategori sekali ketuk, dan grid kartu
// produk dengan stepper jumlah. Data dan aksi datang dari
// KasirPage; banner dan pesanBawah adalah slot untuk catatan
// tambahan (di Pro: banner offline dan pesan antrean).

import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { formatRupiah } from '../../lib/format'
import { IconProduk, IconSearch } from '../../components/icons'
import type { Kategori, Produk } from '../../lib/types'

interface QueryProduk {
  data: Produk[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
}

interface Props {
  cari: string
  onCari: (v: string) => void
  kategoriList: Kategori[]
  kategoriId: string | null
  onKategoriId: (id: string | null) => void
  adaTanpaKategori: boolean
  kategoriAktif: Kategori | undefined
  produkQuery: QueryProduk
  produkList: Produk[]
  qtyDiKeranjang: Map<string, number>
  jumlahKeranjang: number
  onTambah: (p: Produk) => void
  onUbahQty: (produkId: string, delta: number) => void
  error: string | null
  banner?: ReactNode
  pesanBawah?: ReactNode
}

export default function DaftarProduk({
  cari,
  onCari,
  kategoriList,
  kategoriId,
  onKategoriId,
  adaTanpaKategori,
  kategoriAktif,
  produkQuery,
  produkList,
  qtyDiKeranjang,
  jumlahKeranjang,
  onTambah,
  onUbahQty,
  error,
  banner,
  pesanBawah,
}: Props) {
  const { t } = useTranslation()

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h1 className="judul-halaman">{t('nav.kasir')}</h1>
        {jumlahKeranjang > 0 && (
          <span className="rounded-md bg-pinus-100 px-2.5 py-1 text-xs font-bold text-pinus-800">
            {t('kasir.itemDiKeranjang', { count: jumlahKeranjang })}
          </span>
        )}
      </div>
      {banner}
      <div className="relative mb-3">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600" />
        <input
          type="search"
          value={cari}
          onChange={(e) => onCari(e.target.value)}
          placeholder={t('kasir.cariProduk')}
          aria-label={t('kasir.cariProduk')}
          className="input pl-11"
        />
      </div>
      {kategoriList.length > 0 && (
        <div
          className="mb-3 flex flex-wrap rounded-lg bg-kertas-gelap p-1"
          role="group"
          aria-label={t('kasir.filterKategori')}
        >
          <button
            type="button"
            onClick={() => onKategoriId(null)}
            aria-pressed={kategoriId === null}
            className={`min-h-11 rounded-lg px-4 text-sm font-bold transition-colors ${
              kategoriId === null
                ? 'bg-pinus-800 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t('umum.semua')}
          </button>
          {kategoriList.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => onKategoriId(k.id)}
              aria-pressed={kategoriId === k.id}
              className={`min-h-11 rounded-lg px-4 text-sm font-bold transition-colors ${
                kategoriId === k.id
                  ? 'bg-pinus-800 text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {k.nama}
            </button>
          ))}
          {adaTanpaKategori && (
            <button
              type="button"
              onClick={() => onKategoriId('tanpa-kategori')}
              aria-pressed={kategoriId === 'tanpa-kategori'}
              className={`min-h-11 rounded-lg px-4 text-sm font-bold transition-colors ${
                kategoriId === 'tanpa-kategori'
                  ? 'bg-pinus-800 text-white'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('umum.tanpaKategori')}
            </button>
          )}
        </div>
      )}
      {produkQuery.isLoading && (
        <p className="text-stone-600">{t('kasir.memuatProduk')}</p>
      )}
      {produkQuery.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('kasir.gagalMemuatProduk', {
            pesan:
              produkQuery.error instanceof Error
                ? produkQuery.error.message
                : t('kasir.terjadiKesalahan'),
          })}
        </p>
      )}
      {produkQuery.data && produkList.length === 0 && (
        <div className="card flex flex-col items-center px-6 py-10 text-center">
          <IconProduk className="h-10 w-10 text-pinus-300" strokeWidth={1.5} />
          <p className="mt-3 font-semibold">
            {cari.trim()
              ? t('kasir.tidakAdaCocok', { cari })
              : kategoriId
                ? t('kasir.tidakAdaDiKategori', {
                    kategori: kategoriAktif?.nama ?? t('umum.tanpaKategori'),
                  })
                : t('kasir.belumAdaProduk')}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {cari.trim()
              ? t('kasir.cobaKataKunciLain')
              : kategoriId
                ? t('kasir.pilihKategoriLain')
                : t('kasir.tambahkanProdukDulu')}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {produkList.map((p) => {
          const qty = qtyDiKeranjang.get(p.id) ?? 0
          const habis = p.stok <= 0
          return (
            <div
              key={p.id}
              className={`card flex min-w-0 flex-col p-3 transition hover:border-pinus-600 sm:p-4 ${
                qty > 0 ? 'border-pinus-600' : ''
              } ${habis ? 'opacity-50' : ''}`}
            >
              <button
                type="button"
                onClick={() => onTambah(p)}
                disabled={habis}
                aria-label={t('kasir.tambahKeKeranjang', { nama: p.nama })}
                className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
              >
                <div className="break-words font-semibold leading-snug">
                  {p.nama}
                </div>
                <div className="mt-1 text-xs text-stone-600">
                  {p.kategori?.nama ?? t('umum.tanpaKategori')} · per {p.satuan}
                </div>
                <div className="mt-2 text-base font-bold text-pinus-700 sm:text-lg">
                  {formatRupiah(p.harga_jual)}
                </div>
                <div
                  className={`mt-1.5 inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    habis
                      ? 'bg-kertas-gelap text-stone-600'
                      : p.stok <= 5
                        ? 'bg-red-100 text-red-700'
                        : 'bg-kertas-gelap text-stone-600'
                  }`}
                >
                  {habis
                    ? t('kasir.stokHabisBadge', { stok: p.stok })
                    : p.stok <= 5
                      ? t('kasir.stokHampirHabis', { stok: p.stok })
                      : t('kasir.stokJumlah', { stok: p.stok })}
                </div>
              </button>
              {qty > 0 && (
                <div className="mt-3 flex items-center gap-1 border-t border-dashed border-garis pt-3">
                  <button
                    type="button"
                    aria-label={t('kasir.kurangiProduk', { nama: p.nama })}
                    onClick={() => onUbahQty(p.id, -1)}
                    className="flex h-11 flex-1 items-center justify-center rounded-lg border border-garis text-xl font-bold hover:bg-kertas-gelap active:scale-95"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-base font-bold">
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label={t('kasir.tambahProduk', { nama: p.nama })}
                    onClick={() => onTambah(p)}
                    className="flex h-11 flex-1 items-center justify-center rounded-lg border border-garis text-xl font-bold hover:bg-kertas-gelap active:scale-95"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 md:hidden">
          {error}
        </p>
      )}
      {pesanBawah}
    </section>
  )
}
