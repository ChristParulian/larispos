import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import i18n from './lib/i18n'
import { isDemoMode } from './lib/supabase'
import Layout from './components/Layout'
import BatasError from './components/BatasError'
import Memuat from './components/Memuat'

// Halaman dimuat malas per rute (code splitting): bundle awal hanya berisi
// shell aplikasi, tiap halaman diunduh saat pertama dibuka. Bila unduhan
// chunk-nya gagal (mis. koneksi putus), BatasError yang menangkapnya.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const KasirPage = lazy(() => import('./pages/KasirPage'))
const ProdukPage = lazy(() => import('./pages/ProdukPage'))
const TambahProdukPage = lazy(() => import('./pages/TambahProdukPage'))
const LaporanPage = lazy(() => import('./pages/LaporanPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AturUlangSandiPage = lazy(() => import('./pages/AturUlangSandiPage'))
const PenggunaPage = lazy(() => import('./pages/PenggunaPage'))
const ProfilSayaPage = lazy(() => import('./pages/ProfilSayaPage'))
const UbahTransaksiPage = lazy(() => import('./pages/UbahTransaksiPage'))

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
      {/* Batas luar: menangkap error dari Layout sendiri. Error halaman
          ditangkap batas dalam di Layout, supaya header dan menu bawah
          tetap tampil. */}
      <BatasError>
        {/* Suspense luar: untuk halaman di luar Layout (Masuk dan Atur
            Ulang Sandi). Halaman dalam Layout ditangkap Suspense di
            Layout, supaya header dan menu bawah tetap tampil. */}
        <Suspense fallback={<Memuat />}>
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
        </Suspense>
      </BatasError>
    </AuthProvider>
  )
}
