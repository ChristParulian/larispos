import type { ComponentType } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { isDemoMode } from '../lib/supabase'
import { demoReset } from '../lib/demo'
import { useAuth } from '../lib/auth'
import {
  BrandMark,
  IconDashboard,
  IconKasir,
  IconLaporan,
  IconPengguna,
  IconProduk,
} from './icons'

interface NavItem {
  to: string
  label: string
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/kasir', label: 'Kasir', Icon: IconKasir },
  { to: '/produk', label: 'Produk', Icon: IconProduk },
  { to: '/laporan', label: 'Laporan', Icon: IconLaporan },
]

const NAV_PENGGUNA: NavItem = {
  to: '/pengguna',
  label: 'Pengguna',
  Icon: IconPengguna,
}

function linkDesktop({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-pinus-800 text-white'
      : 'text-pinus-100/75 hover:bg-pinus-800/60 hover:text-white'
  }`
}

/** Satu tab di menu bawah (HP): ikon + label, tab aktif ditandai
    garis amber di atas dan warna pinus — tanpa pil berwarna. */
function BottomNavItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className="relative flex min-h-16 flex-col items-center justify-center gap-0.5 py-2 text-[11px] leading-none"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 rounded-b bg-aksen-500" />
          )}
          <item.Icon
            className={`h-6 w-6 ${isActive ? 'text-pinus-700' : 'text-stone-400'}`}
            strokeWidth={isActive ? 2.1 : 1.8}
          />
          <span
            className={
              isActive
                ? 'font-bold text-pinus-700'
                : 'font-medium text-stone-400'
            }
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { user, isOwner, signOut } = useAuth()
  const navigate = useNavigate()
  const tampilPengguna = isOwner && !isDemoMode

  async function handleKeluar() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-kertas text-tinta">
      <header className="sticky top-0 z-40 bg-pinus-900 text-white no-print">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <BrandMark className="h-7 w-7 text-aksen-400" />
            <span className="text-xl font-extrabold tracking-tight">
              LarisPOS
            </span>
          </NavLink>
          {/* Navigasi atas hanya di layar sedang ke atas;
              di HP navigasi pindah ke menu bawah. */}
          <nav className="hidden flex-1 gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkDesktop}>
                {item.label}
              </NavLink>
            ))}
            {tampilPengguna && (
              <NavLink to={NAV_PENGGUNA.to} className={linkDesktop}>
                {NAV_PENGGUNA.label}
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {!isDemoMode && user && (
              <div className="flex items-center gap-2">
                <span className="hidden rounded-md border border-pinus-700 bg-pinus-800 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-pinus-100 sm:block">
                  {isOwner ? 'Owner' : 'Kasir'}
                </span>
                <button
                  type="button"
                  onClick={handleKeluar}
                  className="min-h-10 rounded-lg border border-pinus-700 px-3 py-2 text-xs font-semibold text-pinus-100 hover:bg-pinus-800"
                >
                  Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isDemoMode && (
        <div className="bg-aksen-100 px-4 py-2 text-center text-sm text-aksen-800 no-print">
          <strong>Mode demo — data lokal.</strong> Supabase belum
          dikonfigurasi, jadi transaksi hanya tersimpan di browser ini.
          Isi <code className="rounded bg-aksen-200 px-1">.env</code> dengan{' '}
          <code className="rounded bg-aksen-200 px-1">VITE_SUPABASE_URL</code>{' '}
          dan{' '}
          <code className="rounded bg-aksen-200 px-1">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          untuk memakai database nyata.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              if (
                window.confirm(
                  'Kembalikan data demo ke 12 produk awal? Transaksi demo akan dihapus.',
                )
              ) {
                demoReset()
                window.location.reload()
              }
            }}
          >
            Reset data demo
          </button>
        </div>
      )}

      {/* Padding bawah ekstra di HP agar menu bawah tidak menutupi konten. */}
      <main className="mx-auto max-w-6xl px-4 py-4 pb-28 sm:py-6 md:pb-6">
        <Outlet />
      </main>

      <footer className="mx-auto hidden max-w-6xl px-4 pb-6 text-center text-xs text-stone-400 no-print md:block">
        LarisPOS — kasir warung kelontong, open source (MIT).
      </footer>

      {/* Menu bawah (HP saja): navigasi utama dalam jangkauan jempol. */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-garis bg-white no-print md:hidden"
      >
        <div
          className={`grid pb-[env(safe-area-inset-bottom)] ${
            tampilPengguna ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          {NAV.map((item) => (
            <BottomNavItem key={item.to} item={item} />
          ))}
          {tampilPengguna && <BottomNavItem item={NAV_PENGGUNA} />}
        </div>
      </nav>
    </div>
  )
}
