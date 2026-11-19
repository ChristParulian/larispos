// Halaman Laporan: total penjualan harian, estimasi laba
// kotor dari selisih harga jual − harga beli (snapshot di item),
// Top 5 produk terlaris, dan riwayat transaksi dengan detail.
// Transaksi yang dibatalkan tetap tampil di riwayat tapi tidak
// dihitung di ringkasan maupun Top 5. Pembatalan hanya untuk owner.

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { batalkanTransaksi, fetchTransaksi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatRupiah, formatTanggal, labelMetode, tanggalHariIni } from '../lib/format'
import { IconChevron } from '../components/icons'

export default function LaporanPage() {
  // Estimasi laba kotor hanya untuk owner (dihitung dari harga beli).
  const { isOwner } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [tanggal, setTanggal] = useState(tanggalHariIni())
  const [semuaTanggal, setSemuaTanggal] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  // Pesan sukses dari halaman ubah transaksi (Pro) atau dari batal.
  const [pesan, setPesan] = useState<string | null>(
    () =>
      (location.state as { pesan?: string } | null)?.pesan ?? null,
  )
  const [errorAksi, setErrorAksi] = useState<string | null>(null)

  const transaksiQuery = useQuery({
    queryKey: ['transaksi', semuaTanggal ? 'semua' : tanggal],
    queryFn: () => fetchTransaksi(semuaTanggal ? undefined : tanggal),
  })

  const transaksi = transaksiQuery.data ?? []

  const batalMutation = useMutation({
    mutationFn: (id: string) => batalkanTransaksi(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transaksi'] })
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      void queryClient.invalidateQueries({ queryKey: ['log-stok'] })
      setPesan('Transaksi berhasil dibatalkan. Stok sudah dikembalikan.')
      setErrorAksi(null)
      setDetailId(null)
    },
    onError: (err: unknown) => {
      setErrorAksi(
        err instanceof Error ? err.message : 'Gagal membatalkan transaksi.',
      )
    },
  })

  function konfirmasiBatal(id: string) {
    if (
      window.confirm(
        'Batalkan transaksi ini? Stok semua item akan dikembalikan, dan transaksi tidak lagi dihitung di laporan.',
      )
    ) {
      batalMutation.mutate(id)
    }
  }

  const ringkasan = useMemo(() => {
    let totalPenjualan = 0
    let labaKotor = 0
    let adaHargaBeliKosong = false
    let jumlahDibatalkan = 0
    const perProduk = new Map<string, { nama: string; qty: number; omzet: number }>()

    for (const t of transaksi) {
      // Transaksi yang dibatalkan tidak dihitung di ringkasan.
      if (t.status === 'dibatalkan') {
        jumlahDibatalkan++
        continue
      }
      totalPenjualan += t.total
      for (const it of t.item_transaksi ?? []) {
        if (it.harga_beli === null || it.harga_beli === undefined) {
          adaHargaBeliKosong = true
        } else {
          labaKotor += (it.harga_jual - it.harga_beli) * it.qty
        }
        const nama = it.produk?.nama ?? 'Produk dihapus'
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
  }, [transaksi])

  return (
    <div>
      <div className="mb-4">
        <h1 className="judul-halaman">Laporan</h1>
        <p className="text-sm text-stone-600">
          Ringkasan penjualan dan riwayat transaksi.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1 sm:max-w-64">
          <span className="label">Tanggal</span>
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
          Semua tanggal
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
        <p className="text-stone-600">Memuat laporan…</p>
      )}
      {transaksiQuery.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat laporan:{' '}
          {transaksiQuery.error instanceof Error
            ? transaksiQuery.error.message
            : 'terjadi kesalahan.'}
        </p>
      )}

      {!transaksiQuery.isLoading && !transaksiQuery.isError && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4 sm:p-5">
              <p className="eyebrow">
                Total Penjualan {semuaTanggal ? '(semua)' : 'Hari Ini'}
              </p>
              <div className="mt-2 text-[28px] font-extrabold leading-none tracking-tight">
                {formatRupiah(ringkasan.totalPenjualan)}
              </div>
              <div className="mt-1 text-xs text-stone-600">
                {ringkasan.jumlahTransaksi} transaksi
                {ringkasan.jumlahDibatalkan > 0 &&
                  ` · ${ringkasan.jumlahDibatalkan} dibatalkan tidak dihitung`}
              </div>
            </div>
            {isOwner && (
              <div className="card p-4 sm:p-5">
                <p className="eyebrow">Estimasi Laba Kotor</p>
                <div className="mt-2 text-[28px] font-extrabold leading-none tracking-tight">
                  {formatRupiah(ringkasan.labaKotor)}
                </div>
                <div className="mt-1 text-xs text-stone-600">
                  {ringkasan.adaHargaBeliKosong
                    ? 'Sebagian item tanpa harga beli, tidak dihitung dalam laba.'
                    : 'Selisih harga jual − harga beli per item terjual.'}
                </div>
              </div>
            )}
            <div className="card p-4 sm:p-5">
              <p className="eyebrow">Rata-rata per Transaksi</p>
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
                Total penjualan ÷ jumlah transaksi.
              </div>
            </div>
          </div>

          <div className="card mt-4 p-4 sm:p-5">
            <h2 className="text-lg font-bold">Top 5 Produk Terlaris</h2>
            {ringkasan.top5.length === 0 ? (
              <p className="mt-2 text-sm text-stone-600">
                Belum ada penjualan pada periode ini.
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
                      {p.qty} terjual · {formatRupiah(p.omzet)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="card mt-4">
            <h2 className="border-b border-garis px-4 py-4 text-lg font-bold sm:px-5">
              Riwayat Transaksi
            </h2>
            {transaksi.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-stone-600 sm:px-5">
                Belum ada transaksi pada periode ini.
              </p>
            ) : (
              <ul className="divide-y divide-garis">
                {transaksi.map((t) => {
                  const terbuka = detailId === t.id
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setDetailId(terbuka ? null : t.id)
                        }
                        className="flex min-h-16 w-full flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-kertas sm:px-5"
                      >
                        <span className="min-w-0">
                          <span className="font-medium">
                            #{t.id.slice(0, 8).toUpperCase()}
                          </span>{' '}
                          <span className="text-sm text-stone-600">
                            {formatTanggal(t.created_at)} ·{' '}
                            {labelMetode(t.metode_bayar)}
                          </span>
                          {t.status === 'dibatalkan' && (
                            <span className="ml-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                              Dibatalkan
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="font-bold">
                            {formatRupiah(t.total)}
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
                            {(t.item_transaksi ?? []).map((it) => (
                              <li
                                key={it.id}
                                className="flex justify-between gap-2"
                              >
                                <span className="min-w-0">
                                  {it.produk?.nama ?? 'Produk dihapus'},{' '}
                                  {it.qty} x {formatRupiah(it.harga_jual)}
                                </span>
                                <span className="shrink-0 font-medium">
                                  {formatRupiah(it.subtotal)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <dl className="mt-2.5 space-y-1 border-t border-dashed border-garis pt-2.5">
                            <div className="flex justify-between">
                              <dt>Total</dt>
                              <dd className="font-bold">
                                {formatRupiah(t.total)}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Dibayar ({labelMetode(t.metode_bayar)})</dt>
                              <dd>{formatRupiah(t.dibayar)}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt>Kembalian</dt>
                              <dd>{formatRupiah(t.kembalian)}</dd>
                            </div>
                          </dl>
                          {isOwner && t.status !== 'dibatalkan' && (
                            <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-garis pt-3">
                              <button
                                type="button"
                                onClick={() => konfirmasiBatal(t.id)}
                                disabled={batalMutation.isPending}
                                className="btn-danger-outline min-h-10 py-2"
                              >
                                {batalMutation.isPending
                                  ? 'Membatalkan…'
                                  : 'Batalkan Transaksi'}
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
    </div>
  )
}
