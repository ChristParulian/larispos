import { Suspense, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
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
import BatasError from './BatasError'
import Memuat from './Memuat'

interface NavItem {
  to: string
  // Kunci terjemahan (mis. 'nav.dashboard'), diterjemahkan saat
  // dirender supaya label mengikuti bahasa tampilan saat ini.
  label: string
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'nav.dashboard', Icon: IconDashboard },
  { to: '/kasir', label: 'nav.kasir', Icon: IconKasir },
  { to: '/produk', label: 'nav.produk', Icon: IconProduk },
  { to: '/laporan', label: 'nav.laporan', Icon: IconLaporan },
]

const NAV_PENGGUNA: NavItem = {
  to: '/pengguna',
  label: 'nav.pengguna',
  Icon: IconPengguna,
}

/** Satu tab di menu bawah: ikon + label, tab aktif ditandai garis
    kuning di atas dan warna pinus, tanpa pil berwarna. */
function BottomNavItem({ item }: { item: NavItem }) {
  const { t } = useTranslation()
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
            className={`h-6 w-6 ${isActive ? 'text-pinus-700' : 'text-stone-600'}`}
            strokeWidth={isActive ? 2.1 : 1.8}
          />
          <span
            className={
              isActive
                ? 'font-bold text-pinus-700'
                : 'font-medium text-stone-600'
            }
          >
            {t(item.label)}
          </span>
        </>
      )}
    </NavLink>
  )
}

export default function Layout() {
  const { t } = useTranslation()
  const { user, profil, isOwner, signOut } = useAuth()
  const navigate = useNavigate()
  const tampilPengguna = isOwner && !isDemoMode
  // Header menampilkan nama depan pengguna, bukan perannya.
  const namaDepan = (profil?.nama ?? user?.email?.split('@')[0] ?? '').split(
    ' ',
  )[0]

  async function handleKeluar() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-kertas text-tinta">
      <header className="sticky top-0 z-40 bg-pinus-900 text-white shadow-bar-atas no-print">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <BrandMark className="h-7 w-7 text-aksen-400" />
            <span className="text-xl font-extrabold tracking-tight">
              LarisPOS
            </span>
          </NavLink>
          {/* Header hanya berisi merek dan akun; semua navigasi
              ada di menu bawah, di semua ukuran layar. */}
          <div className="ml-auto flex items-center gap-2">
            {!isDemoMode && user && (
              <div className="flex items-center gap-2">
                <span className="hidden rounded-md border border-pinus-700 bg-pinus-800 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-pinus-100 sm:block">
                  {namaDepan}
                </span>
                <NavLink
                  to="/profil-saya"
                  aria-label={t('profil.judul')}
                  title={t('profil.judul')}
                  className="inline-flex min-h-10 items-center rounded-lg border border-pinus-700 px-3 py-2 text-xs font-semibold text-pinus-100 hover:bg-pinus-800"
                >
                  <IconPengguna className="h-5 w-5 sm:hidden" />
                  <span className="hidden sm:inline">{t('layout.profil')}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={handleKeluar}
                  className="min-h-10 rounded-lg border border-pinus-700 px-3 py-2 text-xs font-semibold text-pinus-100 hover:bg-pinus-800"
                >
                  {t('layout.keluar')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isDemoMode && (
        <div className="bg-aksen-100 px-4 py-2 text-center text-sm text-aksen-800 no-print">
          <strong>{t('layout.demoJudul')}</strong> {t('layout.demoKeterangan')}{' '}
          <code className="rounded bg-aksen-200 px-1">.env</code>{' '}
          {t('layout.demoDengan')}{' '}
          <code className="rounded bg-aksen-200 px-1">VITE_SUPABASE_URL</code>{' '}
          {t('layout.demoDan')}{' '}
          <code className="rounded bg-aksen-200 px-1">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          {t('layout.demoAkhir')}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              if (window.confirm(t('layout.konfirmasiResetDemo'))) {
                demoReset()
                window.location.reload()
              }
            }}
          >
            {t('layout.resetDemo')}
          </button>
        </div>
      )}

      {/* Padding bawah ekstra agar menu bawah tidak menutupi konten,
          di semua ukuran layar. */}
      <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 sm:pt-6">
        {/* Batas dalam: error halaman ditangkap di sini supaya header dan
            menu bawah tetap tampil. */}
        <BatasError>
          {/* Suspense dalam: halaman yang dimuat malas menampilkan
              "Memuat..." di area konten, shell-nya tetap tampil. */}
          <Suspense fallback={<Memuat />}>
            <Outlet />
          </Suspense>
        </BatasError>
      </main>

      {/* Menu bawah: satu-satunya navigasi, di semua ukuran layar.
          Tab dibatasi lebar konten agar tidak melebar di layar besar. */}
      <nav
        aria-label={t('layout.navUtama')}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-garis bg-white shadow-bar-bawah no-print"
      >
        <div
          className={`mx-auto grid max-w-6xl pb-[env(safe-area-inset-bottom)] ${
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
