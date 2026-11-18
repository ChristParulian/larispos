// Ikon SVG inline (tanpa dependensi ikon tambahan).
// Gaya garis (stroke) agar konsisten di navigasi dan tombol.

import type { ReactNode } from 'react'

interface IconProps {
  className?: string
  strokeWidth?: number
}

function Base({
  className = 'h-6 w-6',
  strokeWidth = 1.8,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** Dashboard — grid 2x2. */
export function IconDashboard(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Base>
  )
}

/** Peringatan — segitiga. */
export function IconPeringatan(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5 22 20H2L12 3.5z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Base>
  )
}

/** Kasir — uang kertas. */
export function IconKasir(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.2 12h.01M17.8 12h.01" />
    </Base>
  )
}

/** Produk — kubus / kotak barang. */
export function IconProduk(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2.5 21 7.5v9l-9 5-9-5v-9l9-5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9.5" />
    </Base>
  )
}

/** Laporan — diagram batang. */
export function IconLaporan(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20v-7" />
      <path d="M10 20V4" />
      <path d="M16 20v-5" />
      <path d="M2.5 20h19" />
    </Base>
  )
}

/** Pengguna — dua orang. */
export function IconPengguna(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.7-3.3 3.1-5 6-5s5.3 1.7 6 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.8 14.9c2.3.4 4 1.9 4.7 5.1" />
    </Base>
  )
}

/** Keranjang belanja — tas. */
export function IconKeranjang(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 8h12l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </Base>
  )
}

/** Pencarian. */
export function IconSearch(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Base>
  )
}

/** Tambah. */
export function IconPlus(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

/** Kembali (panah kiri). */
export function IconBack(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19 12H5" />
      <path d="M11 18l-6-6 6-6" />
    </Base>
  )
}

/** Tutup (silang). */
export function IconTutup(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Base>
  )
}

/** Chevron bawah (untuk detail yang bisa dibuka-tutup). */
export function IconChevron(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 9l6 6 6-6" />
    </Base>
  )
}

/** Mark merek LarisPOS — toko kelontong: atap tenda bergelombang,
    badan toko, dan pintu yang terbuka ke bawah. Satu warna
    (currentColor), diisi penuh — bukan ikon garis. */
export function BrandMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
    >
      {/* Atap tenda. */}
      <path d="M3.5 10.2 5.2 4h13.6l1.7 6.2H3.5Z" />
      {/* Tepi bergelombang di bawah atap. */}
      <path d="M3.5 10.2h17v.9a1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 1-3.4 0 1.7 1.7 0 0 1-3.4 0v-.9Z" />
      {/* Badan toko + pintu (lubang evenodd, terbuka ke bawah). */}
      <path d="M5.5 13.6h13V21h-13V13.6Zm5.5 7.8v-4.6h2v4.6h-2Z" />
    </svg>
  )
}
