// Halaman Produk & Stok: daftar produk (cari + filter kategori,
// tambah stok yang tercatat di log), kelola kategori dan satuan,
// dan riwayat pergerakan stok (log_stok). Tambah / ubah / hapus
// produk, kategori, dan satuan hanya untuk owner; kasir hanya
// bisa melihat daftar dan menambah stok. Tambah / ubah produk
// lewat halaman sendiri (/produk/tambah dan /produk/ubah/:id).
//
// Isi tiap tab tinggal di ./produk/ (TabProduk, TabKategori,
// TabSatuan, TabLogStok, FormTambahStok); file ini hanya mengatur
// state, data, dan dialog konfirmasi.

import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
import DialogKonfirmasi from '../components/DialogKonfirmasi'
import TabProduk from './produk/TabProduk'
import TabKategori from './produk/TabKategori'
import TabSatuan from './produk/TabSatuan'
import TabLogStok from './produk/TabLogStok'

type Tab = 'produk' | 'kategori' | 'satuan' | 'log'

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
  // Target dialog konfirmasi hapus: hanya satu dialog yang terbuka
  // dalam satu waktu.
  const [dialogProduk, setDialogProduk] = useState<{
    id: string
    nama: string
  } | null>(null)
  const [dialogKategori, setDialogKategori] = useState<{
    id: string
    nama: string
  } | null>(null)
  const [dialogSatuan, setDialogSatuan] = useState<{
    id: string
    nama: string
  } | null>(null)

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
    setDialogProduk({ id, nama })
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

  // Pesan dialog hapus kategori: memperingatkan berapa produk yang
  // akan menjadi tanpa kategori.
  function pesanHapusKategori(id: string, nama: string): string {
    const jumlah = jumlahProduk.get(id) ?? 0
    return jumlah > 0
      ? t('produk.konfirmasiHapusKategoriDenganProduk', {
          nama,
          count: jumlah,
        })
      : t('produk.konfirmasiHapusKategori', { nama })
  }

  function konfirmasiHapusKategori(id: string, nama: string) {
    setDialogKategori({ id, nama })
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

  // Pesan dialog hapus satuan: memperingatkan berapa produk yang
  // masih memakainya.
  function pesanHapusSatuan(nama: string): string {
    const jumlah = jumlahProdukSatuan.get(nama) ?? 0
    return jumlah > 0
      ? t('produk.konfirmasiHapusSatuanDenganProduk', {
          nama,
          count: jumlah,
        })
      : t('produk.konfirmasiHapusSatuan', { nama })
  }

  function konfirmasiHapusSatuan(id: string, nama: string) {
    setDialogSatuan({ id, nama })
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
        <TabProduk
          produkQuery={produkQuery}
          produkTampil={produkTampil}
          kategori={kategoriQuery.data ?? []}
          cari={cari}
          onCari={setCari}
          filterKategori={filterKategori}
          onFilterKategori={setFilterKategori}
          isOwner={isOwner}
          sedangFilter={sedangFilter}
          stokId={stokId}
          onStokId={setStokId}
          tambahStokPending={stokMutation.isPending}
          onTambahStok={(id, jumlah, catatan) =>
            stokMutation.mutate({ id, jumlah, catatan })
          }
          onHapus={konfirmasiHapus}
        />
      )}

      {tab === 'kategori' && (
        <TabKategori
          kategoriQuery={kategoriQuery}
          jumlahProduk={jumlahProduk}
          isOwner={isOwner}
          namaBaru={namaBaru}
          onNamaBaru={setNamaBaru}
          editId={editId}
          onEditId={setEditId}
          editNama={editNama}
          onEditNama={setEditNama}
          simpan={simpanKategoriMutation}
          onHapus={konfirmasiHapusKategori}
          onBersihkanGalat={() => setError(null)}
        />
      )}

      {tab === 'satuan' && (
        <TabSatuan
          satuanQuery={satuanQuery}
          jumlahProdukSatuan={jumlahProdukSatuan}
          isOwner={isOwner}
          namaSatuanBaru={namaSatuanBaru}
          onNamaSatuanBaru={setNamaSatuanBaru}
          editSatuanId={editSatuanId}
          onEditSatuanId={setEditSatuanId}
          editSatuanNama={editSatuanNama}
          onEditSatuanNama={setEditSatuanNama}
          simpan={simpanSatuanMutation}
          onHapus={konfirmasiHapusSatuan}
          onBersihkanGalat={() => setError(null)}
        />
      )}

      {tab === 'log' && <TabLogStok logQuery={logQuery} />}

      {dialogProduk && (
        <DialogKonfirmasi
          judul={t('produk.judulHapusProduk')}
          pesan={t('produk.konfirmasiHapusProduk', {
            nama: dialogProduk.nama,
          })}
          labelKonfirmasi={t('umum.hapus')}
          berbahaya
          onKonfirmasi={() => {
            hapusMutation.mutate(dialogProduk.id)
            setDialogProduk(null)
          }}
          onBatal={() => setDialogProduk(null)}
        />
      )}
      {dialogKategori && (
        <DialogKonfirmasi
          judul={t('produk.judulHapusKategori')}
          pesan={pesanHapusKategori(dialogKategori.id, dialogKategori.nama)}
          labelKonfirmasi={t('umum.hapus')}
          berbahaya
          onKonfirmasi={() => {
            hapusKategoriMutation.mutate(dialogKategori.id)
            setDialogKategori(null)
          }}
          onBatal={() => setDialogKategori(null)}
        />
      )}
      {dialogSatuan && (
        <DialogKonfirmasi
          judul={t('produk.judulHapusSatuan')}
          pesan={pesanHapusSatuan(dialogSatuan.nama)}
          labelKonfirmasi={t('umum.hapus')}
          berbahaya
          onKonfirmasi={() => {
            hapusSatuanMutation.mutate(dialogSatuan.id)
            setDialogSatuan(null)
          }}
          onBatal={() => setDialogSatuan(null)}
        />
      )}
    </div>
  )
}
