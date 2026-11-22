// Tab Daftar Produk pada halaman Produk: cari + filter kategori,
// daftar produk (tabel di layar besar, kartu di HP), dan form
// tambah stok + opname sebaris. Data dan aksi datang dari ProdukPage.

import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatRupiah } from '../../lib/format'
import { IconPlus, IconProduk, IconSearch } from '../../components/icons'
import FormTambahStok from './FormTambahStok'
import FormOpname from './FormOpname'
import type { Kategori, Produk } from '../../lib/types'

interface QueryProduk {
  data: Produk[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
}

interface Props {
  produkQuery: QueryProduk
  produkTampil: Produk[]
  kategori: Kategori[]
  cari: string
  onCari: (v: string) => void
  filterKategori: string
  onFilterKategori: (v: string) => void
  isOwner: boolean
  sedangFilter: boolean
  stokId: string | null
  onStokId: (id: string | null) => void
  tambahStokPending: boolean
  onTambahStok: (id: string, jumlah: number, catatan?: string) => void
  opnameId: string | null
  onOpnameId: (id: string | null) => void
  opnamePending: boolean
  onOpname: (id: string, stokBaru: number, alasan: string) => void
  onHapus: (id: string, nama: string) => void
}

export default function TabProduk({
  produkQuery,
  produkTampil,
  kategori,
  cari,
  onCari,
  filterKategori,
  onFilterKategori,
  isOwner,
  sedangFilter,
  stokId,
  onStokId,
  tambahStokPending,
  onTambahStok,
  opnameId,
  onOpnameId,
  opnamePending,
  onOpname,
  onHapus,
}: Props) {
  const { t } = useTranslation()

  // Hanya satu form sebaris yang terbuka dalam satu waktu.
  function bukaStok(id: string) {
    onOpnameId(null)
    onStokId(stokId === id ? null : id)
  }

  function bukaOpname(id: string) {
    onStokId(null)
    onOpnameId(opnameId === id ? null : id)
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600" />
          <input
            type="search"
            value={cari}
            onChange={(e) => onCari(e.target.value)}
            placeholder={t('produk.placeholderCari')}
            aria-label={t('produk.placeholderCari')}
            className="input pl-11"
          />
        </div>
        <select
          value={filterKategori}
          onChange={(e) => onFilterKategori(e.target.value)}
          className="input sm:w-52"
          aria-label={t('produk.ariaFilterKategori')}
        >
          <option value="">{t('produk.semuaKategori')}</option>
          {kategori.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </select>
        {isOwner && (
          <Link to="/produk/tambah" className="btn-primary sm:w-auto">
            <IconPlus className="h-5 w-5" strokeWidth={2.2} />
            {t('produk.tambahProduk')}
          </Link>
        )}
      </div>

      {produkQuery.isLoading && (
        <p className="text-stone-600">{t('produk.memuatProduk')}</p>
      )}
      {produkQuery.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('produk.gagalMuatProduk')}{' '}
          {produkQuery.error instanceof Error
            ? produkQuery.error.message
            : t('produk.galatUmum')}
        </p>
      )}
      {produkQuery.data && produkTampil.length === 0 && (
        <div className="card flex flex-col items-center px-6 py-10 text-center">
          <IconProduk className="h-10 w-10 text-pinus-300" strokeWidth={1.5} />
          <p className="mt-3 font-semibold">
            {sedangFilter
              ? t('produk.tidakAdaYangCocok')
              : t('produk.belumAdaProduk')}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {sedangFilter
              ? t('produk.cobaKataKunciLain')
              : isOwner
                ? t('produk.tambahPertama')
                : t('produk.produkOlehOwner')}
          </p>
          {isOwner && !sedangFilter && (
            <Link to="/produk/tambah" className="btn-primary mt-4">
              <IconPlus className="h-5 w-5" strokeWidth={2.2} />
              {t('produk.tambahProduk')}
            </Link>
          )}
        </div>
      )}

      {/* Tabel untuk layar besar, kartu untuk HP */}
      {produkTampil.length > 0 && (
        <div className="card hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-kertas text-left">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">
                  {t('umum.produk')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">
                  {t('umum.kategori')}
                </th>
                {isOwner && (
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">
                    {t('produk.hargaBeli')}
                  </th>
                )}
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">
                  {t('produk.hargaJual')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">
                  {t('umum.stok')}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">
                  {t('produk.aksi')}
                </th>
              </tr>
            </thead>
            <tbody>
              {produkTampil.map((p) => (
                <Fragment key={p.id}>
                  <tr className="border-b transition-colors last:border-0 hover:bg-kertas">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nama}</div>
                      <div className="text-xs text-stone-600">
                        {t('produk.perSatuan', { satuan: p.satuan })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {p.kategori?.nama ?? '-'}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3 text-right">
                        {formatRupiah(p.harga_beli)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatRupiah(p.harga_jual)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold tabular-nums ${
                        p.stok <= 5 ? 'text-red-600' : ''
                      }`}
                    >
                      {p.stok}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => bukaStok(p.id)}
                          className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                        >
                          {t('produk.tambahStok')}
                        </button>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => bukaOpname(p.id)}
                            className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                          >
                            {t('produk.opname')}
                          </button>
                        )}
                        {isOwner && (
                          <>
                            <Link
                              to={`/produk/ubah/${p.id}`}
                              className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                            >
                              {t('umum.ubah')}
                            </Link>
                            <button
                              type="button"
                              onClick={() => onHapus(p.id, p.nama)}
                              className="inline-flex min-h-9 items-center rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              {t('umum.hapus')}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {stokId === p.id && (
                    <tr className="border-b bg-kertas">
                      <td colSpan={isOwner ? 6 : 5} className="px-4 py-4">
                        <FormTambahStok
                          produk={p}
                          sibuk={tambahStokPending}
                          onSimpan={(jumlah, catatan) =>
                            onTambahStok(p.id, jumlah, catatan)
                          }
                          onBatal={() => onStokId(null)}
                        />
                      </td>
                    </tr>
                  )}
                  {opnameId === p.id && (
                    <tr className="border-b bg-kertas">
                      <td colSpan={isOwner ? 6 : 5} className="px-4 py-4">
                        <FormOpname
                          produk={p}
                          sibuk={opnamePending}
                          onSimpan={(stokBaru, alasan) =>
                            onOpname(p.id, stokBaru, alasan)
                          }
                          onBatal={() => onOpnameId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {produkTampil.map((p) => (
          <div key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="break-words font-semibold leading-snug">
                  {p.nama}
                </div>
                <div className="mt-0.5 text-xs text-stone-600">
                  {p.kategori?.nama ?? t('umum.tanpaKategori')} ·{' '}
                  {t('produk.perSatuan', { satuan: p.satuan })}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${
                  p.stok <= 5
                    ? 'bg-red-100 text-red-700'
                    : 'bg-kertas-gelap text-stone-700'
                }`}
              >
                {t('produk.badgeStok', { jumlah: p.stok })}
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
              {isOwner ? (
                <span className="text-stone-600">
                  {t('produk.hargaBeliSingkat', {
                    harga: formatRupiah(p.harga_beli),
                  })}
                </span>
              ) : (
                <span />
              )}
              <span className="text-base font-bold text-pinus-700">
                {formatRupiah(p.harga_jual)}
              </span>
            </div>
            {isOwner && (
              <div className="mt-3 flex gap-2">
                <Link
                  to={`/produk/ubah/${p.id}`}
                  className="btn-secondary min-h-10 flex-1 py-2"
                >
                  {t('umum.ubah')}
                </Link>
                <button
                  type="button"
                  onClick={() => onHapus(p.id, p.nama)}
                  className="btn-danger-outline min-h-10 flex-1 py-2"
                >
                  {t('umum.hapus')}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => bukaStok(p.id)}
              className="btn-secondary mt-2 min-h-11 w-full py-2"
            >
              {t('produk.tambahStok')}
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => bukaOpname(p.id)}
                className="btn-secondary mt-2 min-h-11 w-full py-2"
              >
                {t('produk.opname')}
              </button>
            )}
            {stokId === p.id && (
              <div className="mt-3 border-t border-dashed border-garis pt-3">
                <FormTambahStok
                  produk={p}
                  sibuk={tambahStokPending}
                  onSimpan={(jumlah, catatan) =>
                    onTambahStok(p.id, jumlah, catatan)
                  }
                  onBatal={() => onStokId(null)}
                />
              </div>
            )}
            {opnameId === p.id && (
              <div className="mt-3 border-t border-dashed border-garis pt-3">
                <FormOpname
                  produk={p}
                  sibuk={opnamePending}
                  onSimpan={(stokBaru, alasan) =>
                    onOpname(p.id, stokBaru, alasan)
                  }
                  onBatal={() => onOpnameId(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
