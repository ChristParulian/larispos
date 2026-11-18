// Halaman Dashboard: ringkasan penjualan hari ini, jalan pintas,
// stok menipis, produk terlaris, transaksi terakhir, dan penjualan
// 7 hari terakhir. Data dari api yang sama dengan LaporanPage.
// Estimasi laba hanya untuk owner — kasir tidak melihat angka laba.

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchProduk, fetchTransaksi } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  formatJam,
  formatRupiah,
  labelMetode,
  tanggalHariIni,
} from '../lib/format'
import {
  IconKasir,
  IconLaporan,
  IconPeringatan,
  IconPlus,
} from '../components/icons'

/** Stok dianggap menipis bila sisa 5 atau kurang. */
const BATAS_STOK_TIPIS = 5

function sapaanWaktu(): string {
  const jam = new Date().getHours()
  if (jam < 11) return 'Selamat pagi'
  if (jam < 15) return 'Selamat siang'
  if (jam < 19) return 'Selamat sore'
  return 'Selamat malam'
}

/** Tanggal hari ini, panjang: "Rabu, 18 November 2026". */
function tanggalPanjang(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Tanggal lokal YYYY-MM-DD untuk n hari yang lalu. */
function tanggalLokal(nHariLalu: number): string {
  const d = new Date()
  d.setDate(d.getDate() - nHariLalu)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Tanggal lokal YYYY-MM-DD dari ISO string (zona browser, bukan UTC). */
function tanggalLokalDariIso(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Rupiah ringkas untuk label grafik: 120000 -> "120 rb", 2500000 -> "2,5 jt". */
function formatSingkat(nilai: number): string {
  if (nilai >= 1_000_000) {
    const jt = nilai / 1_000_000
    const teks = jt % 1 === 0 ? String(jt) : jt.toFixed(1).replace('.', ',')
    return `${teks} jt`
  }
  if (nilai >= 1000) return `${Math.round(nilai / 1000)} rb`
  return String(nilai)
}

export default function DashboardPage() {
  const { isOwner, profil, user } = useAuth()
  const hariIni = tanggalHariIni()

  const produkQuery = useQuery({ queryKey: ['produk'], queryFn: fetchProduk })
  // Ringkasan hari ini memakai query yang sama persis dengan LaporanPage,
  // supaya angkanya konsisten dan cache-nya dipakai bersama.
  const hariIniQuery = useQuery({
    queryKey: ['transaksi', hariIni],
    queryFn: () => fetchTransaksi(hariIni),
  })
  const semuaQuery = useQuery({
    queryKey: ['transaksi'],
    queryFn: () => fetchTransaksi(),
  })

  const produk = produkQuery.data ?? []
  const transaksiHariIni = hariIniQuery.data ?? []
  const semuaTransaksi = semuaQuery.data ?? []

  const namaDepan = (profil?.nama ?? user?.email?.split('@')[0] ?? '').split(
    ' ',
  )[0]

  const ringkasanHariIni = useMemo(() => {
    let total = 0
    let labaKotor = 0
    for (const t of transaksiHariIni) {
      total += t.total
      for (const it of t.item_transaksi ?? []) {
        if (it.harga_beli !== null && it.harga_beli !== undefined) {
          labaKotor += (it.harga_jual - it.harga_beli) * it.qty
        }
      }
    }
    return {
      total,
      labaKotor,
      jumlah: transaksiHariIni.length,
      rataRata:
        transaksiHariIni.length > 0
          ? Math.round(total / transaksiHariIni.length)
          : 0,
    }
  }, [transaksiHariIni])

  const stokTipis = useMemo(
    () =>
      produk
        .filter((p) => p.stok <= BATAS_STOK_TIPIS)
        .sort((a, b) => a.stok - b.stok),
    [produk],
  )

  const top5 = useMemo(() => {
    const perProduk = new Map<
      string,
      { nama: string; qty: number; omzet: number }
    >()
    for (const t of semuaTransaksi) {
      for (const it of t.item_transaksi ?? []) {
        const nama = it.produk?.nama ?? 'Produk dihapus'
        const cur = perProduk.get(it.produk_id) ?? { nama, qty: 0, omzet: 0 }
        cur.qty += it.qty
        cur.omzet += it.subtotal
        perProduk.set(it.produk_id, cur)
      }
    }
    return [...perProduk.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [semuaTransaksi])

  const transaksiTerakhir = semuaTransaksi.slice(0, 5)

  const tujuhHari = useMemo(() => {
    const hari = Array.from({ length: 7 }, (_, i) => {
      const nLalu = 6 - i
      const d = new Date()
      d.setDate(d.getDate() - nLalu)
      return {
        tanggal: tanggalLokal(nLalu),
        label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        hariIni: nLalu === 0,
        total: 0,
      }
    })
    const perTanggal = new Map(hari.map((h) => [h.tanggal, h]))
    for (const t of semuaTransaksi) {
      const h = perTanggal.get(tanggalLokalDariIso(t.created_at))
      if (h) h.total += t.total
    }
    const maks = Math.max(0, ...hari.map((h) => h.total))
    const totalMinggu = hari.reduce((s, h) => s + h.total, 0)
    return { hari, maks, totalMinggu }
  }, [semuaTransaksi])

  const memuat =
    produkQuery.isLoading || hariIniQuery.isLoading || semuaQuery.isLoading
  const galat =
    produkQuery.error ?? hariIniQuery.error ?? semuaQuery.error

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">
          {sapaanWaktu()}
          {namaDepan ? `, ${namaDepan}` : ''}
        </h1>
        <p className="mt-0.5 text-sm text-stone-500">{tanggalPanjang()}</p>
      </div>

      {memuat && <p className="text-stone-500">Memuat dashboard…</p>}
      {galat && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat dashboard:{' '}
          {galat instanceof Error ? galat.message : 'terjadi kesalahan.'}
        </p>
      )}

      {!memuat && !galat && (
        <>
          {/* Angka utama hari ini — satu-satunya yang besar di halaman. */}
          <section aria-label="Penjualan hari ini">
            <p className="text-sm font-medium text-stone-500">
              Penjualan hari ini
            </p>
            <p className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
              {formatRupiah(ringkasanHariIni.total)}
            </p>
            <p className="mt-2 text-sm text-stone-500">
              {ringkasanHariIni.jumlah === 0
                ? 'Belum ada transaksi hari ini.'
                : `${ringkasanHariIni.jumlah} transaksi · rata-rata ${formatRupiah(ringkasanHariIni.rataRata)} per transaksi`}
            </p>
            {isOwner && (
              <p className="mt-1 text-sm text-stone-500">
                Estimasi laba kotor hari ini:{' '}
                <span className="font-semibold text-stone-700">
                  {formatRupiah(ringkasanHariIni.labaKotor)}
                </span>
              </p>
            )}
          </section>

          <hr className="my-5 border-stone-200" />

          {/* Jalan pintas. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/kasir" className="btn-primary flex-1">
              <IconKasir className="h-5 w-5" /> Mulai Jualan
            </Link>
            <Link to="/produk/tambah" className="btn-secondary flex-1">
              <IconPlus className="h-5 w-5" /> Tambah Produk
            </Link>
            <Link to="/laporan" className="btn-secondary flex-1">
              <IconLaporan className="h-5 w-5" /> Lihat Laporan
            </Link>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Stok menipis. */}
            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <IconPeringatan className="h-5 w-5 text-amber-600" />
                  Stok menipis
                </h2>
                <Link
                  to="/produk"
                  className="shrink-0 text-sm font-medium text-emerald-700 hover:underline"
                >
                  Lihat produk
                </Link>
              </div>
              {stokTipis.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Semua stok aman. Tidak ada produk dengan stok 5 atau kurang.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-stone-100">
                  {stokTipis.slice(0, 8).map((p) => (
                    <li key={p.id}>
                      <Link
                        to="/produk"
                        className="flex min-h-11 items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {p.nama}
                          </span>
                          <span className="text-xs text-stone-500">
                            {p.kategori?.nama ?? 'Tanpa kategori'}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 font-semibold ${
                            p.stok === 0 ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          {p.stok === 0
                            ? 'Habis'
                            : `Sisa ${p.stok} ${p.satuan}`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {stokTipis.length > 8 && (
                <p className="mt-2 text-sm text-stone-500">
                  Dan {stokTipis.length - 8} produk lagi — lihat di halaman
                  Produk.
                </p>
              )}
            </section>

            {/* Produk terlaris. */}
            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold">Produk terlaris</h2>
                <Link
                  to="/laporan"
                  className="shrink-0 text-sm font-medium text-emerald-700 hover:underline"
                >
                  Lihat laporan
                </Link>
              </div>
              {top5.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Belum ada penjualan.
                </p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {top5.map((p, i) => (
                    <li
                      key={p.nama}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
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
            </section>

            {/* Transaksi terakhir. */}
            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold">Transaksi terakhir</h2>
                <Link
                  to="/laporan"
                  className="shrink-0 text-sm font-medium text-emerald-700 hover:underline"
                >
                  Lihat semua
                </Link>
              </div>
              {transaksiTerakhir.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Belum ada transaksi.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-stone-100">
                  {transaksiTerakhir.map((t) => (
                    <li key={t.id}>
                      <Link
                        to="/laporan"
                        className="flex min-h-11 items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {formatJam(t.created_at)} ·{' '}
                            {labelMetode(t.metode_bayar)}
                          </span>
                          <span className="text-xs text-stone-500">
                            {(t.item_transaksi ?? []).length} item
                          </span>
                        </span>
                        <span className="shrink-0 font-bold">
                          {formatRupiah(t.total)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Penjualan 7 hari terakhir — batang CSS, tanpa pustaka grafik. */}
            <section className="card p-4 sm:p-5">
              <h2 className="text-base font-bold">
                Penjualan 7 hari terakhir
              </h2>
              {tujuhHari.totalMinggu === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  Belum ada penjualan dalam 7 hari terakhir.
                </p>
              ) : (
                <>
                  <div
                    className="mt-4 flex gap-2"
                    role="img"
                    aria-label="Grafik penjualan 7 hari terakhir"
                  >
                    {tujuhHari.hari.map((h) => {
                      const pct =
                        tujuhHari.maks > 0
                          ? Math.round((h.total / tujuhHari.maks) * 100)
                          : 0
                      return (
                        <div
                          key={h.tanggal}
                          className="flex min-w-0 flex-1 flex-col"
                        >
                          <span className="h-4 text-center text-[11px] leading-none text-stone-500">
                            {h.total > 0 ? formatSingkat(h.total) : ''}
                          </span>
                          <div className="flex h-28 items-end">
                            <div
                              className={`mx-auto w-full max-w-10 rounded-t-md ${
                                h.hariIni ? 'bg-emerald-800' : 'bg-emerald-600'
                              }`}
                              style={{
                                height: `${Math.max(pct, h.total > 0 ? 4 : 0)}%`,
                              }}
                              title={`${h.label}: ${formatRupiah(h.total)}`}
                            />
                          </div>
                          <span
                            className={`mt-1 text-center text-xs ${
                              h.hariIni
                                ? 'font-bold text-stone-900'
                                : 'text-stone-500'
                            }`}
                          >
                            {h.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-sm text-stone-500">
                    Total 7 hari:{' '}
                    <span className="font-semibold text-stone-700">
                      {formatRupiah(tujuhHari.totalMinggu)}
                    </span>
                  </p>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
