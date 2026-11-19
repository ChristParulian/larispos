import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import i18n from './lib/i18n'
import { isDemoMode } from './lib/supabase'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import KasirPage from './pages/KasirPage'
import ProdukPage from './pages/ProdukPage'
import TambahProdukPage from './pages/TambahProdukPage'
import LaporanPage from './pages/LaporanPage'
import LoginPage from './pages/LoginPage'
import AturUlangSandiPage from './pages/AturUlangSandiPage'
import PenggunaPage from './pages/PenggunaPage'
import ProfilSayaPage from './pages/ProfilSayaPage'
import UbahTransaksiPage from './pages/UbahTransaksiPage'

/** Rute yang butuh login. Mode demo (tanpa Supabase) bebas lewat. */
function ButuhLogin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (isDemoMode) return <>{children}</>
  if (loading) {
    return <p className="p-8 text-center text-stone-600">{i18n.t('umum.memuat')}</p>
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

/** Rute khusus owner (dipakai di dalam <ButuhLogin>). */
function KhususOwner({ children }: { children: ReactNode }) {
  const { isOwner, loading } = useAuth()
  if (isDemoMode) return <>{children}</>
  if (loading) {
    return <p className="p-8 text-center text-stone-600">{i18n.t('umum.memuat')}</p>
  }
  if (!isOwner) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/atur-ulang-sandi" element={<AturUlangSandiPage />} />
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
                <KhususOwner>
                  <TambahProdukPage />
                </KhususOwner>
              </ButuhLogin>
            }
          />
          <Route
            path="/produk/ubah/:id"
            element={
              <ButuhLogin>
                <KhususOwner>
                  <TambahProdukPage />
                </KhususOwner>
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
            path="/transaksi/ubah/:id"
            element={
              <ButuhLogin>
                <KhususOwner>
                  <UbahTransaksiPage />
                </KhususOwner>
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
          <Route
            path="/profil-saya"
            element={
              <ButuhLogin>
                <ProfilSayaPage />
              </ButuhLogin>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
