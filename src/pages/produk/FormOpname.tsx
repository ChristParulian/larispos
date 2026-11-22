// Form opname sebaris: stok fisik hasil hitung + alasan wajib.
// Dipakai di tabel (layar besar) dan kartu (HP) pada tab produk.
// Hanya owner yang bisa membuka form ini.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Produk } from '../../lib/types'

/** Form opname sebaris: stok fisik hasil hitung + alasan wajib.
    Dipakai di tabel (layar besar) dan kartu (HP). */
export default function FormOpname({
  produk,
  sibuk,
  onSimpan,
  onBatal,
}: {
  produk: Produk
  sibuk: boolean
  onSimpan: (stokBaru: number, alasan: string) => void
  onBatal: () => void
}) {
  const { t } = useTranslation()
  const [stokFisik, setStokFisik] = useState('')
  const [alasan, setAlasan] = useState('')
  const [errorLokal, setErrorLokal] = useState<string | null>(null)

  const n = Number(stokFisik)
  const valid = stokFisik.trim() !== '' && Number.isInteger(n) && n >= 0
  const selisih = valid ? n - produk.stok : null

  function simpan() {
    if (!valid) {
      setErrorLokal(t('produk.stokFisikBulat'))
      return
    }
    if (n === produk.stok) {
      setErrorLokal(t('produk.stokSama'))
      return
    }
    if (!alasan.trim()) {
      setErrorLokal(t('produk.alasanWajib'))
      return
    }
    setErrorLokal(null)
    onSimpan(n, alasan.trim())
  }

  return (
    <div>
      <p className="text-sm text-stone-600">
        {t('produk.stokSekarang')}{' '}
        <span className="font-semibold text-tinta">
          {produk.stok} {produk.satuan}
        </span>
        {selisih !== null && selisih !== 0 && (
          <>
            {' · '}
            {t('produk.selisih')}{' '}
            <span
              className={`font-semibold ${
                selisih < 0 ? 'text-red-600' : 'text-pinus-700'
              }`}
            >
              {selisih > 0 ? `+${selisih}` : selisih}
            </span>
          </>
        )}
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={stokFisik}
          onChange={(e) => setStokFisik(e.target.value)}
          placeholder={t('produk.placeholderStokFisik')}
          aria-label={t('produk.ariaStokFisik')}
          className="input sm:w-44"
        />
        <input
          value={alasan}
          onChange={(e) => setAlasan(e.target.value)}
          placeholder={t('produk.placeholderAlasanOpname')}
          aria-label={t('produk.alasanPenyesuaian')}
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
