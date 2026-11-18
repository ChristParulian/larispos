/** Format angka menjadi Rupiah, contoh: Rp65.000 */
export function formatRupiah(nilai: number | null | undefined): string {
  if (nilai === null || nilai === undefined) return '—'
  return 'Rp' + nilai.toLocaleString('id-ID')
}

/** Format tanggal + jam Indonesia, contoh: 18 Nov 2026, 01.36 */
export function formatTanggal(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
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
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

/** Label metode bayar untuk tampilan. */
export function labelMetode(metode: string): string {
  if (metode === 'tunai') return 'Tunai'
  if (metode === 'qris') return 'QRIS'
  if (metode === 'bon') return 'Bon'
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
