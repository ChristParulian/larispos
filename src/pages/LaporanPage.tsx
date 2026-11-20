// Halaman Laporan: total penjualan harian, estimasi laba
// kotor dari selisih harga jual − harga beli (snapshot di item),
// Top 5 produk terlaris, dan riwayat transaksi dengan detail.
// Transaksi yang dibatalkan tetap tampil di riwayat tapi tidak
// dihitung di ringkasan maupun Top 5. Pembatalan dan pengubahan
// hanya untuk owner. Ubah hanya bisa dalam 24 jam setelah transaksi
// dibuat (ditegakkan juga di database, lihat 009).

import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { batalkanTransaksi, fetchTransaksi } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  formatRupiah,
  formatTanggal,
  labelMetode,
  tanggalHariIni,
} from '../lib/format'
import { IconChevron } from '../components/icons'
import DialogKonfirmasi from '../components/DialogKonfirmasi'

export default function LaporanPage() {
  const { t } = useTranslation()
  // Estimasi laba kotor hanya untuk owner (dihitung dari harga beli).
  const { isOwner } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [tanggal, setTanggal] = useState(tanggalHariIni())
  const [semuaTanggal, setSemuaTanggal] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  // Id transaksi di dialog konfirmasi batal.
  const [dialogBatal, setDialogBatal] = useState<string | null>(null)
  // Pesan sukses dari halaman ubah transaksi (Pro) atau dari batal.
  const [pesan, setPesan] = useState<string | null>(
    () => (location.state as { pesan?: string } | null)?.pesan ?? null,
  )
  const [errorAksi, setErrorAksi] = useState<string | null>(null)
  // Waktu ditangkap sekali saat halaman dibuka: dipakai untuk batas edit
  // 24 jam, supaya render tetap murni dan tombol Ubah tidak berubah di
  // tengah sesi.
  const [sekarang] = useState(() => Date.now())

  const transaksiQuery = useQuery({
    queryKey: ['transaksi', semuaTanggal ? 'semua' : tanggal],
    queryFn: () => fetchTransaksi(semuaTanggal ? undefined : tanggal),
  })

  // Dibungkus useMemo supaya referensinya stabil saat data belum termuat:
  // fallback [] harfiah berubah identitas tiap render dan membuat memo
  // di bawahnya menghitung ulang terus.
  const transaksi = useMemo(
    () => transaksiQuery.data ?? [],
    [transaksiQuery.data],
  )

  const batalMutation = useMutation({
    mutationFn: (id: string) => batalkanTransaksi(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transaksi'] })
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      void queryClient.invalidateQueries({ queryKey: ['log-stok'] })
      setPesan(t('laporan.batalBerhasil'))
      setErrorAksi(null)
      setDetailId(null)
    },
    onError: (err: unknown) => {
      setErrorAksi(
        err instanceof Error ? err.message : t('laporan.gagalMembatalkan'),
      )
    },
  })

  function konfirmasiBatal(id: string) {
    setDialogBatal(id)
  }

  const ringkasan = useMemo(() => {
    let totalPenjualan = 0
    let labaKotor = 0
    let adaHargaBeliKosong = false
    let jumlahDibatalkan = 0
    const perProduk = new Map<
      string,
      { nama: string; qty: number; omzet: number }
    >()

    for (const trx of transaksi) {
      // Transaksi yang dibatalkan tidak dihitung di ringkasan.
      if (trx.status === 'dibatalkan') {
        jumlahDibatalkan++
        continue
      }
      totalPenjualan += trx.total
      for (const it of trx.item_transaksi ?? []) {
        if (it.harga_beli === null || it.harga_beli === undefined) {
          adaHargaBeliKosong = true
        } else {
          labaKotor += (it.harga_jual - it.harga_beli) * it.qty
        }
        const nama = it.produk?.nama ?? t('laporan.produkDihapus')
        const cur = perProduk.get(it.produk_id) ?? { nama, qty: 0, omzet: 0 }
        cur.qty += it.qty
        cur.omzet += it.subtotal
        perProduk.set(it.produk_id, cur)
      }
    }

    const top5 = [...perProduk.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)

    return {
      totalPenjualan,
      labaKotor,
      adaHargaBeliKosong,
      top5,
      jumlahTransaksi: transaksi.length - jumlahDibatalkan,
      jumlahDibatalkan,
    }
  }, [transaksi, t])

  return (
    <div>
      <div className="mb-4">
        <h1 className="judul-halaman">{t('nav.laporan')}</h1>
        <p className="text-sm text-stone-600">{t('laporan.ringkasan')}</p>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1 sm:max-w-64">
          <span className="label">{t('umum.tanggal')}</span>
          <input
            type="date"
            value={tanggal}
            disabled={semuaTanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="input disabled:opacity-50"
          />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-garis bg-white px-4 text-sm font-medium">
          <input
            type="checkbox"
            checked={semuaTanggal}
            onChange={(e) => setSemuaTanggal(e.target.checked)}
            className="h-4 w-4 accent-pinus-700"
          />
          {t('laporan.semuaTanggal')}
        </label>
      </div>

      {pesan && (
        <p className="mb-3 rounded-lg bg-pinus-50 px-4 py-3 text-sm text-pinus-800">
          {pesan}
        </p>
      )}
      {errorAksi && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorAksi}
        </p>
      )}

      {transaksiQuery.isLoading && (
        <p className="text-stone-600">{t('laporan.memuat')}</p>
      )}
      {transaksiQuery.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('laporan.gagalMemuat', {
            pesan:
              transaksiQuery.error instanceof Error
                ? transaksiQuery.error.message
                : t('laporan.terjadiKesalahan'),
          })}
        </p>
      )}

      {!transaksiQuery.isLoading && !transaksiQuery.isError && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4 sm:p-5">
              <p className="eyebrow">
                {semuaTanggal
                  ? t('laporan.totalPenjualanSemua')
                  : t('laporan.totalPenjualanHariIni')}
              </p>
              <div className="mt-2 text-[28px] font-extrabold leading-none tracking-tight">
                {formatRupiah(ringkasan.totalPenjualan)}
              </div>
              <div className="mt-1 text-xs text-stone-600">
                {t('laporan.jumlahTransaksi', {
                  count: ringkasan.jumlahTransaksi,
                  jumlah: ringkasan.jumlahTransaksi,
                })}
                {ringkasan.jumlahDibatalkan > 0 &&
                  t('laporan.dibatalkanTidakDihitung', {
                    jumlah: ringkasan.jumlahDibatalkan,
                  })}
              </div>
            </div>
            {isOwner && (
              <div className="card p-4 sm:p-5">
                <p className="eyebrow">{t('laporan.estimasiLabaKotor')}</p>
                <div className="mt-2 text-[28px] font-extrabold leading-none tracking-tight">
                  {formatRupiah(ringkasan.labaKotor)}
                </div>
                <div className="mt-1 text-xs text-stone-600">
                  {ringkasan.adaHargaBeliKosong
                    ? t('laporan.sebagianTanpaHargaBeli')
                    : t('laporan.selisihHarga')}
                </div>
              </div>
            )}
            <div className="card p-4 sm:p-5">
              <p className="eyebrow">{t('laporan.rataRataPerTransaksi')}</p>
              <div className="mt-2 text-[28px] font-extrabold leading-none tracking-tight">
                {formatRupiah(
                  ringkasan.jumlahTransaksi > 0
                    ? Math.round(
                        ringkasan.totalPenjualan / ringkasan.jumlahTransaksi,
                      )
                    : 0,
                )}
              </div>
              <div className="mt-1 text-xs text-stone-600">
                {t('laporan.rataRataKeterangan')}
              </div>
            </div>
          </div>

          <div className="card mt-4 p-4 sm:p-5">
            <h2 className="text-lg font-bold">{t('laporan.top5')}</h2>
            {ringkasan.top5.length === 0 ? (
              <p className="mt-2 text-sm text-stone-600">
                {t('laporan.belumAdaPenjualanPeriode')}
              </p>
            ) : (
              <ol className="mt-3 space-y-3">
                {ringkasan.top5.map((p, i) => (
                  <li
                    key={p.nama}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-5 shrink-0 text-sm font-extrabold text-pinus-700">
                        {i + 1}
                      </span>
                      <span className="truncate font-medium">{p.nama}</span>
                    </span>
                    <span className="shrink-0 text-stone-600">
                      {t('laporan.terjual', {
                        qty: p.qty,
                        omzet: formatRupiah(p.omzet),
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="card mt-4">
            <h2 className="border-b border-garis px-4 py-4 text-lg font-bold sm:px-5">
              {t('laporan.riwayatTransaksi')}
            </h2>
            {transaksi.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-stone-600 sm:px-5">
                {t('laporan.belumAdaTransaksiPeriode')}
              </p>
            ) : (
              <ul className="divide-y divide-garis">
                {transaksi.map((trx) => {
                  const terbuka = detailId === trx.id
                  return (
                    <li key={trx.id}>
                      <button
                        type="button"
                        onClick={() => setDetailId(terbuka ? null : trx.id)}
                        className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-kertas sm:px-5"
                      >
                        <span className="min-w-0">
                          <span className="font-medium">
                            #{trx.id.slice(0, 8).toUpperCase()}
                          </span>{' '}
                          <span className="text-sm text-stone-600">
                            {formatTanggal(trx.created_at)} ·{' '}
                            {labelMetode(trx.metode_bayar)}
                          </span>
                          {trx.status === 'dibatalkan' && (
                            <span className="ml-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                              {t('laporan.dibatalkan')}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-bold">
                            {formatRupiah(trx.total)}
                          </span>
                          <IconChevron
                            className={`h-4 w-4 text-stone-600 transition-transform ${
                              terbuka ? 'rotate-180' : ''
                            }`}
                          />
                        </span>
                      </button>
                      {terbuka && (
                        <div className="bg-kertas px-4 py-3.5 text-sm sm:px-5">
                          <ul className="space-y-1.5">
                            {(trx.item_transaksi ?? []).map((it) => (
                              <li
                                key={it.id}
                                className="flex justify-between gap-2"
                              >
                                <span className="min-w-0">
                                  {it.produk?.nama ??
                                    t('laporan.produkDihapus')}
                                  , {it.qty} x {formatRupiah(it.harga_jual)}
                                </span>
                                <span className="shrink-0 font-medium">
                                  {formatRupiah(it.subtotal)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <dl className="mt-2.5 space-y-1 border-t border-dashed border-garis pt-2.5">
                            <div className="flex justify-between">
                              <dt>{t('umum.total')}</dt>
                              <dd className="font-bold">
                                {formatRupiah(trx.total)}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>
                                {t('laporan.dibayar', {
                                  metode: labelMetode(trx.metode_bayar),
                                })}
                              </dt>
                              <dd>{formatRupiah(trx.dibayar)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>{t('struk.kembalian')}</dt>
                              <dd>{formatRupiah(trx.kembalian)}</dd>
                            </div>
                          </dl>
                          {isOwner && trx.status !== 'dibatalkan' && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-garis pt-3">
                              {sekarang - new Date(trx.created_at).getTime() <
                              24 * 60 * 60 * 1000 ? (
                                <Link
                                  to={`/transaksi/ubah/${trx.id}`}
                                  className="btn-secondary min-h-10 py-2"
                                >
                                  {t('laporan.ubahTransaksi')}
                                </Link>
                              ) : (
                                <p className="w-full text-sm text-stone-600">
                                  {t('laporan.sudahLebih24Jam')}
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => konfirmasiBatal(trx.id)}
                                disabled={batalMutation.isPending}
                                className="btn-danger-outline min-h-10 py-2"
                              >
                                {batalMutation.isPending
                                  ? t('laporan.membatalkan')
                                  : t('laporan.batalkan')}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
      {dialogBatal && (
        <DialogKonfirmasi
          judul={t('laporan.judulBatal')}
          pesan={t('laporan.konfirmasiBatal')}
          labelKonfirmasi={t('laporan.batalkan')}
          berbahaya
          onKonfirmasi={() => {
            batalMutation.mutate(dialogBatal)
            setDialogBatal(null)
          }}
          onBatal={() => setDialogBatal(null)}
        />
      )}
    </div>
  )
}
