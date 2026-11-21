// Form restock sebaris: jumlah yang masuk + catatan opsional.
// Dipakai di tabel (layar besar) dan kartu (HP) pada tab produk.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Produk } from '../../lib/types'

/** Form restock sebaris: jumlah yang masuk + catatan opsional.
    Dipakai di tabel (layar besar) dan kartu (HP). */
export default function FormTambahStok({
  produk,
  sibuk,
  onSimpan,
  onBatal,
}: {
  produk: Produk
  sibuk: boolean
  onSimpan: (jumlah: number, catatan?: string) => void
  onBatal: () => void
}) {
  const { t } = useTranslation()
  const [jumlah, setJumlah] = useState('')
  const [catatan, setCatatan] = useState('')
  const [errorLokal, setErrorLokal] = useState<string | null>(null)

  function simpan() {
    const n = Number(jumlah)
    if (!jumlah.trim() || !Number.isInteger(n) || n < 1) {
      setErrorLokal(t('produk.jumlahBulatMinimal'))
      return
    }
    setErrorLokal(null)
    onSimpan(n, catatan.trim() ? catatan.trim() : undefined)
  }

  return (
    <div>
      <p className="text-sm text-stone-600">
        {t('produk.stokSekarang')}{' '}
        <span className="font-semibold text-tinta">
          {produk.stok} {produk.satuan}
        </span>
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder={t('produk.placeholderJumlahMasuk')}
          aria-label={t('produk.ariaJumlahMasuk')}
          className="input sm:w-44"
        />
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder={t('produk.placeholderCatatan')}
          aria-label={t('produk.ariaCatatanRestock')}
          className="input flex-1"
        />
      </div>
      {errorLokal && <p className="mt-2 text-sm text-red-700">{errorLokal}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={sibuk}
          onClick={simpan}
          className="btn-primary min-h-11 px-5"
        >
          {t('umum.simpan')}
        </button>
        <button
          type="button"
          onClick={onBatal}
          className="btn-secondary min-h-11 px-4"
        >
          {t('umum.batal')}
        </button>
      </div>
    </div>
  )
}
