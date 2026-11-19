// Halaman Kasir: cari produk, keranjang, bayar Tunai / QRIS.
// Checkout lewat RPC buat_transaksi(), harga & total dihitung ulang
// di database. Setelah bayar, struk digital ditampilkan.
// Cari produk lewat kata kunci atau filter kategori sekali ketuk.
// Jumlah bisa diubah langsung di kartu produk (tombol kurang/tambah),
// jadi kasir tidak perlu bolak-balik membuka keranjang.
// Di HP, keranjang dibuka sebagai panel bawah (bottom sheet) lewat
// bar total yang menempel di atas menu bawah; di layar besar
// keranjang tampil sebagai panel samping.

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checkout, fetchKategori, fetchProduk } from '../lib/api'
import type { CartItem, CheckoutResult, Produk } from '../lib/types'
import { formatRupiah, labelMetode } from '../lib/format'
import Struk from '../components/Struk'
import {
  IconKeranjang,
  IconProduk,
  IconSearch,
  IconTutup,
} from '../components/icons'

interface CartPanelProps {
  keranjang: CartItem[]
  onUbahQty: (produkId: string, delta: number) => void
  onKosongkan: () => void
  total: number
  metode: 'tunai' | 'qris'
  onMetode: (m: 'tunai' | 'qris') => void
  dibayar: string
  onDibayar: (v: string) => void
  dibayarNum: number
  kembalian: number
  uangKurang: boolean
  error: string | null
  bayarPending: boolean
  onBayar: () => void
}

/** Nominal tombol uang cepat: pecahan 10/20/50/100 ribu yang
    cukup membayar total, jadi kasir tidak perlu mengetuk nominal
    yang ujungnya kurang. Kalau total di atas 100 ribu, tawarkan
    pembulatan ke atas (kelipatan 50 ribu dan 100 ribu). */
function saranBayar(total: number): number[] {
  const pecahan = [10000, 20000, 50000, 100000].filter((n) => n >= total)
  if (pecahan.length > 0) return pecahan
  const ke50 = Math.ceil(total / 50000) * 50000
  const ke100 = Math.ceil(total / 100000) * 100000
  return ke50 === ke100 ? [ke100] : [ke50, ke100]
}

/** Isi keranjang + pembayaran, dipakai panel samping (desktop)
    dan panel bawah (HP) dengan state yang sama. */
