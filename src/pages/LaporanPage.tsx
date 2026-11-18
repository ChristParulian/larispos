// Halaman Laporan (Gratis): total penjualan harian, estimasi laba
// kotor dari selisih harga jual − harga beli (snapshot di item),
// Top 5 produk terlaris, dan riwayat transaksi dengan detail.

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTransaksi } from '../lib/api'
import { formatRupiah, formatTanggal, labelMetode, tanggalHariIni } from '../lib/format'

export default function LaporanPage() {
  const [tanggal, setTanggal] = useState(tanggalHariIni())
  const [semuaTanggal, setSemuaTanggal] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const transaksiQuery = useQuery({
    queryKey: ['transaksi', semuaTanggal ? 'semua' : tanggal],
    queryFn: () => fetchTransaksi(semuaTanggal ? undefined : tanggal),
  })

  const transaksi = transaksiQuery.data ?? []

  const ringkasan = useMemo(() => {
    let totalPenjualan = 0
    let labaKotor = 0
    let adaHargaBeliKosong = false
    const perProduk = new Map<string, { nama: string; qty: number; omzet: number }>()

    for (const t of transaksi) {
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

    return { totalPenjualan, labaKotor, adaHargaBeliKosong, top5, jumlahTransaksi: transaksi.length }
  }, [transaksi])

  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">Laporan</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          Tanggal
          <input
            type="date"
            value={tanggal}
            disabled={semuaTanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 disabled:opacity-50"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={semuaTanggal}
            onChange={(e) => setSemuaTanggal(e.target.checked)}
          />
          Semua tanggal
        </label>
      </div>

      {transaksiQuery.isLoading && (
        <p className="text-stone-500">Memuat laporan…</p>
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
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-stone-500">
                Total Penjualan {semuaTanggal ? '(semua)' : 'Hari Ini'}
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">
                {formatRupiah(ringkasan.totalPenjualan)}
              </div>
              <div className="mt-1 text-xs text-stone-500">
                {ringkasan.jumlahTransaksi} transaksi
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-stone-500">
                Estimasi Laba Kotor
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">
                {formatRupiah(ringkasan.labaKotor)}
              </div>
              <div className="mt-1 text-xs text-stone-500">
                {ringkasan.adaHargaBeliKosong
                  ? 'Sebagian item tanpa harga beli — tidak dihitung dalam laba.'
                  : 'Selisih harga jual − harga beli per item terjual.'}
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="text-sm text-stone-500">
                Rata-rata per Transaksi
              </div>
              <div className="mt-1 text-2xl font-bold">
                {formatRupiah(
                  ringkasan.jumlahTransaksi > 0
                    ? Math.round(
                        ringkasan.totalPenjualan / ringkasan.jumlahTransaksi,
                      )
                    : 0,
                )}
              </div>
              <div className="mt-1 text-xs text-stone-500">
                Total penjualan ÷ jumlah transaksi.
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold">Top 5 Produk Terlaris</h2>
            {ringkasan.top5.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                Belum ada penjualan pada periode ini.
              </p>
            ) : (
              <ol className="mt-2 space-y-2">
                {ringkasan.top5.map((p, i) => (
                  <li
                    key={p.nama}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                        {i + 1}
                      </span>
                      <span className="font-medium">{p.nama}</span>
                    </span>
                    <span className="shrink-0 text-stone-600">
                      {p.qty} terjual · {formatRupiah(p.omzet)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-stone-200 bg-white shadow-sm">
            <h2 className="border-b px-4 py-3 text-lg font-bold">
              Riwayat Transaksi
            </h2>
            {transaksi.length === 0 ? (
              <p className="px-4 py-3 text-sm text-stone-500">
                Belum ada transaksi pada periode ini.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {transaksi.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailId(detailId === t.id ? null : t.id)
                      }
                      className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-stone-50"
                    >
                      <span>
                        <span className="font-medium">
                          #{t.id.slice(0, 8).toUpperCase()}
                        </span>{' '}
                        <span className="text-sm text-stone-500">
                          {formatTanggal(t.created_at)} ·{' '}
                          {labelMetode(t.metode_bayar)}
                        </span>
                      </span>
                      <span className="font-bold">
                        {formatRupiah(t.total)}
                      </span>
                    </button>
                    {detailId === t.id && (
                      <div className="bg-stone-50 px-4 py-3 text-sm">
                        <ul className="space-y-1">
                          {(t.item_transaksi ?? []).map((it) => (
                            <li
                              key={it.id}
                              className="flex justify-between gap-2"
                            >
                              <span>
                                {it.produk?.nama ?? 'Produk dihapus'} —{' '}
                                {it.qty} x {formatRupiah(it.harga_jual)}
                              </span>
                              <span className="font-medium">
                                {formatRupiah(it.subtotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <dl className="mt-2 space-y-0.5 border-t border-dashed border-stone-300 pt-2">
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
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
