import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import KasirPage from './pages/KasirPage'
import ProdukPage from './pages/ProdukPage'
import LaporanPage from './pages/LaporanPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/kasir" replace />} />
        <Route path="/kasir" element={<KasirPage />} />
        <Route path="/produk" element={<ProdukPage />} />
        <Route path="/laporan" element={<LaporanPage />} />
        <Route path="*" element={<Navigate to="/kasir" replace />} />
      </Route>
    </Routes>
  )
}
