// Halaman Produk & Stok (hanya daftar): cari + filter kategori,
// hapus produk yang belum pernah terjual, dan riwayat pergerakan
// stok (log_stok). Tambah / ubah produk lewat halaman sendiri
// (/produk/tambah dan /produk/ubah/:id).

import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchKategori,
  fetchLogStok,
  fetchProduk,
  hapusProduk,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatRupiah, formatTanggal } from '../lib/format'
import { IconPlus, IconProduk, IconSearch } from '../components/icons'

type Tab = 'produk' | 'log'

export default function ProdukPage() {
  // Harga beli hanya terlihat oleh owner (Tahap 2).
  const { isOwner } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('produk')
  const [cari, setCari] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Pesan sukses dari halaman tambah/ubah produk (location state).
  const [pesan, setPesan] = useState<string | null>(
    () =>
      (location.state as { pesan?: string } | null)?.pesan ?? null,
  )

  const produkQuery = useQuery({ queryKey: ['produk'], queryFn: fetchProduk })
  const kategoriQuery = useQuery({
    queryKey: ['kategori'],
    queryFn: fetchKategori,
  })
  const logQuery = useQuery({
    queryKey: ['log-stok'],
    queryFn: () => fetchLogStok(100),
    enabled: tab === 'log',
  })

  const produkTampil = useMemo(() => {
    const semua = produkQuery.data ?? []
    const q = cari.trim().toLowerCase()
    return semua.filter((p) => {
      if (filterKategori && p.kategori_id !== filterKategori) return false
      if (q && !p.nama.toLowerCase().includes(q)) return false
      return true
    })
  }, [produkQuery.data, cari, filterKategori])

  const hapusMutation = useMutation({
    mutationFn: (id: string) => hapusProduk(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      setPesan('Produk berhasil dihapus.')
      setError(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal menghapus produk.')
    },
  })

  function konfirmasiHapus(id: string, nama: string) {
    if (
      window.confirm(
        `Hapus produk "${nama}"? Produk yang pernah terjual tidak bisa dihapus.`,
      )
    ) {
      hapusMutation.mutate(id)
    }
  }

  const sedangFilter = cari.trim() !== '' || filterKategori !== ''

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="judul-halaman">Produk &amp; Stok</h1>
          <p className="text-sm text-stone-500">
            {produkQuery.data
              ? `${produkTampil.length} dari ${produkQuery.data.length} produk`
              : 'Kelola daftar produk warung.'}
          </p>
        </div>
        <div className="flex rounded-lg bg-kertas-gelap p-1">
          <button
            type="button"
            onClick={() => setTab('produk')}
            className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors ${
              tab === 'produk'
                ? 'bg-pinus-800 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Daftar Produk
          </button>
          <button
            type="button"
            onClick={() => setTab('log')}
            className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors ${
              tab === 'log'
                ? 'bg-pinus-800 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Log Stok
          </button>
        </div>
      </div>

      {pesan && (
        <p className="mb-3 rounded-lg bg-pinus-50 px-4 py-3 text-sm text-pinus-800">
          {pesan}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {tab === 'produk' && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari produk…"
                className="input pl-11"
              />
            </div>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="input sm:w-52"
              aria-label="Filter kategori"
            >
              <option value="">Semua kategori</option>
              {(kategoriQuery.data ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            <Link to="/produk/tambah" className="btn-primary sm:w-auto">
              <IconPlus className="h-5 w-5" strokeWidth={2.2} />
              Tambah Produk
            </Link>
          </div>

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
          {produkQuery.data && produkTampil.length === 0 && (
            <div className="card flex flex-col items-center px-6 py-10 text-center">
              <IconProduk className="h-10 w-10 text-pinus-300" strokeWidth={1.5} />
              <p className="mt-3 font-semibold">
                {sedangFilter
                  ? 'Tidak ada produk yang cocok.'
                  : 'Belum ada produk.'}
              </p>
              <p className="mt-1 text-sm text-stone-500">
                {sedangFilter
                  ? 'Coba kata kunci atau kategori lain.'
                  : 'Tambahkan produk pertama agar bisa dijual di kasir.'}
              </p>
              {!sedangFilter && (
                <Link to="/produk/tambah" className="btn-primary mt-4">
                  <IconPlus className="h-5 w-5" strokeWidth={2.2} />
                  Tambah Produk
                </Link>
              )}
            </div>
          )}

          {/* Tabel untuk layar besar, kartu untuk HP */}
          {produkTampil.length > 0 && (
            <div className="card hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-kertas text-left">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-500">Produk</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-500">Kategori</th>
                    {isOwner && (
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-500">
                        Harga Beli
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-500">
                      Harga Jual
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-500">Stok</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {produkTampil.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b transition-colors last:border-0 hover:bg-kertas"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.nama}</div>
                        <div className="text-xs text-stone-500">
                          per {p.satuan}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {p.kategori?.nama ?? '—'}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          {formatRupiah(p.harga_beli)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-500">
                        {formatRupiah(p.harga_jual)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-500 ${
                          p.stok <= 5 ? 'text-red-600' : ''
                        }`}
                      >
                        {p.stok}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            to={`/produk/ubah/${p.id}`}
                            className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                          >
                            Ubah
                          </Link>
                          <button
                            type="button"
                            onClick={() => konfirmasiHapus(p.id, p.nama)}
                            className="inline-flex min-h-9 items-center rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="space-y-3 md:hidden">
            {produkTampil.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="break-words font-semibold leading-snug">
                      {p.nama}
                    </div>
                    <div className="mt-0.5 text-xs text-stone-500">
                      {p.kategori?.nama ?? 'Tanpa kategori'} · per {p.satuan}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${
                      p.stok <= 5
                        ? 'bg-red-100 text-red-700'
                        : 'bg-kertas-gelap text-stone-700'
                    }`}
                  >
                    Stok {p.stok}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
                  {isOwner ? (
                    <span className="text-stone-500">
                      Beli {formatRupiah(p.harga_beli)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="text-base font-bold text-pinus-700">
                    {formatRupiah(p.harga_jual)}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    to={`/produk/ubah/${p.id}`}
                    className="btn-secondary min-h-10 flex-1 py-2"
                  >
                    Ubah
                  </Link>
                  <button
                    type="button"
                    onClick={() => konfirmasiHapus(p.id, p.nama)}
                    className="btn-danger-outline min-h-10 flex-1 py-2"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className="card">
          <div className="border-b px-4 py-4 sm:px-5">
            <h2 className="font-bold">Log Pergerakan Stok</h2>
            <p className="text-sm text-stone-500">
              100 perubahan stok terakhir. Penjualan mengurangi stok (negatif),
              restock / koreksi menambah (positif).
            </p>
          </div>
          {logQuery.isLoading && (
            <p className="px-4 py-4 text-stone-500 sm:px-5">
              Memuat log stok…
            </p>
          )}
          {logQuery.isError && (
            <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
              Gagal memuat log stok:{' '}
              {logQuery.error instanceof Error
                ? logQuery.error.message
                : 'terjadi kesalahan.'}
            </p>
          )}
          {logQuery.data && logQuery.data.length === 0 && (
            <p className="px-4 py-4 text-stone-500 sm:px-5">
              Belum ada pergerakan stok.
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
                    {l.produk?.nama ?? 'Produk dihapus'}
                  </div>
                  <div className="text-xs text-stone-500">
                    {formatTanggal(l.created_at)} · {l.alasan}
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
                  <div className="text-xs text-stone-500">
                    {l.stok_sebelum} → {l.stok_sesudah}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
