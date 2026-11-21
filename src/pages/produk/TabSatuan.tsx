// Tab Satuan pada halaman Produk: tambah satuan, ubah nama
// sebaris, dan hapus. Data dan aksi datang dari ProdukPage.

import { useTranslation } from 'react-i18next'
import { IconPlus } from '../../components/icons'
import type { Satuan } from '../../lib/types'

interface QuerySatuan {
  data: Satuan[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
}

interface SimpanSatuan {
  mutate: (input: { nama: string; id?: string }) => void
  isPending: boolean
}

interface Props {
  satuanQuery: QuerySatuan
  jumlahProdukSatuan: Map<string, number>
  isOwner: boolean
  namaSatuanBaru: string
  onNamaSatuanBaru: (v: string) => void
  editSatuanId: string | null
  onEditSatuanId: (id: string | null) => void
  editSatuanNama: string
  onEditSatuanNama: (v: string) => void
  simpan: SimpanSatuan
  onHapus: (id: string, nama: string) => void
  onBersihkanGalat: () => void
}

export default function TabSatuan({
  satuanQuery,
  jumlahProdukSatuan,
  isOwner,
  namaSatuanBaru,
  onNamaSatuanBaru,
  editSatuanId,
  onEditSatuanId,
  editSatuanNama,
  onEditSatuanNama,
  simpan,
  onHapus,
  onBersihkanGalat,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="card">
      <div className="border-b px-4 py-4 sm:px-5">
        <h2 className="font-bold">{t('produk.judulSatuan')}</h2>
        <p className="text-sm text-stone-600">{t('produk.keteranganSatuan')}</p>
      </div>
      {isOwner && (
        <form
          className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:px-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!namaSatuanBaru.trim()) return
            simpan.mutate({ nama: namaSatuanBaru })
          }}
        >
          <input
            type="text"
            value={namaSatuanBaru}
            onChange={(e) => onNamaSatuanBaru(e.target.value)}
            placeholder={t('produk.namaSatuanBaru')}
            aria-label={t('produk.namaSatuanBaru')}
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!namaSatuanBaru.trim() || simpan.isPending}
            className="btn-primary sm:w-auto"
          >
            <IconPlus className="h-5 w-5" strokeWidth={2.2} />
            {t('produk.tambahSatuan')}
          </button>
        </form>
      )}
      {satuanQuery.isLoading && (
        <p className="px-4 py-4 text-stone-600 sm:px-5">
          {t('produk.memuatSatuan')}
        </p>
      )}
      {satuanQuery.isError && (
        <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
          {t('produk.gagalMuatSatuan')}{' '}
          {satuanQuery.error instanceof Error
            ? satuanQuery.error.message
            : t('produk.galatUmum')}
        </p>
      )}
      {satuanQuery.data && satuanQuery.data.length === 0 && (
        <p className="px-4 py-4 text-stone-600 sm:px-5">
          {isOwner
            ? t('produk.belumAdaSatuanOwner')
            : t('produk.belumAdaSatuan')}
        </p>
      )}
      <ul className="divide-y divide-garis">
        {(satuanQuery.data ?? []).map((s) => {
          const jumlah = jumlahProdukSatuan.get(s.nama) ?? 0
          const sedangUbah = editSatuanId === s.id
          return (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-sm sm:px-5"
            >
              {sedangUbah ? (
                <form
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!editSatuanNama.trim()) return
                    simpan.mutate({
                      nama: editSatuanNama,
                      id: s.id,
                    })
                  }}
                >
                  <input
                    type="text"
                    value={editSatuanNama}
                    onChange={(e) => onEditSatuanNama(e.target.value)}
                    aria-label={t('produk.ariaNamaSatuan')}
                    className="input min-w-40 flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!editSatuanNama.trim() || simpan.isPending}
                    className="inline-flex min-h-9 items-center rounded-lg bg-pinus-700 px-3 text-xs font-bold text-white hover:bg-pinus-800 disabled:opacity-50"
                  >
                    {t('umum.simpan')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onEditSatuanId(null)
                      onEditSatuanNama('')
                    }}
                    className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                  >
                    {t('umum.batal')}
                  </button>
                </form>
              ) : (
                <>
                  <div className="min-w-0">
                    <div className="break-words font-medium">{s.nama}</div>
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
                          onEditSatuanId(s.id)
                          onEditSatuanNama(s.nama)
                          onBersihkanGalat()
                        }}
                        className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                      >
                        {t('umum.ubah')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onHapus(s.id, s.nama)}
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
