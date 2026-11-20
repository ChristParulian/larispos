// Indikator muat halaman: dipakai sebagai fallback Suspense saat halaman
// yang dimuat malas belum selesai diunduh. Teks saja, tanpa spinner,
// sesuai dial MOTION 1 (hanya hover/active, tanpa animasi hiasan).
import { useTranslation } from 'react-i18next'

export default function Memuat() {
  const { t } = useTranslation()
  return <p className="p-8 text-center text-stone-600">{t('umum.memuat')}</p>
}
