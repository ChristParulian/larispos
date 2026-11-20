// Halaman Dashboard: ringkasan penjualan hari ini, jalan pintas,
// stok menipis, produk terlaris, transaksi terakhir, dan penjualan
// 7 hari terakhir. Data dari api yang sama dengan LaporanPage.
// Estimasi laba hanya untuk owner, kasir tidak melihat angka laba.

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchProduk, fetchTransaksi } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  formatJam,
  formatRupiah,
  labelMetode,
  tanggalHariIni,
} from '../lib/format'
import i18n from '../lib/i18n'
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
  if (jam < 11) return i18n.t('dashboard.sapaanPagi')
  if (jam < 15) return i18n.t('dashboard.sapaanSiang')
  if (jam < 19) return i18n.t('dashboard.sapaanSore')
  return i18n.t('dashboard.sapaanMalam')
}

/** Tanggal hari ini, panjang: "Rabu, 18 November 2026". */
function tanggalPanjang(): string {
  return new Date().toLocaleDateString(
    i18n.language === 'en' ? 'en-US' : 'id-ID',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )
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
  const bahasaInggris = i18n.language === 'en'
  if (nilai >= 1_000_000) {
    const jt = nilai / 1_000_000
    const teks =
      jt % 1 === 0
        ? String(jt)
        : bahasaInggris
          ? jt.toFixed(1)
          : jt.toFixed(1).replace('.', ',')
    return `${teks}${i18n.t('dashboard.singkatanJuta')}`
  }
  if (nilai >= 1000)
    return `${Math.round(nilai / 1000)}${i18n.t('dashboard.singkatanRibu')}`
  return String(nilai)
}

