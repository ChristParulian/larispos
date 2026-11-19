import i18n from './i18n'

/** Format angka menjadi Rupiah, contoh: Rp65.000 */
export function formatRupiah(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined) return '-'
  return 'Rp' + nilai.toLocaleString('id-ID')
}

/** Lokal tanggal sesuai bahasa tampilan: id-ID atau en-US. */
function lokalTanggal(): string {
  return i18n.language === 'en' ? 'en-US' : 'id-ID'
}

/** Format tanggal + jam sesuai bahasa tampilan, contoh: 18 Nov 2026, 01.36 */
export function formatTanggal(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(lokalTanggal(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format jam saja, contoh: 01.36 */
export function formatJam(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(lokalTanggal(), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Label metode bayar untuk tampilan. */
export function labelMetode(metode: string): string {
  if (metode === 'tunai') return i18n.t('metode.tunai')
  if (metode === 'qris') return i18n.t('metode.qris')
  if (metode === 'bon') return i18n.t('metode.bon')
  return metode
}

/** Tanggal lokal hari ini dalam format YYYY-MM-DD (untuk input date). */
export function tanggalHariIni(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
