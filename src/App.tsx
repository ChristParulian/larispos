import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { isDemoMode } from './lib/supabase'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import KasirPage from './pages/KasirPage'
import ProdukPage from './pages/ProdukPage'
import TambahProdukPage from './pages/TambahProdukPage'
import LaporanPage from './pages/LaporanPage'
import LoginPage from './pages/LoginPage'
import PenggunaPage from './pages/PenggunaPage'

/** Rute yang butuh login. Mode demo (tanpa Supabase) bebas lewat. */
function ButuhLogin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (isDemoMode) return <>{children}</>
  if (loading) {
    return <p className="p-8 text-center text-stone-600">Memuat…</p>
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Rute khusus owner (dipakai di dalam <ButuhLogin>). */
function KhususOwner({ children }: { children: ReactNode }) {
  const { isOwner, loading } = useAuth()
  if (isDemoMode) return <>{children}</>
  if (loading) {
    return <p className="p-8 text-center text-stone-600">Memuat…</p>
  }
  if (!isOwner) return <Navigate to="/kasir" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ButuhLogin>
                <DashboardPage />
              </ButuhLogin>
            }
          />
          <Route
            path="/kasir"
            element={
              <ButuhLogin>
                <KasirPage />
              </ButuhLogin>
            }
          />
          <Route
            path="/produk"
            element={
              <ButuhLogin>
                <ProdukPage />
              </ButuhLogin>
            }
          />
          <Route
            path="/produk/tambah"
            element={
              <ButuhLogin>
                <TambahProdukPage />
              </ButuhLogin>
            }
          />
          <Route
            path="/produk/ubah/:id"
            element={
              <ButuhLogin>
                <TambahProdukPage />
              </ButuhLogin>
            }
          />
          <Route
            path="/laporan"
            element={
              <ButuhLogin>
                <LaporanPage />
              </ButuhLogin>
            }
          />
          <Route
            path="/pengguna"
            element={
              <ButuhLogin>
                <KhususOwner>
                  <PenggunaPage />
                </KhususOwner>
              </ButuhLogin>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
