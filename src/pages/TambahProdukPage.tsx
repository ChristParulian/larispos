// Halaman Tambah / Ubah Produk di halaman sendiri
// (rute /produk/tambah dan /produk/ubah/:id).
// Aturan peran sama seperti sebelumnya: kasir tidak melihat
// harga_beli, dan menyimpannya tanpa kolom harga_beli agar nilai
// di database tidak tertimpa null.

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchKategori, fetchProduk, saveProduk } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { ProdukInput } from '../lib/types'
import { IconBack } from '../components/icons'

const FORM_AWAL: ProdukInput = {
  nama: '',
  kategori_id: null,
  satuan: 'pcs',
  harga_beli: null,
  harga_jual: 0,
  stok: 0,
}

export default function TambahProdukPage() {
  const { id } = useParams<{ id: string }>()
  const editId = id ?? null
  const isEdit = editId !== null
  const { isOwner } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProdukInput>(FORM_AWAL)
  const [error, setError] = useState<string | null>(null)
  const prefillUntuk = useRef<string | null>(null)

  const kategoriQuery = useQuery({
    queryKey: ['kategori'],
    queryFn: fetchKategori,
  })
  const produkQuery = useQuery({
    queryKey: ['produk'],
    queryFn: fetchProduk,
    enabled: isEdit,
  })

  const produkEdit = isEdit
    ? (produkQuery.data ?? []).find((p) => p.id === editId)
    : undefined

  // Prefill sekali saat produk yang diubah termuat; kembali ke form
  // kosong saat pindah ke mode tambah.
  useEffect(() => {
    if (!isEdit) {
      setForm(FORM_AWAL)
      prefillUntuk.current = null
      return
    }
    if (produkEdit && prefillUntuk.current !== editId) {
      prefillUntuk.current = editId
      setForm({
        nama: produkEdit.nama,
        kategori_id: produkEdit.kategori_id,
        satuan: produkEdit.satuan,
        // Kasir tidak melihat harga beli; nilainya tidak dikirim saat
        // simpan (includeHargaBeli: false) agar tidak tertimpa null.
        harga_beli: isOwner ? produkEdit.harga_beli : null,
        harga_jual: produkEdit.harga_jual,
        stok: produkEdit.stok,
      })
    }
  }, [isEdit, editId, produkEdit, isOwner])

  const simpanMutation = useMutation({
    mutationFn: () =>
      saveProduk(form, editId ?? undefined, {
        includeHargaBeli: isOwner,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      navigate('/produk', {
        state: {
          pesan: isEdit
            ? 'Produk berhasil diubah.'
            : 'Produk berhasil ditambahkan.',
        },
      })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan produk.')
    },
  })

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

  const judul = isEdit ? 'Ubah Produk' : 'Tambah Produk'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/produk"
          aria-label="Kembali ke daftar produk"
          className="icon-btn"
        >
          <IconBack className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold leading-tight">{judul}</h1>
          <p className="text-sm text-stone-500">
            {isEdit
              ? 'Ubah detail produk, lalu simpan.'
              : 'Isi detail produk baru untuk dijual di kasir.'}
          </p>
        </div>
      </div>

      {isEdit && produkQuery.isLoading && (
        <p className="text-stone-500">Memuat produk…</p>
      )}
      {isEdit && produkQuery.isError && (
        <div className="card p-5">
          <p className="text-sm text-red-700">
            Gagal memuat produk:{' '}
            {produkQuery.error instanceof Error
              ? produkQuery.error.message
              : 'terjadi kesalahan.'}
          </p>
          <Link to="/produk" className="btn-secondary mt-4">
            Kembali ke Daftar Produk
          </Link>
        </div>
      )}
      {isEdit && produkQuery.data && !produkEdit && (
        <div className="card p-5">
          <p className="font-medium">Produk tidak ditemukan.</p>
          <p className="mt-1 text-sm text-stone-500">
            Produk ini mungkin sudah dihapus.
          </p>
          <Link to="/produk" className="btn-secondary mt-4">
            Kembali ke Daftar Produk
          </Link>
        </div>
      )}

      {(!isEdit || produkEdit) && (
        <form onSubmit={handleSimpan} className="card p-4 sm:p-6">
          {error && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="label">Nama produk *</span>
              <input
                className="input"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="mis. Beras Premium 5 kg"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="label">Kategori</span>
              <select
                className="input"
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
              <span className="label">Satuan</span>
              <input
                className="input"
                value={form.satuan}
                onChange={(e) =>
                  setForm({ ...form, satuan: e.target.value })
                }
                placeholder="pcs, kg, botol…"
              />
            </label>
            {isOwner && (
              <label className="block">
                <span className="label">Harga beli (boleh kosong)</span>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.harga_beli ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      harga_beli:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="Isi agar laba bisa dihitung"
                />
              </label>
            )}
            <label className="block">
              <span className="label">Harga jual *</span>
              <input
                className="input"
                type="number"
                inputMode="numeric"
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
              <span className="label">Stok</span>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.stok}
                onChange={(e) =>
                  setForm({ ...form, stok: Number(e.target.value) })
                }
              />
            </label>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <Link to="/produk" className="btn-secondary flex-1 sm:flex-none">
              Batal
            </Link>
            <button
              type="submit"
              disabled={simpanMutation.isPending}
              className="btn-primary flex-1 sm:flex-none"
            >
              {simpanMutation.isPending ? 'Menyimpan…' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
