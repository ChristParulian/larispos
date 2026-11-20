// Halaman Produk & Stok: daftar produk (cari + filter kategori,
// tambah stok yang tercatat di log), kelola kategori dan satuan,
// dan riwayat pergerakan stok (log_stok). Tambah / ubah / hapus
// produk, kategori, dan satuan hanya untuk owner; kasir hanya
// bisa melihat daftar dan menambah stok. Tambah / ubah produk
// lewat halaman sendiri (/produk/tambah dan /produk/ubah/:id).

import { Fragment, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
  tambahStok,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatRupiah, formatTanggal } from '../lib/format'
import { IconPlus, IconProduk, IconSearch } from '../components/icons'
import type { Produk } from '../lib/types'

type Tab = 'produk' | 'kategori' | 'satuan' | 'log'

/** Form restock sebaris: jumlah yang masuk + catatan opsional.
    Dipakai di tabel (layar besar) dan kartu (HP). */
function FormTambahStok({
  produk,
  sibuk,
  onSimpan,
  onBatal,
}: {
  produk: Produk
  sibuk: boolean
  onSimpan: (jumlah: number, catatan?: string) => void
  onBatal: () => void
}) {
  const { t } = useTranslation()
  const [jumlah, setJumlah] = useState('')
  const [catatan, setCatatan] = useState('')
  const [errorLokal, setErrorLokal] = useState<string | null>(null)

  function simpan() {
    const n = Number(jumlah)
    if (!jumlah.trim() || !Number.isInteger(n) || n < 1) {
      setErrorLokal(t('produk.jumlahBulatMinimal'))
      return
    }
    setErrorLokal(null)
    onSimpan(n, catatan.trim() ? catatan.trim() : undefined)
  }

  return (
    <div>
      <p className="text-sm text-stone-600">
        {t('produk.stokSekarang')}{' '}
        <span className="font-semibold text-tinta">
          {produk.stok} {produk.satuan}
        </span>
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder={t('produk.placeholderJumlahMasuk')}
          aria-label={t('produk.ariaJumlahMasuk')}
          className="input sm:w-44"
        />
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder={t('produk.placeholderCatatan')}
          aria-label={t('produk.ariaCatatanRestock')}
          className="input flex-1"
        />
      </div>
      {errorLokal && <p className="mt-2 text-sm text-red-700">{errorLokal}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={sibuk}
          onClick={simpan}
          className="btn-primary min-h-11 px-5"
        >
          {t('umum.simpan')}
        </button>
        <button
          type="button"
          onClick={onBatal}
          className="btn-secondary min-h-11 px-4"
        >
          {t('umum.batal')}
        </button>
      </div>
    </div>
  )
}

export default function ProdukPage() {
  // Harga beli hanya terlihat oleh owner (Tahap 2).
  const { t } = useTranslation()
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
    () => (location.state as { pesan?: string } | null)?.pesan ?? null,
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
      setPesan(t('produk.produkDihapus'))
      setError(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t('produk.gagalHapusProduk'),
      )
    },
  })

  // Form tambah stok: satu produk dalam satu waktu.
  const [stokId, setStokId] = useState<string | null>(null)

  const stokMutation = useMutation({
    mutationFn: ({
      id,
      jumlah,
      catatan,
    }: {
      id: string
      jumlah: number
      catatan?: string
    }) => tambahStok(id, jumlah, catatan),
    onSuccess: (stokBaru, v) => {
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      void queryClient.invalidateQueries({ queryKey: ['log-stok'] })
      const nama =
        produkQuery.data?.find((p) => p.id === v.id)?.nama ?? t('umum.produk')
      setPesan(
        t('produk.stokBertambah', {
          nama,
          jumlah: v.jumlah,
          stokBaru,
        }),
      )
      setError(null)
      setStokId(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t('produk.gagalTambahStok'))
    },
  })

  function konfirmasiHapus(id: string, nama: string) {
    if (window.confirm(t('produk.konfirmasiHapusProduk', { nama }))) {
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
        input.id ? t('produk.kategoriDiubah') : t('produk.kategoriDitambahkan'),
      )
      setError(null)
      setNamaBaru('')
      setEditId(null)
      setEditNama('')
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t('produk.gagalSimpanKategori'),
      )
    },
  })

  const hapusKategoriMutation = useMutation({
    mutationFn: (id: string) => hapusKategori(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kategori'] })
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      setPesan(t('produk.kategoriDihapus'))
      setError(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t('produk.gagalHapusKategori'),
      )
    },
  })

  function konfirmasiHapusKategori(id: string, nama: string) {
    const jumlah = jumlahProduk.get(id) ?? 0
    const pesanKonfirmasi =
      jumlah > 0
        ? t('produk.konfirmasiHapusKategoriDenganProduk', {
            nama,
            count: jumlah,
          })
        : t('produk.konfirmasiHapusKategori', { nama })
    if (window.confirm(pesanKonfirmasi)) {
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
        input.id ? t('produk.satuanDiubah') : t('produk.satuanDitambahkan'),
      )
      setError(null)
      setNamaSatuanBaru('')
      setEditSatuanId(null)
      setEditSatuanNama('')
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t('produk.gagalSimpanSatuan'),
      )
    },
  })

  const hapusSatuanMutation = useMutation({
    mutationFn: (id: string) => hapusSatuan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['satuan'] })
      setPesan(t('produk.satuanDihapus'))
      setError(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t('produk.gagalHapusSatuan'),
      )
    },
  })

  function konfirmasiHapusSatuan(id: string, nama: string) {
    const jumlah = jumlahProdukSatuan.get(nama) ?? 0
    const pesanKonfirmasi =
      jumlah > 0
        ? t('produk.konfirmasiHapusSatuanDenganProduk', {
            nama,
            count: jumlah,
          })
        : t('produk.konfirmasiHapusSatuan', { nama })
    if (window.confirm(pesanKonfirmasi)) {
      hapusSatuanMutation.mutate(id)
    }
  }

  // Alasan log yang dikenal diterjemahkan; catatan bebas pengguna
  // ditampilkan apa adanya.
  function alasanTampil(alasan: string): string {
    switch (alasan) {
      case 'penjualan':
        return t('produk.alasanPenjualan')
      case 'restock':
        return t('produk.alasanRestock')
      case 'batal transaksi':
        return t('produk.alasanBatal')
      case 'ubah transaksi':
        return t('produk.alasanUbah')
      default:
        return alasan
    }
  }

  const sedangFilter = cari.trim() !== '' || filterKategori !== ''

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="judul-halaman">{t('produk.judul')}</h1>
          <p className="text-sm text-stone-600">
            {produkQuery.data
              ? t('produk.ringkasanProduk', {
                  count: produkQuery.data.length,
                  tampil: produkTampil.length,
                  total: produkQuery.data.length,
                })
              : t('produk.keterangan')}
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
            {t('produk.tabDaftarProduk')}
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
            {t('umum.kategori')}
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
            {t('umum.satuan')}
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
            {t('produk.tabLogStok')}
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
                placeholder={t('produk.placeholderCari')}
                aria-label={t('produk.placeholderCari')}
                className="input pl-11"
              />
            </div>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="input sm:w-52"
              aria-label={t('produk.ariaFilterKategori')}
            >
              <option value="">{t('produk.semuaKategori')}</option>
              {(kategoriQuery.data ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            {isOwner && (
              <Link to="/produk/tambah" className="btn-primary sm:w-auto">
                <IconPlus className="h-5 w-5" strokeWidth={2.2} />
                {t('produk.tambahProduk')}
              </Link>
            )}
          </div>

          {produkQuery.isLoading && (
            <p className="text-stone-600">{t('produk.memuatProduk')}</p>
          )}
          {produkQuery.isError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {t('produk.gagalMuatProduk')}{' '}
              {produkQuery.error instanceof Error
                ? produkQuery.error.message
                : t('produk.galatUmum')}
            </p>
          )}
          {produkQuery.data && produkTampil.length === 0 && (
            <div className="card flex flex-col items-center px-6 py-10 text-center">
              <IconProduk
                className="h-10 w-10 text-pinus-300"
                strokeWidth={1.5}
              />
              <p className="mt-3 font-semibold">
                {sedangFilter
                  ? t('produk.tidakAdaYangCocok')
                  : t('produk.belumAdaProduk')}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {sedangFilter
                  ? t('produk.cobaKataKunciLain')
                  : isOwner
                    ? t('produk.tambahPertama')
                    : t('produk.produkOlehOwner')}
              </p>
              {isOwner && !sedangFilter && (
                <Link to="/produk/tambah" className="btn-primary mt-4">
                  <IconPlus className="h-5 w-5" strokeWidth={2.2} />
                  {t('produk.tambahProduk')}
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
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">
                      {t('umum.produk')}
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">
                      {t('umum.kategori')}
                    </th>
                    {isOwner && (
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">
                        {t('produk.hargaBeli')}
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">
                      {t('produk.hargaJual')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-stone-600">
                      {t('umum.stok')}
                    </th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-600">
                      {t('produk.aksi')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {produkTampil.map((p) => (
                    <Fragment key={p.id}>
                      <tr className="border-b transition-colors last:border-0 hover:bg-kertas">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.nama}</div>
                          <div className="text-xs text-stone-600">
                            {t('produk.perSatuan', { satuan: p.satuan })}
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
                            <button
                              type="button"
                              onClick={() =>
                                setStokId(stokId === p.id ? null : p.id)
                              }
                              className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                            >
                              {t('produk.tambahStok')}
                            </button>
                            {isOwner && (
                              <>
                                <Link
                                  to={`/produk/ubah/${p.id}`}
                                  className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                                >
                                  {t('umum.ubah')}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => konfirmasiHapus(p.id, p.nama)}
                                  className="inline-flex min-h-9 items-center rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                                >
                                  {t('umum.hapus')}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {stokId === p.id && (
                        <tr className="border-b bg-kertas">
                          <td colSpan={isOwner ? 6 : 5} className="px-4 py-4">
                            <FormTambahStok
                              produk={p}
                              sibuk={stokMutation.isPending}
                              onSimpan={(jumlah, catatan) =>
                                stokMutation.mutate({
                                  id: p.id,
                                  jumlah,
                                  catatan,
                                })
                              }
                              onBatal={() => setStokId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
                      {p.kategori?.nama ?? t('umum.tanpaKategori')} ·{' '}
                      {t('produk.perSatuan', { satuan: p.satuan })}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-bold ${
                      p.stok <= 5
                        ? 'bg-red-100 text-red-700'
                        : 'bg-kertas-gelap text-stone-700'
                    }`}
                  >
                    {t('produk.badgeStok', { jumlah: p.stok })}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
                  {isOwner ? (
                    <span className="text-stone-600">
                      {t('produk.hargaBeliSingkat', {
                        harga: formatRupiah(p.harga_beli),
                      })}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="text-base font-bold text-pinus-700">
                    {formatRupiah(p.harga_jual)}
                  </span>
                </div>
                {isOwner && (
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/produk/ubah/${p.id}`}
                      className="btn-secondary min-h-10 flex-1 py-2"
                    >
                      {t('umum.ubah')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => konfirmasiHapus(p.id, p.nama)}
                      className="btn-danger-outline min-h-10 flex-1 py-2"
                    >
                      {t('umum.hapus')}
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setStokId(stokId === p.id ? null : p.id)}
                  className="btn-secondary mt-2 min-h-11 w-full py-2"
                >
                  {t('produk.tambahStok')}
                </button>
                {stokId === p.id && (
                  <div className="mt-3 border-t border-dashed border-garis pt-3">
                    <FormTambahStok
                      produk={p}
                      sibuk={stokMutation.isPending}
                      onSimpan={(jumlah, catatan) =>
                        stokMutation.mutate({ id: p.id, jumlah, catatan })
                      }
                      onBatal={() => setStokId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'kategori' && (
        <div className="card">
          <div className="border-b px-4 py-4 sm:px-5">
            <h2 className="font-bold">{t('produk.judulKategori')}</h2>
            <p className="text-sm text-stone-600">
              {t('produk.keteranganKategori')}
            </p>
          </div>
          {isOwner && (
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
                placeholder={t('produk.namaKategoriBaru')}
                aria-label={t('produk.namaKategoriBaru')}
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={!namaBaru.trim() || simpanKategoriMutation.isPending}
                className="btn-primary sm:w-auto"
              >
                <IconPlus className="h-5 w-5" strokeWidth={2.2} />
                {t('produk.tambahKategori')}
              </button>
            </form>
          )}
          {kategoriQuery.isLoading && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              {t('produk.memuatKategori')}
            </p>
          )}
          {kategoriQuery.isError && (
            <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
              {t('produk.gagalMuatKategori')}{' '}
              {kategoriQuery.error instanceof Error
                ? kategoriQuery.error.message
                : t('produk.galatUmum')}
            </p>
          )}
          {kategoriQuery.data && kategoriQuery.data.length === 0 && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              {isOwner
                ? t('produk.belumAdaKategoriOwner')
                : t('produk.belumAdaKategori')}
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
                        aria-label={t('produk.ariaNamaKategori')}
                        className="input min-w-40 flex-1"
                      />
                      <button
                        type="submit"
                        disabled={
                          !editNama.trim() || simpanKategoriMutation.isPending
                        }
                        className="inline-flex min-h-9 items-center rounded-lg bg-pinus-700 px-3 text-xs font-bold text-white hover:bg-pinus-800 disabled:opacity-50"
                      >
                        {t('umum.simpan')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null)
                          setEditNama('')
                        }}
                        className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                      >
                        {t('umum.batal')}
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <div className="break-words font-medium">{k.nama}</div>
                        <div className="text-xs text-stone-600">
                          {jumlah === 0
                            ? t('produk.belumAdaProdukRow')
                            : t('produk.jumlahProduk', { count: jumlah })}
                        </div>
                      </div>
                      {isOwner && (
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
                            {t('umum.ubah')}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              konfirmasiHapusKategori(k.id, k.nama)
                            }
                            className="inline-flex min-h-9 items-center rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            {t('umum.hapus')}
                          </button>
                        </div>
                      )}
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
            <h2 className="font-bold">{t('produk.judulSatuan')}</h2>
            <p className="text-sm text-stone-600">
              {t('produk.keteranganSatuan')}
            </p>
          </div>
          {isOwner && (
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
                placeholder={t('produk.namaSatuanBaru')}
                aria-label={t('produk.namaSatuanBaru')}
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
                {t('produk.tambahSatuan')}
              </button>
            </form>
          )}
          {satuanQuery.isLoading && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              {t('produk.memuatSatuan')}
            </p>
          )}
          {satuanQuery.isError && (
            <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
              {t('produk.gagalMuatSatuan')}{' '}
              {satuanQuery.error instanceof Error
                ? satuanQuery.error.message
                : t('produk.galatUmum')}
            </p>
          )}
          {satuanQuery.data && satuanQuery.data.length === 0 && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              {isOwner
                ? t('produk.belumAdaSatuanOwner')
                : t('produk.belumAdaSatuan')}
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
                        aria-label={t('produk.ariaNamaSatuan')}
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
                        {t('umum.simpan')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditSatuanId(null)
                          setEditSatuanNama('')
                        }}
                        className="inline-flex min-h-9 items-center rounded-lg border border-garis px-3 text-xs font-bold hover:bg-kertas-gelap"
                      >
                        {t('umum.batal')}
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <div className="break-words font-medium">{s.nama}</div>
                        <div className="text-xs text-stone-600">
                          {jumlah === 0
                            ? t('produk.belumAdaProdukRow')
                            : t('produk.jumlahProduk', { count: jumlah })}
                        </div>
                      </div>
                      {isOwner && (
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
                            {t('umum.ubah')}
                          </button>
                          <button
                            type="button"
                            onClick={() => konfirmasiHapusSatuan(s.id, s.nama)}
                            className="inline-flex min-h-9 items-center rounded-lg border border-red-300 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            {t('umum.hapus')}
                          </button>
                        </div>
                      )}
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
            <h2 className="font-bold">{t('produk.judulLog')}</h2>
            <p className="text-sm text-stone-600">
              {t('produk.keteranganLog')}
            </p>
          </div>
          {logQuery.isLoading && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              {t('produk.memuatLog')}
            </p>
          )}
          {logQuery.isError && (
            <p className="px-4 py-4 text-sm text-red-700 sm:px-5">
              {t('produk.gagalMuatLog')}{' '}
              {logQuery.error instanceof Error
                ? logQuery.error.message
                : t('produk.galatUmum')}
            </p>
          )}
          {logQuery.data && logQuery.data.length === 0 && (
            <p className="px-4 py-4 text-stone-600 sm:px-5">
              {t('produk.belumAdaPergerakan')}
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
                    {l.produk?.nama ?? t('produk.produkDihapusLabel')}
                  </div>
                  <div className="text-xs text-stone-600">
                    {formatTanggal(l.created_at)} · {alasanTampil(l.alasan)}
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
