// Halaman Ubah Transaksi (khusus owner): ubah item dan jumlah
// transaksi yang sudah dibuat. Stok item lama dikembalikan lalu
// item baru diproses seperti checkout (harga dihitung ulang dari
// database). Metode bayar tidak berubah. Transaksi hanya bisa
// diubah dalam 24 jam setelah dibuat.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchProduk, fetchTransaksiById, ubahTransaksi } from '../lib/api'
import type { CartItem, Produk } from '../lib/types'
import { formatRupiah, formatTanggal, labelMetode } from '../lib/format'
import { IconBack, IconProduk, IconSearch } from '../components/icons'

/** Batas ubah: 24 jam setelah transaksi dibuat. */
const BATAS_UBAH_MS = 24 * 60 * 60 * 1000

export default function UbahTransaksiPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const transaksiId = id ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [cari, setCari] = useState('')
  const [keranjang, setKeranjang] = useState<CartItem[]>([])
  const [dibayar, setDibayar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const prefillUntuk = useRef<string | null>(null)

  const transaksiQuery = useQuery({
    queryKey: ['transaksi', transaksiId],
    queryFn: () => fetchTransaksiById(transaksiId),
  })
  const produkQuery = useQuery({
    queryKey: ['produk'],
    queryFn: fetchProduk,
  })
  const transaksi = transaksiQuery.data ?? null
  // Waktu ditangkap sekali saat halaman dibuka, supaya render tetap murni.
  const [sekarang] = useState(() => Date.now())
  const sudahLewatBatas =
    transaksi !== null &&
    sekarang - new Date(transaksi.created_at).getTime() >= BATAS_UBAH_MS

  // Isi keranjang sekali dari item transaksi, setelah transaksi
  // dan produk termuat.
  useEffect(() => {
    if (!transaksi || !produkQuery.data) return
    if (prefillUntuk.current === transaksiId) return
    prefillUntuk.current = transaksiId
    const awal: CartItem[] = []
    for (const it of transaksi.item_transaksi ?? []) {
      const produk = produkQuery.data.find((p) => p.id === it.produk_id)
      if (produk) awal.push({ produk, qty: it.qty })
    }
    setKeranjang(awal)
    setDibayar(
      transaksi.metode_bayar === 'tunai' ? String(transaksi.dibayar) : '',
    )
  }, [transaksi, produkQuery.data, transaksiId])

  // Qty lama per produk: stok yang akan dikembalikan saat simpan,
  // jadi batas qty di editor adalah stok saat ini + qty lama.
  const qtyLama = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of transaksi?.item_transaksi ?? []) {
      map.set(it.produk_id, (map.get(it.produk_id) ?? 0) + it.qty)
    }
    return map
  }, [transaksi])

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
  const kembalian =
    transaksi?.metode_bayar === 'tunai' ? Math.max(0, dibayarNum - total) : 0
  const uangKurang =
    transaksi?.metode_bayar === 'tunai' && total > 0 && dibayarNum < total

  function stokTersedia(p: Produk): number {
    return p.stok + (qtyLama.get(p.id) ?? 0)
  }

  function tambahKeKeranjang(p: Produk) {
    if (stokTersedia(p) <= 0) {
      setError(t('ubahTransaksi.stokHabis', { nama: p.nama }))
      return
    }
    setError(null)
    setKeranjang((prev) => {
      const ada = prev.find((it) => it.produk.id === p.id)
      if (ada) {
        if (ada.qty + 1 > stokTersedia(p)) {
          setError(
            t('ubahTransaksi.stokTersisa', {
              nama: p.nama,
              stok: stokTersedia(p),
            }),
          )
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
          if (qtyBaru > stokTersedia(it.produk)) {
            setError(
              t('ubahTransaksi.stokTersisa', {
                nama: it.produk.nama,
                stok: stokTersedia(it.produk),
              }),
            )
            return it
          }
          return { ...it, qty: qtyBaru }
        })
        .filter((it) => it.qty > 0),
    )
  }

  const simpanMutation = useMutation({
    mutationFn: () =>
      ubahTransaksi(
        transaksiId,
        keranjang.map((it) => ({ produk_id: it.produk.id, qty: it.qty })),
        transaksi?.metode_bayar === 'tunai' ? dibayarNum : 0,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transaksi'] })
      void queryClient.invalidateQueries({ queryKey: ['produk'] })
      void queryClient.invalidateQueries({ queryKey: ['log-stok'] })
      navigate('/laporan', {
        state: { pesan: t('ubahTransaksi.ubahBerhasil') },
      })
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t('ubahTransaksi.gagalMengubah'),
      )
    },
  })

  function handleSimpan() {
    if (keranjang.length === 0) {
      setError(t('ubahTransaksi.keranjangKosong'))
      return
    }
    if (transaksi?.metode_bayar === 'tunai' && dibayarNum < total) {
      setError(t('ubahTransaksi.uangKurang'))
      return
    }
    simpanMutation.mutate()
  }

  const memuat = transaksiQuery.isLoading || produkQuery.isLoading
  const gagal = transaksiQuery.error ?? produkQuery.error

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/laporan"
          aria-label={t('ubahTransaksi.kembaliKeLaporan')}
          className="icon-btn"
        >
          <IconBack className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="judul-halaman">{t('ubahTransaksi.judul')}</h1>
          <p className="text-sm text-stone-600">
            {transaksi
              ? `#${transaksi.id.slice(0, 8).toUpperCase()} · ${formatTanggal(transaksi.created_at)} · ${labelMetode(transaksi.metode_bayar)}`
              : t('ubahTransaksi.subjudul')}
          </p>
        </div>
      </div>

      {memuat && <p className="text-stone-600">{t('ubahTransaksi.memuat')}</p>}
      {gagal && (
        <div className="card p-5">
          <p className="text-sm text-red-700">
            {t('ubahTransaksi.gagalMemuat', {
              pesan:
                gagal instanceof Error
                  ? gagal.message
                  : t('ubahTransaksi.terjadiKesalahan'),
            })}
          </p>
          <Link to="/laporan" className="btn-secondary mt-4">
            {t('ubahTransaksi.kembaliKeLaporanTombol')}
          </Link>
        </div>
      )}
      {!memuat && !gagal && !transaksi && (
        <div className="card p-5">
          <p className="font-medium">{t('galat.transaksiTidakDitemukan')}</p>
          <p className="mt-1 text-sm text-stone-600">
            {t('ubahTransaksi.mungkinDihapus')}
          </p>
          <Link to="/laporan" className="btn-secondary mt-4">
            {t('ubahTransaksi.kembaliKeLaporanTombol')}
          </Link>
        </div>
      )}
      {!memuat && !gagal && transaksi?.status === 'dibatalkan' && (
        <div className="card p-5">
          <p className="font-medium">{t('galat.transaksiSudahBatal')}</p>
          <p className="mt-1 text-sm text-stone-600">
            {t('ubahTransaksi.batalTidakBisaDiubah')}
          </p>
          <Link to="/laporan" className="btn-secondary mt-4">
            {t('ubahTransaksi.kembaliKeLaporanTombol')}
          </Link>
        </div>
      )}
      {!memuat && !gagal && transaksi && sudahLewatBatas && (
        <div className="card p-5">
          <p className="font-medium">{t('ubahTransaksi.sudahLebih24Jam')}</p>
          <p className="mt-1 text-sm text-stone-600">
            {t('ubahTransaksi.batas24Jam')}
          </p>
          <Link to="/laporan" className="btn-secondary mt-4">
            {t('ubahTransaksi.kembaliKeLaporanTombol')}
          </Link>
        </div>
      )}

      {!memuat &&
        !gagal &&
        transaksi &&
        transaksi.status !== 'dibatalkan' &&
        !sudahLewatBatas && (
          <>
            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Keranjang hasil ubah */}
            <section className="card p-4 sm:p-5">
              <h2 className="text-lg font-bold">
                {t('ubahTransaksi.itemTransaksi')}
              </h2>
              {keranjang.length === 0 ? (
                <p className="mt-1 text-sm text-stone-600">
                  {t('ubahTransaksi.belumAdaItem')}
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
                          {t('ubahTransaksi.hargaStok', {
                            harga: formatRupiah(it.produk.harga_jual),
                            satuan: it.produk.satuan,
                            stok: stokTersedia(it.produk),
                          })}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={t('ubahTransaksi.kurangi', {
                            nama: it.produk.nama,
                          })}
                          onClick={() => ubahQty(it.produk.id, -1)}
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-garis text-xl font-bold hover:bg-kertas-gelap active:scale-95"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-sm font-semibold">
                          {it.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={t('ubahTransaksi.tambah', {
                            nama: it.produk.nama,
                          })}
                          onClick={() => ubahQty(it.produk.id, 1)}
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
                  <span className="font-semibold">
                    {t('ubahTransaksi.totalBaru')}
                  </span>
                  <span className="font-bold text-pinus-700">
                    {formatRupiah(total)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-sm text-stone-600">
                  <span>{t('ubahTransaksi.totalSebelumnya')}</span>
                  <span>{formatRupiah(transaksi.total)}</span>
                </div>
              </div>

              {transaksi.metode_bayar === 'tunai' && (
                <div className="mt-4">
                  <label htmlFor="dibayar" className="text-sm font-medium">
                    {t('ubahTransaksi.uangDibayar')}
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
                    className="input mt-1.5 text-lg font-semibold"
                  />
                  <div className="mt-2 flex justify-between text-base">
                    <span>{t('struk.kembalian')}</span>
                    <span
                      className={`font-bold ${uangKurang ? 'text-red-600' : 'text-pinus-700'}`}
                    >
                      {uangKurang
                        ? t('ubahTransaksi.kurang', {
                            jumlah: formatRupiah(total - dibayarNum),
                          })
                        : formatRupiah(kembalian)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDibayar(String(total))}
                      disabled={total === 0}
                      className="min-h-9 rounded-md border border-aksen-600 px-3 py-2 text-xs font-bold text-aksen-700 hover:bg-aksen-100 disabled:opacity-50"
                    >
                      {t('ubahTransaksi.uangPas')}
                    </button>
                  </div>
                </div>
              )}
              {transaksi.metode_bayar === 'qris' && (
                <p className="mt-4 rounded-lg bg-kertas-gelap px-3 py-2.5 text-sm text-stone-600">
                  {t('ubahTransaksi.qrisCatatan')}
                </p>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
                <Link
                  to="/laporan"
                  className="btn-secondary flex-1 sm:flex-none"
                >
                  {t('umum.batal')}
                </Link>
                <button
                  type="button"
                  onClick={handleSimpan}
                  disabled={
                    simpanMutation.isPending ||
                    keranjang.length === 0 ||
                    uangKurang
                  }
                  className="btn-primary flex-1 sm:flex-none"
                >
                  {simpanMutation.isPending
                    ? t('ubahTransaksi.menyimpan')
                    : t('ubahTransaksi.simpanPerubahan')}
                </button>
              </div>
            </section>

            {/* Cari + tambah produk */}
            <section className="mt-4">
              <h2 className="mb-2 text-base font-bold">
                {t('ubahTransaksi.tambahProduk')}
              </h2>
              <div className="relative mb-3">
                <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600" />
                <input
                  type="search"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder={t('ubahTransaksi.cariProduk')}
                  aria-label={t('ubahTransaksi.cariProduk')}
                  className="input pl-11"
                />
              </div>
              {produkList.length === 0 && (
                <div className="card flex flex-col items-center px-6 py-10 text-center">
                  <IconProduk
                    className="h-10 w-10 text-pinus-300"
                    strokeWidth={1.5}
                  />
                  <p className="mt-3 font-semibold">
                    {cari.trim()
                      ? t('ubahTransaksi.tidakAdaYangCocok', { cari })
                      : t('ubahTransaksi.belumAdaProduk')}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    {cari.trim()
                      ? t('ubahTransaksi.cobaKataKunciLain')
                      : t('ubahTransaksi.tambahkanProdukDulu')}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {produkList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => tambahKeKeranjang(p)}
                    disabled={stokTersedia(p) <= 0}
                    className="card min-w-0 p-3 text-left transition hover:border-pinus-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:p-4"
                  >
                    <div className="break-words font-semibold leading-snug">
                      {p.nama}
                    </div>
                    <div className="mt-1 text-xs text-stone-600">
                      {p.kategori?.nama ?? t('umum.tanpaKategori')} · per{' '}
                      {p.satuan}
                    </div>
                    <div className="mt-2 text-base font-bold text-pinus-700 sm:text-lg">
                      {formatRupiah(p.harga_jual)}
                    </div>
                    <div className="mt-1.5 inline-flex rounded-md bg-kertas-gelap px-2 py-0.5 text-[11px] font-bold text-stone-600">
                      {t('ubahTransaksi.stok', { stok: stokTersedia(p) })}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
    </div>
  )
}
