// Halaman Produk & Stok: daftar produk (cari + filter kategori,
// hapus produk yang belum pernah terjual), kelola kategori dan
// satuan (tambah / ubah / hapus), dan riwayat pergerakan stok
// (log_stok). Tambah / ubah produk lewat halaman sendiri
// (/produk/tambah dan /produk/ubah/:id).

import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchKategori,
  fetchLogStok,
  fetchProduk,
  fetchSatuan,
  hapusKategori,
  hapusProduk,
  hapusSatuan,
  saveKategori,
  saveSatuan,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatRupiah, formatTanggal } from '../lib/format'
import { IconPlus, IconProduk, IconSearch } from '../components/icons'

type Tab = 'produk' | 'kategori' | 'satuan' | 'log'

export default function ProdukPage() {
  // Harga beli hanya terlihat oleh owner (Tahap 2).
  const { isOwner } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('produk')
  const [cari, setCari] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Form kategori: tambah baru dan ubah sebaris (satu dalam satu waktu).
  const [namaBaru, setNamaBaru] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editNama, setEditNama] = useState('')
  // Form satuan, pola yang sama seperti kategori.
  const [namaSatuanBaru, setNamaSatuanBaru] = useState('')
  const [editSatuanId, setEditSatuanId] = useState<string | null>(null)
  const [editSatuanNama, setEditSatuanNama] = useState('')
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
  const satuanQuery = useQuery({
    queryKey: ['satuan'],
    queryFn: fetchSatuan,
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

  // Jumlah produk per kategori, untuk tab Kategori.
  const jumlahProduk = useMemo(() => {
    const hitung = new Map<string, number>()
    for (const p of produkQuery.data ?? []) {
      if (!p.kategori_id) continue
      hitung.set(p.kategori_id, (hitung.get(p.kategori_id) ?? 0) + 1)
    }
    return hitung
  }, [produkQuery.data])

  const simpanKategoriMutation = useMutation({
    mutationFn: (input: { nama: string; id?: string }) =>
      saveKategori(input.nama, input.id),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ['kategori'] })
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      setPesan(
        input.id
          ? 'Kategori berhasil diubah.'
          : 'Kategori berhasil ditambahkan.',
      )
      setError(null)
      setNamaBaru('')
      setEditId(null)
      setEditNama('')
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan kategori.',
      )
    },
  })

  const hapusKategoriMutation = useMutation({
    mutationFn: (id: string) => hapusKategori(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kategori'] })
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      setPesan('Kategori berhasil dihapus.')
      setError(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus kategori.',
      )
    },
  })

  function konfirmasiHapusKategori(id: string, nama: string) {
    const jumlah = jumlahProduk.get(id) ?? 0
    const peringatan =
      jumlah > 0
        ? ` ${jumlah} produk di dalamnya akan menjadi tanpa kategori.`
        : ''
    if (
      window.confirm(`Hapus kategori "${nama}"?${peringatan}`)
    ) {
      hapusKategoriMutation.mutate(id)
    }
  }

  // Jumlah produk per satuan (produk menyimpan satuannya sebagai
  // teks), untuk tab Satuan.
  const jumlahProdukSatuan = useMemo(() => {
    const hitung = new Map<string, number>()
    for (const p of produkQuery.data ?? []) {
      hitung.set(p.satuan, (hitung.get(p.satuan) ?? 0) + 1)
    }
    return hitung
  }, [produkQuery.data])

  const simpanSatuanMutation = useMutation({
    mutationFn: (input: { nama: string; id?: string }) =>
      saveSatuan(input.nama, input.id),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ['satuan'] })
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      setPesan(
        input.id
          ? 'Satuan berhasil diubah.'
          : 'Satuan berhasil ditambahkan.',
      )
      setError(null)
      setNamaSatuanBaru('')
      setEditSatuanId(null)
      setEditSatuanNama('')
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan satuan.',
      )
    },
  })

  const hapusSatuanMutation = useMutation({
    mutationFn: (id: string) => hapusSatuan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['satuan'] })
      setPesan('Satuan berhasil dihapus.')
      setError(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : 'Gagal menghapus satuan.',
      )
    },
  })

  function konfirmasiHapusSatuan(id: string, nama: string) {
    const jumlah = jumlahProdukSatuan.get(nama) ?? 0
    const peringatan =
      jumlah > 0
        ? ` ${jumlah} produk masih memakainya, tapi produk tersebut tetap menampilkan satuannya.`
        : ''
    if (
      window.confirm(`Hapus satuan "${nama}"?${peringatan}`)
    ) {
      hapusSatuanMutation.mutate(id)
    }
  }

  const sedangFilter = cari.trim() !== '' || filterKategori !== ''

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="judul-halaman">Produk &amp; Stok</h1>
          <p className="text-sm text-stone-600">
            {produkQuery.data
              ? `${produkTampil.length} dari ${produkQuery.data.length} produk`
              : 'Kelola daftar produk warung.'}
          </p>
        </div>
        <div className="flex flex-wrap rounded-lg bg-kertas-gelap p-1">
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
            onClick={() => setTab('kategori')}
            className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors ${
              tab === 'kategori'
                ? 'bg-pinus-800 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Kategori
          </button>
          <button
            type="button"
            onClick={() => setTab('satuan')}
            className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors ${
              tab === 'satuan'
                ? 'bg-pinus-800 text-white'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Satuan
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
              <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600" />
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
            <p className="text-stone-600">Memuat produk…</p>
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
              <p className="mt-1 text-sm text-stone-600">
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
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">Produk</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">Kategori</th>
                    {isOwner && (
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">
                        Harga Beli
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">
                      Harga Jual
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">Stok</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">Aksi</th>
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
                        <div className="text-xs text-stone-600">
                          per {p.satuan}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {p.kategori?.nama ?? '-'}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          {formatRupiah(p.harga_beli)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatRupiah(p.harga_jual)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${
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
                    <div className="mt-0.5 text-xs text-stone-600">
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
                    <span className="text-stone-600">
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

      {tab === 'kategori' && (
        <div className="card">
          <div className="border-b px-4 py-4 sm:px-5">
            <h2 className="font-bold">Kategori Produk</h2>
            <p className="text-sm text-stone-600">
              Kelompokkan produk agar mudah dicari di kasir dan difilter di
              daftar produk. Nama kategori tidak boleh sama.
            </p>
          </div>
          <form
            className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:px-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!namaBaru.trim()) return
              simpanKategoriMutation.mutate({ nama: namaBaru })
            }}
          >
            <input
              type="text"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              placeholder="Nama kategori baru"
              aria-label="Nama kategori baru"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={
                !namaBaru.trim() || simpanKategoriMutation.isPending
              }
              className="btn-primary sm:w-auto"
            >
              <IconPlus className="h-5 w-5" strokeWidth={2.2} />
              Tambah Kategori
            </button>
          </form>
          {kategoriQuery.isLoading && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              Memuat kategori…
            </p>
          )}
          {kategoriQuery.isError && (
            <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
              Gagal memuat kategori:{' '}
              {kategoriQuery.error instanceof Error
                ? kategoriQuery.error.message
                : 'terjadi kesalahan.'}
            </p>
          )}
          {kategoriQuery.data && kategoriQuery.data.length === 0 && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              Belum ada kategori. Tambahkan kategori pertama di atas agar
              produk bisa dikelompokkan.
            </p>
          )}
          <ul className="divide-y divide-garis">
            {(kategoriQuery.data ?? []).map((k) => {
              const jumlah = jumlahProduk.get(k.id) ?? 0
              const sedangUbah = editId === k.id
              return (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-sm sm:px-5"
                >
                  {sedangUbah ? (
                    <form
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!editNama.trim()) return
                        simpanKategoriMutation.mutate({
                          nama: editNama,
                          id: k.id,
                        })
                      }}
                    >
                      <input
                        type="text"
                        value={editNama}
                        onChange={(e) => setEditNama(e.target.value)}
                        aria-label="Nama kategori"
                        className="input min-w-40 flex-1"
                      />
                      <button
                        type="submit"
                        disabled={
                          !editNama.trim() ||
                          simpanKategoriMutation.isPending
                        }
                        className="inline-flex min-h-9 items-center rounded-lg bg-pinus-700 px-3 text-xs font-bold text-white hover:bg-pinus-800 disabled:opacity-50"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null)
                          setEditNama('')
                        }}
                        className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                      >
                        Batal
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <div className="break-words font-medium">{k.nama}</div>
                        <div className="text-xs text-stone-600">
                          {jumlah === 0
                            ? 'Belum ada produk'
                            : `${jumlah} produk`}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(k.id)
                            setEditNama(k.nama)
                            setError(null)
                          }}
                          className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            konfirmasiHapusKategori(k.id, k.nama)
                          }
                          className="inline-flex min-h-9 items-center rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {tab === 'satuan' && (
        <div className="card">
          <div className="border-b px-4 py-4 sm:px-5">
            <h2 className="font-bold">Satuan Produk</h2>
            <p className="text-sm text-stone-600">
              Daftar satuan yang bisa dipilih di form produk, misalnya pcs,
              kg, atau botol. Ubah nama satuan memperbarui produk yang
              memakainya; hapus satuan tidak mengubah produk yang ada.
            </p>
          </div>
          <form
            className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:px-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!namaSatuanBaru.trim()) return
              simpanSatuanMutation.mutate({ nama: namaSatuanBaru })
            }}
          >
            <input
              type="text"
              value={namaSatuanBaru}
              onChange={(e) => setNamaSatuanBaru(e.target.value)}
              placeholder="Nama satuan baru"
              aria-label="Nama satuan baru"
              className="input flex-1"
            />
            <button
              type="submit"
              disabled={
                !namaSatuanBaru.trim() || simpanSatuanMutation.isPending
              }
              className="btn-primary sm:w-auto"
            >
              <IconPlus className="h-5 w-5" strokeWidth={2.2} />
              Tambah Satuan
            </button>
          </form>
          {satuanQuery.isLoading && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              Memuat satuan…
            </p>
          )}
          {satuanQuery.isError && (
            <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
              Gagal memuat satuan:{' '}
              {satuanQuery.error instanceof Error
                ? satuanQuery.error.message
                : 'terjadi kesalahan.'}
            </p>
          )}
          {satuanQuery.data && satuanQuery.data.length === 0 && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              Belum ada satuan. Tambahkan satuan pertama di atas agar bisa
              dipilih di form produk.
            </p>
          )}
          <ul className="divide-y divide-garis">
            {(satuanQuery.data ?? []).map((s) => {
              const jumlah = jumlahProdukSatuan.get(s.nama) ?? 0
              const sedangUbah = editSatuanId === s.id
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-sm sm:px-5"
                >
                  {sedangUbah ? (
                    <form
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!editSatuanNama.trim()) return
                        simpanSatuanMutation.mutate({
                          nama: editSatuanNama,
                          id: s.id,
                        })
                      }}
                    >
                      <input
                        type="text"
                        value={editSatuanNama}
                        onChange={(e) => setEditSatuanNama(e.target.value)}
                        aria-label="Nama satuan"
                        className="input min-w-40 flex-1"
                      />
                      <button
                        type="submit"
                        disabled={
                          !editSatuanNama.trim() ||
                          simpanSatuanMutation.isPending
                        }
                        className="inline-flex min-h-9 items-center rounded-lg bg-pinus-700 px-3 text-xs font-bold text-white hover:bg-pinus-800 disabled:opacity-50"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditSatuanId(null)
                          setEditSatuanNama('')
                        }}
                        className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                      >
                        Batal
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <div className="break-words font-medium">{s.nama}</div>
                        <div className="text-xs text-stone-600">
                          {jumlah === 0
                            ? 'Belum ada produk'
                            : `${jumlah} produk`}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditSatuanId(s.id)
                            setEditSatuanNama(s.nama)
                            setError(null)
                          }}
                          className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            konfirmasiHapusSatuan(s.id, s.nama)
                          }
                          className="inline-flex min-h-9 items-center rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {tab === 'log' && (
        <div className="card">
          <div className="border-b px-4 py-4 sm:px-5">
            <h2 className="font-bold">Log Pergerakan Stok</h2>
            <p className="text-sm text-stone-600">
              100 perubahan stok terakhir. Penjualan mengurangi stok (negatif),
              restock / koreksi menambah (positif).
            </p>
          </div>
          {logQuery.isLoading && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
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
            <p className="px-4 py-4 text-stone-600 sm:px-5">
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
                  <div className="text-xs text-stone-600">
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
                  <div className="text-xs text-stone-600">
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
