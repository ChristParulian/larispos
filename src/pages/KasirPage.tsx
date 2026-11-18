// Halaman Kasir: cari produk, keranjang, bayar Tunai / QRIS.
// Checkout lewat RPC buat_transaksi() — harga & total dihitung ulang
// di database. Setelah bayar, struk digital ditampilkan.

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checkout, fetchProduk } from '../lib/api'
import type { CartItem, CheckoutResult, Produk } from '../lib/types'
import { formatRupiah } from '../lib/format'
import Struk from '../components/Struk'

export default function KasirPage() {
  const queryClient = useQueryClient()
  const [cari, setCari] = useState('')
  const [keranjang, setKeranjang] = useState<CartItem[]>([])
  const [metode, setMetode] = useState<'tunai' | 'qris'>('tunai')
  const [dibayar, setDibayar] = useState('')
  const [error, setError] = useState<string | null>(null)
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

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Daftar produk */}
      <section>
        <h1 className="mb-3 text-2xl font-bold">Kasir</h1>
        <input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari produk… (mis. beras, kopi)"
          className="mb-3 w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
        {produkQuery.isLoading && (
          <p className="text-stone-500">Memuat produk…</p>
        )}
        {produkQuery.isError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            Gagal memuat produk:{' '}
            {produkQuery.error instanceof Error
              ? produkQuery.error.message
              : 'terjadi kesalahan.'}
          </p>
        )}
        {produkQuery.data && produkList.length === 0 && (
          <p className="text-stone-500">
            Tidak ada produk yang cocok dengan “{cari}”.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {produkList.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => tambahKeKeranjang(p)}
              disabled={p.stok <= 0}
              className="rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition hover:border-emerald-500 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="font-medium leading-snug">{p.nama}</div>
              <div className="mt-1 text-sm text-stone-500">
                {p.kategori?.nama ?? 'Tanpa kategori'} · per {p.satuan}
              </div>
              <div className="mt-2 text-base font-bold text-emerald-700">
                {formatRupiah(p.harga_jual)}
              </div>
              <div
                className={`mt-1 text-xs font-medium ${
                  p.stok <= 5 ? 'text-red-600' : 'text-stone-500'
                }`}
              >
                Stok: {p.stok}
                {p.stok <= 5 && p.stok > 0 ? ' — hampir habis' : ''}
                {p.stok <= 0 ? ' — habis' : ''}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Keranjang & pembayaran */}
      <aside className="h-fit rounded-xl border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">Keranjang</h2>
        {keranjang.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">
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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Kurangi ${it.produk.nama}`}
                    onClick={() => ubahQty(it.produk.id, -1)}
                    className="h-8 w-8 rounded-lg border border-stone-300 text-lg font-bold hover:bg-stone-100"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">
                    {it.qty}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tambah ${it.produk.nama}`}
                    onClick={() => ubahQty(it.produk.id, 1)}
                    className="h-8 w-8 rounded-lg border border-stone-300 text-lg font-bold hover:bg-stone-100"
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
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(
              [
                { value: 'tunai', label: 'Tunai' },
                { value: 'qris', label: 'QRIS' },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMetode(m.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
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
          <div className="mt-3">
            <label
              htmlFor="dibayar"
              className="text-sm font-medium"
            >
              Uang dibayar
            </label>
            <input
              id="dibayar"
              type="text"
              inputMode="numeric"
              value={dibayar}
              onChange={(e) =>
                setDibayar(e.target.value.replace(/[^0-9]/g, ''))
              }
              placeholder="0"
              className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-lg outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
                  onClick={() => setDibayar(String(n))}
                  className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium hover:bg-stone-100"
                >
                  {formatRupiah(n)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setDibayar(String(total))}
                disabled={total === 0}
                className="rounded-full border border-emerald-600 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                Uang pas
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-600">
            QRIS: pembeli membayar tepat sebesar total — tidak ada kembalian.
            Pastikan pembayaran QRIS sudah masuk sebelum menekan Bayar.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setKeranjang([])
              setDibayar('')
              setError(null)
            }}
            disabled={keranjang.length === 0}
            className="rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
          >
            Kosongkan
          </button>
          <button
            type="button"
            onClick={handleBayar}
            disabled={
              keranjang.length === 0 ||
              bayarMutation.isPending ||
              (metode === 'tunai' && dibayarNum < total)
            }
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bayarMutation.isPending ? 'Memproses…' : 'Bayar'}
          </button>
        </div>
      </aside>

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
