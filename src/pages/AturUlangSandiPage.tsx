// Halaman Atur Ulang Kata Sandi: dibuka dari tautan di email
// pemulihan (kirimLinkAturUlangSandi). Tautan itu membawa sesi
// pemulihan; halaman ini meminta kata sandi baru, lalu masuk ke
// dashboard. Tanpa sesi (tautan kedaluwarsa atau sudah dipakai),
// tampil pesan untuk minta tautan baru dari halaman masuk.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { aturUlangSandiBaru, useAuth } from '../lib/auth'
import { BrandMark } from '../components/icons'

export default function AturUlangSandiPage() {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [sandiBaru, setSandiBaru] = useState('')
  const [sandiUlang, setSandiUlang] = useState('')
  const [lihatSandi, setLihatSandi] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  if (loading) {
    return <p className="p-8 text-center text-stone-600">{t('umum.memuat')}</p>
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (sandiBaru.length < 8) {
      setError(t('galat.sandiBaruMin8'))
      return
    }
    if (sandiBaru !== sandiUlang) {
      setError(t('aturSandi.konfirmasiTidakCocok'))
      return
    }
    setSibuk(true)
    try {
      const err = await aturUlangSandiBaru(sandiBaru)
      if (err) {
        setError(err)
      } else {
        navigate('/dashboard', { replace: true })
      }
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-kertas px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-pinus-900 text-aksen-400">
            <BrandMark className="h-9 w-9" />
          </span>
          <div className="mt-3 text-3xl font-extrabold tracking-tight">
            Laris<span className="text-aksen-600">POS</span>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          {!user ? (
            <>
              <h1 className="judul-halaman">{t('aturSandi.linkTidakBerlaku')}</h1>
              <p className="mt-2 text-sm text-stone-600">
                {t('aturSandi.linkKedaluwarsa')}
              </p>
              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                className="btn-primary mt-5 min-h-12 w-full text-base"
              >
                {t('aturSandi.keHalamanMasuk')}
              </button>
            </>
          ) : (
            <>
              <h1 className="judul-halaman">{t('aturSandi.judul')}</h1>
              <p className="mt-2 text-sm text-stone-600">
                {t('aturSandi.buatSandiBaru', { email: user.email })}
              </p>

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="label">
                      {t('aturSandi.sandiBaru')} *
                    </span>
                    <button
                      type="button"
                      onClick={() => setLihatSandi((v) => !v)}
                      className="min-h-11 px-2 text-xs font-bold text-pinus-700"
                    >
                      {lihatSandi
                        ? t('aturSandi.sembunyikan')
                        : t('aturSandi.lihat')}
                    </button>
                  </div>
                  <input
                    type={lihatSandi ? 'text' : 'password'}
                    className="input"
                    value={sandiBaru}
                    onChange={(e) => setSandiBaru(e.target.value)}
                    placeholder={t('aturSandi.sandiBaruPlaceholder')}
                    autoComplete="new-password"
                  />
                </div>
                <label className="block">
                  <span className="label">
                    {t('aturSandi.ulangiSandiBaru')} *
                  </span>
                  <input
                    type={lihatSandi ? 'text' : 'password'}
                    className="input"
                    value={sandiUlang}
                    onChange={(e) => setSandiUlang(e.target.value)}
                    placeholder={t('aturSandi.ulangiSandiBaru')}
                    autoComplete="new-password"
                  />
                </label>
                <button
                  type="submit"
                  disabled={sibuk}
                  className="btn-primary min-h-12 w-full text-base"
                >
                  {sibuk
                    ? t('login.memproses')
                    : t('aturSandi.simpanSandiBaru')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
