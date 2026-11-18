import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { isDemoMode } from '../lib/supabase'
import { demoReset } from '../lib/demo'
import { useAuth } from '../lib/auth'

const NAV = [
  { to: '/kasir', label: 'Kasir' },
  { to: '/produk', label: 'Produk & Stok' },
  { to: '/laporan', label: 'Laporan' },
]

export default function Layout() {
  const { user, profil, isOwner, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleKeluar() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="sticky top-0 z-40 bg-emerald-700 text-white shadow no-print">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <NavLink to="/kasir" className="text-xl font-bold tracking-tight">
            LarisPOS
          </NavLink>
          <nav className="flex flex-1 flex-wrap gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-emerald-800'
                      : 'text-emerald-50 hover:bg-emerald-600'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isOwner && !isDemoMode && (
              <NavLink
                to="/pengguna"
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white text-emerald-800'
                      : 'text-emerald-50 hover:bg-emerald-600'
                  }`
                }
              >
                Pengguna
              </NavLink>
            )}
          </nav>
          <span className="rounded-full bg-emerald-800 px-2.5 py-1 text-xs font-medium">
            Gratis
          </span>
          {!isDemoMode && user && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-emerald-50 sm:block">
                {profil?.nama ?? user.email}
                <span className="ml-1.5 rounded-full bg-emerald-800 px-2 py-0.5 font-semibold">
                  {isOwner ? 'Owner' : 'Kasir'}
                </span>
              </span>
              <button
                type="button"
                onClick={handleKeluar}
                className="rounded-lg border border-emerald-500 px-2.5 py-1 text-xs font-semibold text-emerald-50 hover:bg-emerald-600"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </header>

      {isDemoMode && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 no-print">
          <strong>Mode demo — data lokal.</strong> Supabase belum
          dikonfigurasi, jadi transaksi hanya tersimpan di browser ini.
          Isi <code className="rounded bg-amber-200 px-1">.env</code> dengan{' '}
          <code className="rounded bg-amber-200 px-1">VITE_SUPABASE_URL</code>{' '}
          dan{' '}
          <code className="rounded bg-amber-200 px-1">
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

      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-6 text-center text-xs text-stone-500 no-print">
        LarisPOS — kasir warung kelontong, versi Gratis (MIT).
      </footer>
    </div>
  )
}