export default function DashboardPage() {
  const { t } = useTranslation()
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

  // Dibungkus useMemo supaya referensinya stabil saat data belum termuat:
  // fallback [] harfiah berubah identitas tiap render dan membuat memo
  // di bawahnya menghitung ulang terus.
  const produk = useMemo(() => produkQuery.data ?? [], [produkQuery.data])
  const transaksiHariIni = useMemo(
    () => hariIniQuery.data ?? [],
    [hariIniQuery.data],
  )
  const semuaTransaksi = useMemo(() => semuaQuery.data ?? [], [semuaQuery.data])

  const namaDepan = (profil?.nama ?? user?.email?.split('@')[0] ?? '').split(
    ' ',
  )[0]

  const ringkasanHariIni = useMemo(() => {
    let total = 0
    let labaKotor = 0
    let jumlah = 0
    for (const t of transaksiHariIni) {
      // Transaksi yang dibatalkan tidak dihitung.
      if (t.status === 'dibatalkan') continue
      jumlah++
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
      jumlah,
      rataRata: jumlah > 0 ? Math.round(total / jumlah) : 0,
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
    for (const trx of semuaTransaksi) {
      if (trx.status === 'dibatalkan') continue
      for (const it of trx.item_transaksi ?? []) {
        const nama = it.produk?.nama ?? t('dashboard.produkDihapus')
        const cur = perProduk.get(it.produk_id) ?? { nama, qty: 0, omzet: 0 }
        cur.qty += it.qty
        cur.omzet += it.subtotal
        perProduk.set(it.produk_id, cur)
      }
    }
    return [...perProduk.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)
  }, [semuaTransaksi, t])

  const transaksiTerakhir = semuaTransaksi.slice(0, 5)

  // Locale tanggal dari bahasa aktif; nilainya string primitif, jadi
  // aman dipakai sebagai dep memo (berubah hanya saat bahasa diganti,
  // dan komponen me-render ulang saat itu).
  const locale = i18n.language === 'en' ? 'en-US' : 'id-ID'

  const tujuhHari = useMemo(() => {
    const hari = Array.from({ length: 7 }, (_, i) => {
      const nLalu = 6 - i
      const d = new Date()
      d.setDate(d.getDate() - nLalu)
      return {
        tanggal: tanggalLokal(nLalu),
        label: d.toLocaleDateString(locale, { weekday: 'short' }),
        hariIni: nLalu === 0,
        total: 0,
      }
    })
    const perTanggal = new Map(hari.map((h) => [h.tanggal, h]))
    for (const t of semuaTransaksi) {
      if (t.status === 'dibatalkan') continue
      const h = perTanggal.get(tanggalLokalDariIso(t.created_at))
      if (h) h.total += t.total
    }
    const maks = Math.max(0, ...hari.map((h) => h.total))
    const totalMinggu = hari.reduce((s, h) => s + h.total, 0)
    return { hari, maks, totalMinggu }
  }, [semuaTransaksi, locale])

  const memuat =
    produkQuery.isLoading || hariIniQuery.isLoading || semuaQuery.isLoading
  const galat = produkQuery.error ?? hariIniQuery.error ?? semuaQuery.error

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {sapaanWaktu()}
          {namaDepan ? `, ${namaDepan}` : ''}
        </h1>
        <p className="eyebrow mt-1.5">{tanggalPanjang()}</p>
      </div>

      {memuat && <p className="text-stone-600">{t('dashboard.memuat')}</p>}
      {galat && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('dashboard.gagalMemuat', {
            pesan:
              galat instanceof Error
                ? galat.message
                : t('dashboard.terjadiKesalahan'),
          })}
        </p>
      )}

      {!memuat && !galat && (
        <>
          {/* Angka utama hari ini, satu-satunya yang besar di halaman. */}
          <section aria-label={t('dashboard.penjualanHariIni')}>
            <p className="eyebrow">{t('dashboard.penjualanHariIni')}</p>
            <p className="mt-2 text-5xl font-extrabold tracking-tighter sm:text-6xl">
              {formatRupiah(ringkasanHariIni.total)}
            </p>
            <p className="mt-2 text-sm text-stone-600">
              {ringkasanHariIni.jumlah === 0
                ? t('dashboard.belumAdaTransaksiHariIni')
                : t('dashboard.ringkasanHariIni', {
                    count: ringkasanHariIni.jumlah,
                    jumlah: ringkasanHariIni.jumlah,
                    rataRata: formatRupiah(ringkasanHariIni.rataRata),
                  })}
            </p>
            {isOwner && (
              <p className="mt-1 text-sm text-stone-600">
                {t('dashboard.estimasiLabaHariIni')}{' '}
                <span className="font-semibold text-stone-700">
                  {formatRupiah(ringkasanHariIni.labaKotor)}
                </span>
              </p>
            )}
          </section>

          <hr className="my-5 border-garis" />

          {/* Jalan pintas. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to="/kasir" className="btn-primary flex-1">
              <IconKasir className="h-5 w-5" /> {t('dashboard.mulaiJualan')}
            </Link>
            {isOwner && (
              <Link to="/produk/tambah" className="btn-secondary flex-1">
                <IconPlus className="h-5 w-5" /> {t('dashboard.tambahProduk')}
              </Link>
            )}
            <Link to="/laporan" className="btn-secondary flex-1">
              <IconLaporan className="h-5 w-5" /> {t('dashboard.lihatLaporan')}
            </Link>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Stok menipis. */}
            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <IconPeringatan className="h-5 w-5 text-aksen-600" />
                  {t('dashboard.stokMenipis')}
                </h2>
                <Link to="/produk" className="tautan">
                  {t('dashboard.lihatProduk')}
                </Link>
              </div>
              {stokTipis.length === 0 ? (
                <p className="mt-3 text-sm text-stone-600">
                  {t('dashboard.semuaStokAman')}
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-garis">
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
                          <span className="text-xs text-stone-600">
                            {p.kategori?.nama ?? t('umum.tanpaKategori')}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 font-semibold ${
                            p.stok === 0 ? 'text-red-700' : 'text-aksen-700'
                          }`}
                        >
                          {p.stok === 0
                            ? t('dashboard.habis')
                            : t('dashboard.sisaStok', {
                                stok: p.stok,
                                satuan: p.satuan,
                              })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {stokTipis.length > 8 && (
                <p className="mt-2 text-sm text-stone-600">
                  {t('dashboard.danProdukLagi', {
                    count: stokTipis.length - 8,
                    jumlah: stokTipis.length - 8,
                  })}
                </p>
              )}
            </section>

            {/* Produk terlaris. */}
            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold">
                  {t('dashboard.produkTerlaris')}
                </h2>
                <Link to="/laporan" className="tautan">
                  {t('dashboard.lihatLaporanTautan')}
                </Link>
              </div>
              {top5.length === 0 ? (
                <p className="mt-3 text-sm text-stone-600">
                  {t('dashboard.belumAdaPenjualan')}
                </p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {top5.map((p, i) => (
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
                        {t('dashboard.terjual', {
                          qty: p.qty,
                          omzet: formatRupiah(p.omzet),
                        })}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Transaksi terakhir. */}
            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold">
                  {t('dashboard.transaksiTerakhir')}
                </h2>
                <Link to="/laporan" className="tautan">
                  {t('dashboard.lihatSemua')}
                </Link>
              </div>
              {transaksiTerakhir.length === 0 ? (
                <p className="mt-3 text-sm text-stone-600">
                  {t('dashboard.belumAdaTransaksi')}
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-garis">
                  {transaksiTerakhir.map((trx) => (
                    <li key={trx.id}>
                      <Link
                        to="/laporan"
                        className="flex min-h-11 items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {formatJam(trx.created_at)} ·{' '}
                            {labelMetode(trx.metode_bayar)}
                            {trx.status === 'dibatalkan' && (
                              <span className="ml-2 rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                {t('dashboard.dibatalkan')}
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-stone-600">
                            {t('dashboard.jumlahItem', {
                              count: (trx.item_transaksi ?? []).length,
                              jumlah: (trx.item_transaksi ?? []).length,
                            })}
                          </span>
                        </span>
                        <span className="shrink-0 font-bold">
                          {formatRupiah(trx.total)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Penjualan 7 hari terakhir, batang CSS, tanpa pustaka grafik. */}
            <section className="card p-4 sm:p-5">
              <h2 className="text-base font-bold">
                {t('dashboard.penjualan7Hari')}
              </h2>
              {tujuhHari.totalMinggu === 0 ? (
                <p className="mt-3 text-sm text-stone-600">
                  {t('dashboard.belumAdaPenjualan7Hari')}
                </p>
              ) : (
                <>
                  <div
                    className="mt-4 flex gap-2"
                    role="img"
                    aria-label={t('dashboard.grafikPenjualan')}
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
                          <span className="h-4 text-center text-[11px] leading-none text-stone-600">
                            {h.total > 0 ? formatSingkat(h.total) : ''}
                          </span>
                          <div className="flex h-28 items-end">
                            <div
                              className={`mx-auto w-full max-w-10 rounded-t-md ${
                                h.hariIni ? 'bg-aksen-500' : 'bg-pinus-200'
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
                                : 'text-stone-600'
                            }`}
                          >
                            {h.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-sm text-stone-600">
                    {t('dashboard.total7Hari')}{' '}
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