function CartPanel(props: CartPanelProps) {
  const {
    keranjang,
    onUbahQty,
    onKosongkan,
    total,
    metode,
    onMetode,
    dibayar,
    onDibayar,
    dibayarNum,
    kembalian,
    uangKurang,
    error,
    bayarPending,
    onBayar,
  } = props
  const { t } = useTranslation()

  return (
    <div>
      {keranjang.length === 0 ? (
        <p className="mt-1 text-sm text-stone-600">
          {t('kasir.keranjangKosong')}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {keranjang.map((it) => (
            <li key={it.produk.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {it.produk.nama}
                </div>
                <div className="text-xs text-stone-600">
                  {formatRupiah(it.produk.harga_jual)} / {it.produk.satuan}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={t('kasir.kurangiProduk', { nama: it.produk.nama })}
                  onClick={() => onUbahQty(it.produk.id, -1)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-garis text-xl font-bold hover:bg-kertas-gelap active:scale-95"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm font-semibold">
                  {it.qty}
                </span>
                <button
                  type="button"
                  aria-label={t('kasir.tambahProduk', { nama: it.produk.nama })}
                  onClick={() => onUbahQty(it.produk.id, 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-garis text-xl font-bold hover:bg-kertas-gelap active:scale-95"
                >
                  +
                </button>
              </div>
              <div className="w-20 shrink-0 text-right text-sm font-semibold">
                {formatRupiah(it.qty * it.produk.harga_jual)}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-dashed border-garis pt-3">
        <div className="flex justify-between text-lg">
          <span className="font-semibold">{t('umum.total')}</span>
          <span className="font-bold text-pinus-700">
            {formatRupiah(total)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-sm font-medium">{t('kasir.metodeBayar')}</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(
            [
              { value: 'tunai', label: labelMetode('tunai') },
              { value: 'qris', label: labelMetode('qris') },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onMetode(m.value)}
              className={`min-h-11 rounded-lg border px-3 py-2.5 text-sm font-bold transition-colors ${
                metode === m.value
                  ? 'border-pinus-700 bg-pinus-50 text-pinus-800'
                  : 'border-garis text-stone-600 hover:bg-kertas'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {metode === 'tunai' ? (
        <div className="mt-4">
          <label htmlFor="dibayar" className="text-sm font-medium">
            {t('kasir.uangDibayar')}
          </label>
          <input
            id="dibayar"
            type="text"
            inputMode="numeric"
            value={dibayar}
            onChange={(e) => onDibayar(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="0"
            className="input mt-1.5 text-lg font-semibold"
          />
          <div className="mt-2 flex justify-between text-base">
            <span>{t('struk.kembalian')}</span>
            <span
              className={`font-bold ${uangKurang ? 'text-red-600' : 'text-pinus-700'}`}
            >
              {uangKurang
                ? t('kasir.kurang', { jumlah: formatRupiah(total - dibayarNum) })
                : formatRupiah(kembalian)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {saranBayar(total).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onDibayar(String(n))}
                aria-label={t('kasir.bayarNominal', { jumlah: formatRupiah(n) })}
                className="min-h-11 rounded-lg border border-garis px-3 py-2 text-sm font-semibold hover:bg-kertas-gelap"
              >
                {formatRupiah(n)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onDibayar(String(total))}
              disabled={total === 0}
              className="min-h-11 rounded-lg border border-aksen-600 px-3 py-2 text-sm font-bold text-aksen-700 hover:bg-aksen-100 disabled:opacity-50"
            >
              {t('kasir.uangPas')}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-kertas-gelap px-3 py-2.5 text-sm text-stone-600">
          {t('kasir.catatanQris')}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onKosongkan}
          disabled={keranjang.length === 0}
          className="btn-secondary flex-none px-4"
        >
          {t('kasir.kosongkan')}
        </button>
        <button
          type="button"
          onClick={onBayar}
          disabled={
            keranjang.length === 0 ||
            bayarPending ||
            (metode === 'tunai' && dibayarNum < total)
          }
          className="btn-primary min-h-12 flex-1 text-base"
        >
          {bayarPending ? t('kasir.memproses') : t('kasir.bayar')}
        </button>
      </div>
    </div>
  )
}

export default function KasirPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [cari, setCari] = useState('')
  const [kategoriId, setKategoriId] = useState<string | null>(null)
  const [keranjang, setKeranjang] = useState<CartItem[]>([])
  const [metode, setMetode] = useState<'tunai' | 'qris'>('tunai')
  const [dibayar, setDibayar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [keranjangTerbuka, setKeranjangTerbuka] = useState(false)
  const [struk, setStruk] = useState<{
    items: CartItem[]
    hasil: CheckoutResult
    tanggalIso: string
  } | null>(null)

  const produkQuery = useQuery({
    queryKey: ['produk'],
    queryFn: fetchProduk,
  })
  const kategoriQuery = useQuery({
    queryKey: ['kategori'],
    queryFn: fetchKategori,
  })

  // Filter gabungan: kategori sekali ketuk + kata kunci.
  const produkList = useMemo(() => {
    let tampil = produkQuery.data ?? []
    if (kategoriId === 'tanpa-kategori') {
      tampil = tampil.filter((p) => !p.kategori_id)
    } else if (kategoriId) {
      tampil = tampil.filter((p) => p.kategori_id === kategoriId)
    }
    const q = cari.trim().toLowerCase()
    if (q) tampil = tampil.filter((p) => p.nama.toLowerCase().includes(q))
    return tampil
  }, [produkQuery.data, kategoriId, cari])

  // Jumlah tiap produk di keranjang, untuk stepper di kartu produk.
  const qtyDiKeranjang = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of keranjang) map.set(it.produk.id, it.qty)
    return map
  }, [keranjang])

  const kategoriList = kategoriQuery.data ?? []
  const kategoriAktif = kategoriList.find((k) => k.id === kategoriId)
  const adaTanpaKategori = (produkQuery.data ?? []).some(
    (p) => !p.kategori_id,
  )

  const total = keranjang.reduce(
    (sum, it) => sum + it.qty * it.produk.harga_jual,
    0,
  )
  const dibayarNum = Number(dibayar.replace(/[^0-9]/g, '')) || 0
  const kembalian = metode === 'tunai' ? Math.max(0, dibayarNum - total) : 0
  const uangKurang = metode === 'tunai' && total > 0 && dibayarNum < total

  function tambahKeKeranjang(p: Produk) {
    if (p.stok <= 0) {
      setError(t('kasir.stokHabis', { nama: p.nama }))
      return
    }
    setError(null)
    setKeranjang((prev) => {
      const ada = prev.find((it) => it.produk.id === p.id)
      if (ada) {
        if (ada.qty + 1 > p.stok) {
          setError(t('kasir.stokTersisa', { nama: p.nama, stok: p.stok }))
          return prev
        }
        return prev.map((it) =>
          it.produk.id === p.id ? { ...it, qty: it.qty + 1 } : it,
        )
      }
      return [...prev, { produk: p, qty: 1 }]
    })
  }

  function ubahQty(produkId: string, delta: number) {
    setError(null)
    setKeranjang((prev) =>
      prev
        .map((it) => {
          if (it.produk.id !== produkId) return it
          const qtyBaru = it.qty + delta
          if (qtyBaru > it.produk.stok) {
            setError(
              t('kasir.stokTersisa', {
                nama: it.produk.nama,
                stok: it.produk.stok,
              }),
            )
            return it
          }
          return { ...it, qty: qtyBaru }
        })
        .filter((it) => it.qty > 0),
    )
  }

  function kosongkanKeranjang() {
    setKeranjang([])
    setDibayar('')
    setError(null)
  }

  const bayarMutation = useMutation({
    mutationFn: () =>
      checkout(
        keranjang.map((it) => ({ produk_id: it.produk.id, qty: it.qty })),
        metode,
        metode === 'tunai' ? dibayarNum : 0,
      ),
    onSuccess: (hasil) => {
      setStruk({
        items: keranjang,
        hasil,
        tanggalIso: new Date().toISOString(),
      })
      setKeranjang([])
      setDibayar('')
      setError(null)
      setKeranjangTerbuka(false)
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      void queryClient.invalidateQueries({ queryKey: ['transaksi'] })
      void queryClient.invalidateQueries({ queryKey: ['log-stok'] })
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : t('kasir.pembayaranGagal'),
      )
    },
  })

  function handleBayar() {
    if (keranjang.length === 0) return
    if (metode === 'tunai' && dibayarNum < total) {
      setError(t('kasir.uangKurangDariTotal'))
      return
    }
    bayarMutation.mutate()
  }

  const cartProps: CartPanelProps = {
    keranjang,
    onUbahQty: ubahQty,
    onKosongkan: kosongkanKeranjang,
    total,
    metode,
    onMetode: setMetode,
    dibayar,
    onDibayar: setDibayar,
    dibayarNum,
    kembalian,
    uangKurang,
    error,
    bayarPending: bayarMutation.isPending,
    onBayar: handleBayar,
  }

  return (
    <div className="grid gap-4 pb-20 md:pb-0 lg:grid-cols-[1fr_360px]">
      {/* Daftar produk */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h1 className="judul-halaman">{t('nav.kasir')}</h1>
          {keranjang.length > 0 && (
            <span className="rounded-md bg-pinus-100 px-2.5 py-1 text-xs font-bold text-pinus-800">
              {t('kasir.itemDiKeranjang', { count: keranjang.length })}
            </span>
          )}
        </div>
        <div className="relative mb-3">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={t('kasir.cariProduk')}
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
              onClick={() => setKategoriId(null)}
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
                onClick={() => setKategoriId(k.id)}
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
                onClick={() => setKategoriId('tanpa-kategori')}
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
                      kategori:
                        kategoriAktif?.nama ?? t('umum.tanpaKategori'),
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
                  onClick={() => tambahKeKeranjang(p)}
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
                      onClick={() => ubahQty(p.id, -1)}
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
                      onClick={() => tambahKeKeranjang(p)}
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
      </section>

      {/* Keranjang & pembayaran, panel samping (layar sedang ke atas) */}
      <aside className="hidden h-fit md:block lg:sticky lg:top-24">
        <div className="card p-4 sm:p-5">
          <h2 className="text-lg font-bold">{t('kasir.keranjang')}</h2>
          <CartPanel {...cartProps} />
        </div>
      </aside>

      {/* Bar total menempel (HP saja): total + buka keranjang,
          mengambang di atas menu bawah. */}
      {keranjang.length > 0 && (
        <button
          type="button"
          onClick={() => setKeranjangTerbuka(true)}
          className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex min-h-14 items-center justify-between gap-3 rounded-lg bg-pinus-800 px-4 py-3 text-white shadow-angkat transition active:scale-[0.99] no-print md:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <IconKeranjang className="h-5 w-5" />
            {t('kasir.item', { count: keranjang.length })}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-base font-bold">{formatRupiah(total)}</span>
            <span className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-pinus-800">
              {t('kasir.keranjang')}
            </span>
          </span>
        </button>
      )}

      {/* Panel bawah keranjang (HP saja) */}
      {keranjangTerbuka && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setKeranjangTerbuka(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-lg bg-white pb-[env(safe-area-inset-bottom)] shadow-angkat">
            <div className="sticky top-0 flex items-center justify-between border-b border-garis bg-white px-4 py-3">
              <h2 className="text-lg font-bold">{t('kasir.keranjang')}</h2>
              <button
                type="button"
                aria-label={t('kasir.tutupKeranjang')}
                onClick={() => setKeranjangTerbuka(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-stone-600 hover:bg-kertas-gelap"
              >
                <IconTutup className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-4">
              <CartPanel {...cartProps} />
            </div>
          </div>
        </div>
      )}

      {struk && (
        <Struk
          items={struk.items}
          hasil={struk.hasil}
          tanggalIso={struk.tanggalIso}
          onTutup={() => setStruk(null)}
          onTransaksiBaru={() => setStruk(null)}
        />
      )}
    </div>
  )
}
