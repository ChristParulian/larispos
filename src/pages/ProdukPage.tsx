// Halaman Produk & Stok: daftar produk (cari + filter kategori),
// tambah / ubah produk, hapus produk yang belum pernah terjual,
// dan riwayat pergerakan stok (log_stok).

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchKategori,
  fetchLogStok,
  fetchProduk,
  hapusProduk,
  saveProduk,
} from '../lib/api'
import type { Produk, ProdukInput } from '../lib/types'
import { formatRupiah, formatTanggal } from '../lib/format'

const FORM_AWAL: ProdukInput = {
  nama: '',
  kategori_id: null,
  satuan: 'pcs',
  harga_beli: null,
  harga_jual: 0,
  stok: 0,
}

type Tab = 'produk' | 'log'

export default function ProdukPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('produk')
  const [cari, setCari] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [form, setForm] = useState<ProdukInput>(FORM_AWAL)
  const [editId, setEditId] = useState<string | null>(null)
  const [tampilForm, setTampilForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

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

  const simpanMutation = useMutation({
    mutationFn: () => saveProduk(form, editId ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      setPesan(editId ? 'Produk berhasil diubah.' : 'Produk berhasil ditambahkan.')
      setError(null)
      setTampilForm(false)
      setEditId(null)
      setForm(FORM_AWAL)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : 'Gagal menyimpan produk.',
      )
    },
  })

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

  function mulaiTambah() {
    setForm(FORM_AWAL)
    setEditId(null)
    setError(null)
    setPesan(null)
    setTampilForm(true)
  }

  function mulaiEdit(p: Produk) {
    setForm({
      nama: p.nama,
      kategori_id: p.kategori_id,
      satuan: p.satuan,
      harga_beli: p.harga_beli,
      harga_jual: p.harga_jual,
      stok: p.stok,
    })
    setEditId(p.id)
    setError(null)
    setPesan(null)
    setTampilForm(true)
  }

  function handleSimpan(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nama.trim()) {
      setError('Nama produk wajib diisi.')
      return
    }
    if (form.harga_jual < 0) {
      setError('Harga jual tidak boleh negatif.')
      return
    }
    if (form.stok < 0) {
      setError('Stok tidak boleh negatif.')
      return
    }
    simpanMutation.mutate()
  }

  const inputCls =
    'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Produk &amp; Stok</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('produk')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === 'produk'
                ? 'bg-emerald-700 text-white'
                : 'border border-stone-300 bg-white text-stone-700'
            }`}
          >
            Daftar Produk
          </button>
          <button
            type="button"
            onClick={() => setTab('log')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === 'log'
                ? 'bg-emerald-700 text-white'
                : 'border border-stone-300 bg-white text-stone-700'
            }`}
          >
            Log Stok
          </button>
        </div>
      </div>

      {pesan && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {pesan}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {tab === 'produk' && (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari produk…"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2.5"
              aria-label="Filter kategori"
            >
              <option value="">Semua kategori</option>
              {(kategoriQuery.data ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={mulaiTambah}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              + Tambah Produk
            </button>
          </div>

          {tampilForm && (
            <form
              onSubmit={handleSimpan}
              className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-bold">
                {editId ? 'Ubah Produk' : 'Tambah Produk'}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium">Nama produk *</span>
                  <input
                    className={inputCls}
                    value={form.nama}
                    onChange={(e) =>
                      setForm({ ...form, nama: e.target.value })
                    }
                    placeholder="mis. Beras Premium 5 kg"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Kategori</span>
                  <select
                    className={inputCls}
                    value={form.kategori_id ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        kategori_id: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Tanpa kategori</option>
                    {(kategoriQuery.data ?? []).map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Satuan</span>
                  <input
                    className={inputCls}
                    value={form.satuan}
                    onChange={(e) =>
                      setForm({ ...form, satuan: e.target.value })
                    }
                    placeholder="pcs, kg, botol…"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">
                    Harga beli (boleh kosong)
                  </span>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={form.harga_beli ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        harga_beli:
                          e.target.value === ''
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    placeholder="Isi agar laba bisa dihitung"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Harga jual *</span>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={form.harga_jual}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        harga_jual: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Stok</span>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    value={form.stok}
                    onChange={(e) =>
                      setForm({ ...form, stok: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={simpanMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {simpanMutation.isPending ? 'Menyimpan…' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTampilForm(false)
                    setEditId(null)
                  }}
                  className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

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
            <p className="text-stone-500">Tidak ada produk yang cocok.</p>
          )}

          {/* Tabel untuk layar besar, kartu untuk HP */}
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-stone-50 text-left">
                  <th className="px-4 py-3 font-semibold">Produk</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Harga Beli
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Harga Jual
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Stok</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {produkTampil.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nama}</div>
                      <div className="text-xs text-stone-500">
                        per {p.satuan}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {p.kategori?.nama ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatRupiah(p.harga_beli)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatRupiah(p.harga_jual)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        p.stok <= 5 ? 'text-red-600' : ''
                      }`}
                    >
                      {p.stok}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => mulaiEdit(p)}
                          className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold hover:bg-stone-100"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Hapus produk "${p.nama}"? Produk yang pernah terjual tidak bisa dihapus.`,
                              )
                            ) {
                              hapusMutation.mutate(p.id)
                            }
                          }}
                          className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
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

          <div className="space-y-3 md:hidden">
            {produkTampil.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.nama}</div>
                    <div className="text-xs text-stone-500">
                      {p.kategori?.nama ?? 'Tanpa kategori'} · per {p.satuan}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.stok <= 5
                        ? 'bg-red-100 text-red-700'
                        : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    Stok {p.stok}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-stone-500">
                    Beli: {formatRupiah(p.harga_beli)}
                  </span>
                  <span className="font-semibold">
                    Jual: {formatRupiah(p.harga_jual)}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => mulaiEdit(p)}
                    className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold hover:bg-stone-100"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Hapus produk "${p.nama}"? Produk yang pernah terjual tidak bisa dihapus.`,
                        )
                      ) {
                        hapusMutation.mutate(p.id)
                      }
                    }}
                    className="flex-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
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
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="font-bold">Log Pergerakan Stok</h2>
            <p className="text-sm text-stone-500">
              100 perubahan stok terakhir. Penjualan mengurangi stok (negatif),
              restock / koreksi menambah (positif).
            </p>
          </div>
          {logQuery.isLoading && (
            <p className="px-4 py-3 text-stone-500">Memuat log stok…</p>
          )}
          {logQuery.isError && (
            <p className="px-4 py-3 text-sm text-red-700">
              Gagal memuat log stok:{' '}
              {logQuery.error instanceof Error
                ? logQuery.error.message
                : 'terjadi kesalahan.'}
            </p>
          )}
          {logQuery.data && logQuery.data.length === 0 && (
            <p className="px-4 py-3 text-stone-500">
              Belum ada pergerakan stok.
            </p>
          )}
          <ul className="divide-y divide-stone-100">
            {(logQuery.data ?? []).map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {l.produk?.nama ?? 'Produk dihapus'}
                  </div>
                  <div className="text-xs text-stone-500">
                    {formatTanggal(l.created_at)} · {l.alasan}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${
                      l.perubahan < 0 ? 'text-red-600' : 'text-emerald-700'
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
