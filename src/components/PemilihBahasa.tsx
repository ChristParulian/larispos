import { useTranslation } from 'react-i18next'
import { simpanBahasa, type Bahasa } from '../lib/i18n'

/** Pemilih bahasa tampilan: Indonesia atau Inggris. */
export default function PemilihBahasa() {
  const { i18n, t } = useTranslation()
  const bahasa: Bahasa = i18n.language === 'en' ? 'en' : 'id'

  return (
    <div
      className="inline-flex rounded-lg bg-kertas-gelap p-1"
      role="group"
      aria-label={t('bahasa.judul')}
    >
      {(
        [
          ['id', 'Indonesia'],
          ['en', 'English'],
        ] as Array<[Bahasa, string]>
      ).map(([kode, label]) => (
        <button
          key={kode}
          type="button"
          onClick={() => simpanBahasa(kode)}
          aria-pressed={bahasa === kode}
          className={`min-h-10 rounded-md px-4 text-sm font-bold transition-colors ${
            bahasa === kode
              ? 'bg-pinus-800 text-white'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
