// Halaman Masuk / Daftar (Tahap 2).
// Akun pertama yang mendaftar otomatis menjadi Owner, akun
// berikutnya menjadi Kasir (trigger di 004_tahap2_auth.sql).
// Bila konfirmasi email aktif di project Supabase, pendaftar harus
// mengklik tautan di email sebelum bisa masuk. Mode "lupa" mengirim
// tautan atur ulang kata sandi ke email pengguna.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { kirimLinkAturUlangSandi, useAuth } from '../lib/auth'
import { BrandMark } from '../components/icons'
import PemilihBahasa from '../components/PemilihBahasa'

type Mode = 'masuk' | 'daftar' | 'lupa'

export default function LoginPage() {
  const { t } = useTranslation()
  const { user, loading, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('masuk')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  if (loading) {
    return <p className="p-8 text-center text-stone-600">{t('umum.memuat')}</p>
  }
  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (mode === 'lupa') {
      if (!email.trim()) {
        setError(t('login.emailWajib'))
        return
      }
      setSibuk(true)
      try {
        const err = await kirimLinkAturUlangSandi(email.trim())
        if (err) {
          setError(err)
        } else {
          setInfo(t('login.linkTerkirim'))
        }
      } finally {
        setSibuk(false)
      }
      return
    }
    if (!email.trim() || !password) {
      setError(t('login.emailSandiWajib'))
      return
    }
    if (mode === 'daftar') {
      if (!nama.trim()) {
        setError(t('login.namaWajib'))
        return
      }
      if (password.length < 6) {
        setError(t('galat.sandiMin6'))
        return
      }
    }
    setSibuk(true)
    try {
      if (mode === 'masuk') {
        const err = await signIn(email.trim(), password)
        if (err) {
          setError(err)
        } else {
          navigate('/dashboard', { replace: true })
        }
      } else {
        const { needsConfirmation, error: err } = await signUp(
          email.trim(),
          password,
          nama.trim(),
        )
        if (err) {
          setError(err)
        } else if (needsConfirmation) {
          setInfo(t('login.akunDibuat'))
          setMode('masuk')
        } else {
          navigate('/dashboard', { replace: true })
        }
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
          <p className="mt-1 text-sm text-stone-600">{t('login.tagline')}</p>
        </div>

        <div className="card p-5 sm:p-6">
          {mode === 'lupa' ? (
            <div className="mb-5">
              <h1 className="text-lg font-bold">{t('login.lupaJudul')}</h1>
              <p className="mt-1 text-sm text-stone-600">
                {t('login.lupaKeterangan')}
              </p>
            </div>
          ) : (
            <div className="mb-5 flex gap-2 rounded-lg bg-kertas-gelap p-1">
              {(
                [
                  { mode: 'masuk', label: t('login.masuk') },
                  { mode: 'daftar', label: t('login.daftar') },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.mode}
                  type="button"
                  onClick={() => {
                    setMode(tab.mode)
                    setError(null)
                    setInfo(null)
                  }}
                  className={`min-h-11 flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                    mode === tab.mode
                      ? 'bg-pinus-800 text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="mb-4 rounded-lg bg-pinus-50 px-4 py-3 text-sm text-pinus-800">
              {info}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'daftar' && (
              <label className="block">
                <span className="label">{t('umum.nama')} *</span>
                <input
                  className="input"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder={t('login.contohNama')}
                  autoComplete="name"
                />
              </label>
            )}
            <label className="block">
              <span className="label">{t('umum.email')} *</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
              />
            </label>
            {mode !== 'lupa' && (
              <label className="block">
                <span className="label">
                  {t('umum.kataSandi')} *{' '}
                  {mode === 'daftar' && (
                    <span className="font-normal text-stone-600">
                      {t('login.min6Karakter')}
                    </span>
                  )}
                </span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    mode === 'masuk' ? 'current-password' : 'new-password'
                  }
                />
              </label>
            )}
            <button
              type="submit"
              disabled={sibuk}
              className="btn-primary min-h-12 w-full text-base"
            >
              {sibuk
                ? t('login.memproses')
                : mode === 'masuk'
                  ? t('login.masuk')
                  : mode === 'daftar'
                    ? t('login.buatAkun')
                    : t('login.kirimLink')}
            </button>
          </form>

          {mode === 'masuk' && (
            <button
              type="button"
              onClick={() => {
                setMode('lupa')
                setError(null)
                setInfo(null)
              }}
              className="mt-4 min-h-11 w-full text-center text-sm font-bold text-pinus-700"
            >
              {t('login.lupaTombol')}
            </button>
          )}
          {mode === 'lupa' && (
            <button
              type="button"
              onClick={() => {
                setMode('masuk')
                setError(null)
                setInfo(null)
              }}
              className="mt-4 min-h-11 w-full text-center text-sm font-bold text-pinus-700"
            >
              {t('login.kembaliMasuk')}
            </button>
          )}

          {mode === 'daftar' && (
            <p className="mt-4 text-xs leading-relaxed text-stone-600">
              {t('login.daftarCatatanAwal')}{' '}
              <strong>{t('pengguna.peranOwner')}</strong>{' '}
              {t('login.daftarCatatanTengah')}{' '}
              <strong>{t('pengguna.peranKasir')}</strong>
              {t('login.daftarCatatanAkhir')}
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-center">
          <PemilihBahasa />
        </div>
      </div>
    </div>
  )
}
