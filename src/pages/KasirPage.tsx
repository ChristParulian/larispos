// Halaman Kasir: cari produk, keranjang, bayar Tunai / QRIS.
// Checkout lewat RPC buat_transaksi(), harga & total dihitung ulang
// di database. Setelah bayar, struk digital ditampilkan.
// Cari produk lewat kata kunci atau filter kategori sekali ketuk.
// Jumlah bisa diubah langsung di kartu produk (tombol kurang/tambah),
// jadi kasir tidak perlu bolak-balik membuka keranjang.
// Di HP, keranjang dibuka sebagai panel bawah (bottom sheet) lewat
// bar total yang menempel di atas menu bawah; di layar besar
// keranjang tampil sebagai panel samping.
//
// Daftar produk dan panel keranjang tinggal di ./kasir/
// (DaftarProduk, CartPanel); file ini hanya mengatur state
// keranjang, checkout, dan struk.

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checkout, fetchKategori, fetchProduk } from '../lib/api'
import type { CartItem, CheckoutResult, Produk } from '../lib/types'
import { formatRupiah } from '../lib/format'
import Struk from '../components/Struk'
import { IconKeranjang, IconTutup } from '../components/icons'
import CartPanel, { type CartPanelProps } from './kasir/CartPanel'
import DaftarProduk from './kasir/DaftarProduk'

export default function KasirPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [cari, setCari] = useState('')
  const [kategoriId, setKategoriId] = useState<string | null>(null)
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
  const kategoriQuery = useQuery({
    queryKey: ['kategori'],
    queryFn: fetchKategori,
  })

  // Filter gabungan: kategori sekali ketuk + kata kunci.
  const produkList = useMemo(() => {
    let tampil = produkQuery.data ?? []
    if (kategoriId === 'tanpa-kategori') {
      tampil = tampil.filter((p) => !p.kategori_id)
    } else if (kategoriId) {
      tampil = tampil.filter((p) => p.kategori_id === kategoriId)
    }
    const q = cari.trim().toLowerCase()
    if (q) tampil = tampil.filter((p) => p.nama.toLowerCase().includes(q))
    return tampil
  }, [produkQuery.data, kategoriId, cari])

  // Jumlah tiap produk di keranjang, untuk stepper di kartu produk.
  const qtyDiKeranjang = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of keranjang) map.set(it.produk.id, it.qty)
    return map
  }, [keranjang])

  const kategoriList = kategoriQuery.data ?? []
  const kategoriAktif = kategoriList.find((k) => k.id === kategoriId)
  const adaTanpaKategori = (produkQuery.data ?? []).some((p) => !p.kategori_id)

  const total = keranjang.reduce(
    (sum, it) => sum + it.qty * it.produk.harga_jual,
    0,
  )
  const dibayarNum = Number(dibayar.replace(/[^0-9]/g, '')) || 0
  const kembalian = metode === 'tunai' ? Math.max(0, dibayarNum - total) : 0
  const uangKurang = metode === 'tunai' && total > 0 && dibayarNum < total

  function tambahKeKeranjang(p: Produk) {
    if (p.stok <= 0) {
      setError(t('kasir.stokHabis', { nama: p.nama }))
      return
    }
    setError(null)
    setKeranjang((prev) => {
      const ada = prev.find((it) => it.produk.id === p.id)
      if (ada) {
        if (ada.qty + 1 > p.stok) {
          setError(t('kasir.stokTersisa', { nama: p.nama, stok: p.stok }))
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
            setError(
              t('kasir.stokTersisa', {
                nama: it.produk.nama,
                stok: it.produk.stok,
              }),
            )
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
      setError(err instanceof Error ? err.message : t('kasir.pembayaranGagal'))
    },
  })

  function handleBayar() {
    if (keranjang.length === 0) return
    if (metode === 'tunai' && dibayarNum < total) {
      setError(t('kasir.uangKurangDariTotal'))
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
      <DaftarProduk
        cari={cari}
        onCari={setCari}
        kategoriList={kategoriList}
        kategoriId={kategoriId}
        onKategoriId={setKategoriId}
        adaTanpaKategori={adaTanpaKategori}
        kategoriAktif={kategoriAktif}
        produkQuery={produkQuery}
        produkList={produkList}
        qtyDiKeranjang={qtyDiKeranjang}
        jumlahKeranjang={keranjang.length}
        onTambah={tambahKeKeranjang}
        onUbahQty={ubahQty}
        error={error}
      />

      {/* Keranjang & pembayaran, panel samping (layar sedang ke atas) */}
      <aside className="hidden h-fit md:block lg:sticky lg:top-24">
        <div className="card p-4 sm:p-5">
          <h2 className="text-lg font-bold">{t('kasir.keranjang')}</h2>
          <CartPanel {...cartProps} />
        </div>
      </aside>

      {/* Bar total menempel (HP saja): total + buka keranjang,
          mengambang di atas menu bawah. */}
      {keranjang.length > 0 && (
        <button
          type="button"
          onClick={() => setKeranjangTerbuka(true)}
          className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex min-h-14 items-center justify-between gap-3 rounded-lg bg-pinus-800 px-4 py-3 text-white shadow-angkat transition active:scale-[0.99] no-print md:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <IconKeranjang className="h-5 w-5" />
            {t('kasir.item', { count: keranjang.length })}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-base font-bold">{formatRupiah(total)}</span>
            <span className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-pinus-800">
              {t('kasir.keranjang')}
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
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-lg bg-white pb-[env(safe-area-inset-bottom)] shadow-angkat">
            <div className="sticky top-0 flex items-center justify-between border-b border-garis bg-white px-4 py-3">
              <h2 className="text-lg font-bold">{t('kasir.keranjang')}</h2>
              <button
                type="button"
                aria-label={t('kasir.tutupKeranjang')}
                onClick={() => setKeranjangTerbuka(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-stone-600 hover:bg-kertas-gelap"
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
