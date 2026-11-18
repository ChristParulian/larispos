// Halaman Kasir: cari produk, keranjang, bayar Tunai / QRIS.
// Checkout lewat RPC buat_transaksi() — harga & total dihitung ulang
// di database. Setelah bayar, struk digital ditampilkan.
// Di HP, keranjang dibuka sebagai panel bawah (bottom sheet) lewat
// bar total yang menempel di atas menu bawah; di layar besar
// keranjang tampil sebagai panel samping.

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checkout, fetchProduk } from '../lib/api'
import type { CartItem, CheckoutResult, Produk } from '../lib/types'
import { formatRupiah } from '../lib/format'
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

/** Isi keranjang + pembayaran — dipakai panel samping (desktop)
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

  return (
    <div>
      {keranjang.length === 0 ? (
        <p className="mt-1 text-sm text-stone-500">
          Keranjang masih kosong. Ketuk produk untuk menambahkan.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {keranjang.map((it) => (
            <li key={it.produk.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {it.produk.nama}
                </div>
                <div className="text-xs text-stone-500">
                  {formatRupiah(it.produk.harga_jual)} / {it.produk.satuan}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Kurangi ${it.produk.nama}`}
                  onClick={() => onUbahQty(it.produk.id, -1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-300 text-xl font-bold hover:bg-stone-100 active:scale-95"
                >
                  −
                </button>
                <span className="w-7 text-center text-sm font-semibold">
                  {it.qty}
                </span>
                <button
                  type="button"
                  aria-label={`Tambah ${it.produk.nama}`}
                  onClick={() => onUbahQty(it.produk.id, 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-300 text-xl font-bold hover:bg-stone-100 active:scale-95"
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

      <div className="mt-4 border-t border-dashed border-stone-300 pt-3">
        <div className="flex justify-between text-lg">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-emerald-700">
            {formatRupiah(total)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <span className="text-sm font-medium">Metode bayar</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(
            [
              { value: 'tunai', label: 'Tunai' },
              { value: 'qris', label: 'QRIS' },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onMetode(m.value)}
              className={`min-h-11 rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
                metode === m.value
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-stone-300 text-stone-600 hover:bg-stone-50'
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
            Uang dibayar
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
            <span>Kembalian</span>
            <span
              className={`font-bold ${uangKurang ? 'text-red-600' : 'text-emerald-700'}`}
            >
              {uangKurang
                ? `Kurang ${formatRupiah(total - dibayarNum)}`
                : formatRupiah(kembalian)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[10000, 20000, 50000, 100000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onDibayar(String(n))}
                className="min-h-9 rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-100"
              >
                {formatRupiah(n)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onDibayar(String(total))}
              disabled={total === 0}
              className="min-h-9 rounded-full border border-emerald-600 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Uang pas
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-stone-100 px-3 py-2.5 text-sm text-stone-600">
          QRIS: pembeli membayar tepat sebesar total — tidak ada kembalian.
          Pastikan pembayaran QRIS sudah masuk sebelum menekan Bayar.
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
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
          Kosongkan
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
          {bayarPending ? 'Memproses…' : 'Bayar'}
        </button>
      </div>
    </div>
  )
}

export default function KasirPage() {
  const queryClient = useQueryClient()
  const [cari, setCari] = useState('')
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

  const produkList = useMemo(() => {
    const semua = produkQuery.data ?? []
    const q = cari.trim().toLowerCase()
    if (!q) return semua
    return semua.filter((p) => p.nama.toLowerCase().includes(q))
  }, [produkQuery.data, cari])

  const total = keranjang.reduce(
    (sum, it) => sum + it.qty * it.produk.harga_jual,
    0,
  )
  const dibayarNum = Number(dibayar.replace(/[^0-9]/g, '')) || 0
  const kembalian = metode === 'tunai' ? Math.max(0, dibayarNum - total) : 0
  const uangKurang = metode === 'tunai' && total > 0 && dibayarNum < total

  function tambahKeKeranjang(p: Produk) {
    if (p.stok <= 0) {
      setError(`Stok "${p.nama}" habis.`)
      return
    }
    setError(null)
    setKeranjang((prev) => {
      const ada = prev.find((it) => it.produk.id === p.id)
      if (ada) {
        if (ada.qty + 1 > p.stok) {
          setError(`Stok "${p.nama}" hanya tersisa ${p.stok}.`)
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
            setError(`Stok "${it.produk.nama}" hanya tersisa ${it.produk.stok}.`)
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
          : 'Pembayaran gagal. Coba lagi.',
      )
    },
  })

  function handleBayar() {
    if (keranjang.length === 0) return
    if (metode === 'tunai' && dibayarNum < total) {
      setError('Uang dibayar kurang dari total.')
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
          <h1 className="text-2xl font-bold">Kasir</h1>
          {keranjang.length > 0 && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
              {keranjang.length} item di keranjang
            </span>
          )}
        </div>
        <div className="relative mb-3">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari produk… (mis. beras, kopi)"
            className="input pl-11"
          />
        </div>
        {produkQuery.isLoading && (
          <p className="text-stone-500">Memuat produk…</p>
        )}
        {produkQuery.isError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Gagal memuat produk:{' '}
            {produkQuery.error instanceof Error
              ? produkQuery.error.message
              : 'terjadi kesalahan.'}
          </p>
        )}
        {produkQuery.data && produkList.length === 0 && (
          <div className="card flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <IconProduk className="h-7 w-7" />
            </span>
            <p className="mt-3 font-semibold">
              {cari.trim()
                ? `Tidak ada produk yang cocok dengan “${cari}”.`
                : 'Belum ada produk.'}
            </p>
            <p className="mt-1 text-sm text-stone-500">
              {cari.trim()
                ? 'Coba kata kunci lain.'
                : 'Tambahkan produk dulu di menu Produk.'}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {produkList.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => tambahKeKeranjang(p)}
              disabled={p.stok <= 0}
              className="card min-w-0 p-3 text-left transition hover:border-emerald-500 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:p-4"
            >
              <div className="break-words font-semibold leading-snug">
                {p.nama}
              </div>
              <div className="mt-1 text-xs text-stone-500">
                {p.kategori?.nama ?? 'Tanpa kategori'} · per {p.satuan}
              </div>
              <div className="mt-2 text-base font-bold text-emerald-700 sm:text-lg">
                {formatRupiah(p.harga_jual)}
              </div>
              <div
                className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  p.stok <= 0
                    ? 'bg-stone-100 text-stone-500'
                    : p.stok <= 5
                      ? 'bg-red-100 text-red-700'
                      : 'bg-stone-100 text-stone-600'
                }`}
              >
                Stok {p.stok}
                {p.stok <= 5 && p.stok > 0 ? ' — hampir habis' : ''}
                {p.stok <= 0 ? ' — habis' : ''}
              </div>
            </button>
          ))}
        </div>
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 md:hidden">
            {error}
          </p>
        )}
      </section>

      {/* Keranjang & pembayaran — panel samping (layar sedang ke atas) */}
      <aside className="hidden h-fit md:block lg:sticky lg:top-24">
        <div className="card p-4 sm:p-5">
          <h2 className="text-lg font-bold">Keranjang</h2>
          <CartPanel {...cartProps} />
        </div>
      </aside>

      {/* Bar total menempel (HP saja): total + buka keranjang,
          mengambang di atas menu bawah. */}
      {keranjang.length > 0 && (
        <button
          type="button"
          onClick={() => setKeranjangTerbuka(true)}
          className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-lg transition active:scale-[0.99] no-print md:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <IconKeranjang className="h-5 w-5" />
            {keranjang.length} item
          </span>
          <span className="flex items-center gap-3">
            <span className="text-base font-bold">{formatRupiah(total)}</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">
              Keranjang
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
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
              <h2 className="text-lg font-bold">Keranjang</h2>
              <button
                type="button"
                aria-label="Tutup keranjang"
                onClick={() => setKeranjangTerbuka(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100"
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
