// Tab Log Stok pada halaman Produk: 100 pergerakan stok terakhir.
// Data datang dari ProdukPage.

import { useTranslation } from 'react-i18next'
import { formatTanggal } from '../../lib/format'
import type { LogStok } from '../../lib/types'

interface QueryLog {
  data: LogStok[] | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
}

interface Props {
  logQuery: QueryLog
}

export default function TabLogStok({ logQuery }: Props) {
  const { t } = useTranslation()

  // Alasan log yang dikenal diterjemahkan; catatan bebas pengguna
  // ditampilkan apa adanya. Log opname menyimpan alasannya
  // setelah awalan 'opname: '.
  function alasanTampil(alasan: string): string {
    if (alasan.startsWith('opname: ')) {
      return `${t('produk.alasanOpname')}: ${alasan.slice('opname: '.length)}`
    }
    switch (alasan) {
      case 'penjualan':
        return t('produk.alasanPenjualan')
      case 'restock':
        return t('produk.alasanRestock')
      case 'batal transaksi':
        return t('produk.alasanBatal')
      case 'ubah transaksi':
        return t('produk.alasanUbah')
      case 'pembelian':
        return t('produk.alasanPembelian')
      default:
        return alasan
    }
  }

  return (
    <div className="card">
      <div className="border-b px-4 py-4 sm:px-5">
        <h2 className="font-bold">{t('produk.judulLog')}</h2>
        <p className="text-sm text-stone-600">{t('produk.keteranganLog')}</p>
      </div>
      {logQuery.isLoading && (
        <p className="px-4 py-4 text-stone-600 sm:px-5">
          {t('produk.memuatLog')}
        </p>
      )}
      {logQuery.isError && (
        <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
          {t('produk.gagalMuatLog')}{' '}
          {logQuery.error instanceof Error
            ? logQuery.error.message
            : t('produk.galatUmum')}
        </p>
      )}
      {logQuery.data && logQuery.data.length === 0 && (
        <p className="px-4 py-4 text-stone-600 sm:px-5">
          {t('produk.belumAdaPergerakan')}
        </p>
      )}
      <ul className="divide-y divide-garis">
        {(logQuery.data ?? []).map((l) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-sm sm:px-5"
          >
            <div className="min-w-0">
              <div className="break-words font-medium">
                {l.produk?.nama ?? t('produk.produkDihapusLabel')}
              </div>
              <div className="text-xs text-stone-600">
                {formatTanggal(l.created_at)} · {alasanTampil(l.alasan)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={`font-bold ${
                  l.perubahan < 0 ? 'text-red-600' : 'text-pinus-700'
                }`}
              >
                {l.perubahan > 0 ? `+${l.perubahan}` : l.perubahan}
              </span>
              <div className="text-xs text-stone-600">
                {l.stok_sebelum} → {l.stok_sesudah}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
