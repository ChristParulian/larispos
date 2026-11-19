// Halaman Tambah / Ubah Produk di halaman sendiri
// (rute /produk/tambah dan /produk/ubah/:id).
// Aturan peran sama seperti sebelumnya: kasir tidak melihat
// harga_beli, dan menyimpannya tanpa kolom harga_beli agar nilai
// di database tidak tertimpa null.

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  fetchKategori,
  fetchProduk,
  fetchSatuan,
  saveProduk,
} from '../lib/api'
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
  const { t } = useTranslation()
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
  const satuanQuery = useQuery({
    queryKey: ['satuan'],
    queryFn: fetchSatuan,
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
            ? t('tambahProduk.produkDiubah')
            : t('tambahProduk.produkDitambahkan'),
        },
      })
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t('tambahProduk.gagalSimpanProduk'),
      )
    },
  })

  function handleSimpan(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nama.trim()) {
      setError(t('tambahProduk.namaWajib'))
      return
    }
    if (form.harga_jual < 0) {
      setError(t('tambahProduk.hargaJualNegatif'))
      return
    }
    if (form.stok < 0) {
      setError(t('tambahProduk.stokNegatif'))
      return
    }
    simpanMutation.mutate()
  }

  const judul = isEdit
    ? t('tambahProduk.judulUbah')
    : t('produk.tambahProduk')

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/produk"
          aria-label={t('tambahProduk.ariaKembali')}
          className="icon-btn"
        >
          <IconBack className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="judul-halaman">{judul}</h1>
          <p className="text-sm text-stone-600">
            {isEdit
              ? t('tambahProduk.keteranganUbah')
              : t('tambahProduk.keteranganTambah')}
          </p>
        </div>
      </div>

      {isEdit && produkQuery.isLoading && (
        <p className="text-stone-600">{t('produk.memuatProduk')}</p>
      )}
      {isEdit && produkQuery.isError && (
        <div className="card p-5">
          <p className="text-sm text-red-700">
            {t('produk.gagalMuatProduk')}{' '}
            {produkQuery.error instanceof Error
              ? produkQuery.error.message
              : t('produk.galatUmum')}
          </p>
          <Link to="/produk" className="btn-secondary mt-4">
            {t('tambahProduk.kembaliKeDaftar')}
          </Link>
        </div>
      )}
      {isEdit && produkQuery.data && !produkEdit && (
        <div className="card p-5">
          <p className="font-medium">{t('galat.produkTidakDitemukan')}</p>
          <p className="mt-1 text-sm text-stone-600">
            {t('tambahProduk.mungkinDihapus')}
          </p>
          <Link to="/produk" className="btn-secondary mt-4">
            {t('tambahProduk.kembaliKeDaftar')}
          </Link>
        </div>
      )}

      {(!isEdit || produkEdit) && (
        <form onSubmit={handleSimpan} className="card p-4 sm:p-6">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="label">{t('tambahProduk.labelNama')}</span>
              <input
                className="input"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder={t('tambahProduk.placeholderNama')}
                autoFocus
              />
            </label>
            <label className="block">
              <span className="label">{t('umum.kategori')}</span>
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
                <option value="">{t('umum.tanpaKategori')}</option>
                {(kategoriQuery.data ?? []).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">{t('umum.satuan')}</span>
              <select
                className="input"
                value={form.satuan}
                onChange={(e) =>
                  setForm({ ...form, satuan: e.target.value })
                }
              >
                {(satuanQuery.data ?? []).map((s) => (
                  <option key={s.id} value={s.nama}>
                    {s.nama}
                  </option>
                ))}
                {/* Satuan produk ini tidak ada lagi di daftar: tetap
                    tampilkan agar nilainya tidak hilang saat diubah. */}
                {form.satuan &&
                  !(satuanQuery.data ?? []).some(
                    (s) => s.nama === form.satuan,
                  ) && (
                    <option value={form.satuan}>{form.satuan}</option>
                  )}
              </select>
            </label>
            {isOwner && (
              <label className="block">
                <span className="label">{t('tambahProduk.labelHargaBeli')}</span>
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
                  placeholder={t('tambahProduk.placeholderHargaBeli')}
                />
              </label>
            )}
            <label className="block">
              <span className="label">{t('tambahProduk.labelHargaJual')}</span>
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
              <span className="label">{t('umum.stok')}</span>
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
              {t('umum.batal')}
            </Link>
            <button
              type="submit"
              disabled={simpanMutation.isPending}
              className="btn-primary flex-1 sm:flex-none"
            >
              {simpanMutation.isPending
                ? t('tambahProduk.menyimpan')
                : t('tambahProduk.simpanProduk')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
