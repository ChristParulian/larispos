// Tab Kategori pada halaman Produk: tambah kategori, ubah nama
// sebaris, dan hapus. Data dan aksi datang dari ProdukPage.

import { useTranslation } from 'react-i18next'
import { IconPlus } from '../../components/icons'
import type { Kategori } from '../../lib/types'

interface QueryKategori {
  data: Kategori[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
}

interface SimpanKategori {
  mutate: (input: { nama: string; id?: string }) => void
  isPending: boolean
}

interface Props {
  kategoriQuery: QueryKategori
  jumlahProduk: Map<string, number>
  isOwner: boolean
  namaBaru: string
  onNamaBaru: (v: string) => void
  editId: string | null
  onEditId: (id: string | null) => void
  editNama: string
  onEditNama: (v: string) => void
  simpan: SimpanKategori
  onHapus: (id: string, nama: string) => void
  onBersihkanGalat: () => void
}

export default function TabKategori({
  kategoriQuery,
  jumlahProduk,
  isOwner,
  namaBaru,
  onNamaBaru,
  editId,
  onEditId,
  editNama,
  onEditNama,
  simpan,
  onHapus,
  onBersihkanGalat,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="card">
      <div className="border-b px-4 py-4 sm:px-5">
        <h2 className="font-bold">{t('produk.judulKategori')}</h2>
        <p className="text-sm text-stone-600">
          {t('produk.keteranganKategori')}
        </p>
      </div>
      {isOwner && (
        <form
          className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:px-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!namaBaru.trim()) return
            simpan.mutate({ nama: namaBaru })
          }}
        >
          <input
            type="text"
            value={namaBaru}
            onChange={(e) => onNamaBaru(e.target.value)}
            placeholder={t('produk.namaKategoriBaru')}
            aria-label={t('produk.namaKategoriBaru')}
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!namaBaru.trim() || simpan.isPending}
            className="btn-primary sm:w-auto"
          >
            <IconPlus className="h-5 w-5" strokeWidth={2.2} />
            {t('produk.tambahKategori')}
          </button>
        </form>
      )}
      {kategoriQuery.isLoading && (
        <p className="px-4 py-4 text-stone-600 sm:px-5">
          {t('produk.memuatKategori')}
        </p>
      )}
      {kategoriQuery.isError && (
        <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
          {t('produk.gagalMuatKategori')}{' '}
          {kategoriQuery.error instanceof Error
            ? kategoriQuery.error.message
            : t('produk.galatUmum')}
        </p>
      )}
      {kategoriQuery.data && kategoriQuery.data.length === 0 && (
        <p className="px-4 py-4 text-stone-600 sm:px-5">
          {isOwner
            ? t('produk.belumAdaKategoriOwner')
            : t('produk.belumAdaKategori')}
        </p>
      )}
      <ul className="divide-y divide-garis">
        {(kategoriQuery.data ?? []).map((k) => {
          const jumlah = jumlahProduk.get(k.id) ?? 0
          const sedangUbah = editId === k.id
          return (
            <li
              key={k.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-sm sm:px-5"
            >
              {sedangUbah ? (
                <form
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!editNama.trim()) return
                    simpan.mutate({
                      nama: editNama,
                      id: k.id,
                    })
                  }}
                >
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => onEditNama(e.target.value)}
                    aria-label={t('produk.ariaNamaKategori')}
                    className="input min-w-40 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!editNama.trim() || simpan.isPending}
                    className="inline-flex min-h-9 items-center rounded-lg bg-pinus-700 px-3 text-xs font-bold text-white hover:bg-pinus-800 disabled:opacity-50"
                  >
                    {t('umum.simpan')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEditId(null)
                      onEditNama('')
                    }}
                    className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                  >
                    {t('umum.batal')}
                  </button>
                </form>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="break-words font-medium">{k.nama}</div>
                    <div className="text-xs text-stone-600">
                      {jumlah === 0
                        ? t('produk.belumAdaProdukRow')
                        : t('produk.jumlahProduk', { count: jumlah })}
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onEditId(k.id)
                          onEditNama(k.nama)
                          onBersihkanGalat()
                        }}
                        className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                      >
                        {t('umum.ubah')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onHapus(k.id, k.nama)}
                        className="inline-flex min-h-9 items-center rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        {t('umum.hapus')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
