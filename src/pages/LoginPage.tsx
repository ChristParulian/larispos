// Halaman Masuk / Daftar (Tahap 2).
// Akun pertama yang mendaftar otomatis menjadi Owner, akun
// berikutnya menjadi Kasir (trigger di 004_tahap2_auth.sql).
// Bila konfirmasi email aktif di project Supabase, pendaftar harus
// mengklik tautan di email sebelum bisa masuk.

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { IconKasir } from '../components/icons'

type Mode = 'masuk' | 'daftar'

export default function LoginPage() {
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
    return <p className="p-8 text-center text-stone-500">Memuat…</p>
  }
  if (user) {
    return <Navigate to="/kasir" replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!email.trim() || !password) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }
    if (mode === 'daftar') {
      if (!nama.trim()) {
        setError('Nama wajib diisi.')
        return
      }
      if (password.length < 6) {
        setError('Kata sandi minimal 6 karakter.')
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
          navigate('/kasir', { replace: true })
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
          setInfo(
            'Akun dibuat! Cek emailmu dan klik tautan konfirmasi sebelum masuk.',
          )
          setMode('masuk')
        } else {
          navigate('/kasir', { replace: true })
        }
      }
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-stone-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-md">
            <IconKasir className="h-8 w-8" strokeWidth={1.6} />
          </span>
          <div className="mt-3 text-3xl font-bold tracking-tight text-emerald-700">
            LarisPOS
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Kasir warung kelontong — masuk untuk mulai berjualan.
          </p>
        </div>

        <div className="card p-5 shadow-md sm:p-6">
          <div className="mb-5 flex gap-2 rounded-xl bg-stone-100 p-1">
            {(
              [
                { mode: 'masuk', label: 'Masuk' },
                { mode: 'daftar', label: 'Daftar' },
              ] as const
            ).map((t) => (
              <button
                key={t.mode}
                type="button"
                onClick={() => {
                  setMode(t.mode)
                  setError(null)
                  setInfo(null)
                }}
                className={`min-h-11 flex-1 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${
                  mode === t.mode
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {info && (
            <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {info}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'daftar' && (
              <label className="block">
                <span className="label">Nama *</span>
                <input
                  className="input"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="mis. Budi Santoso"
                  autoComplete="name"
                />
              </label>
            )}
            <label className="block">
              <span className="label">Email *</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <span className="label">
                Kata sandi *{' '}
                {mode === 'daftar' && (
                  <span className="font-normal text-stone-500">
                    (minimal 6 karakter)
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
            <button
              type="submit"
              disabled={sibuk}
              className="btn-primary min-h-12 w-full text-base"
            >
              {sibuk
                ? 'Memproses…'
                : mode === 'masuk'
                  ? 'Masuk'
                  : 'Buat Akun'}
            </button>
          </form>

          {mode === 'daftar' && (
            <p className="mt-4 text-xs leading-relaxed text-stone-500">
              Akun pertama yang mendaftar otomatis menjadi{' '}
              <strong>Owner</strong> (bisa melihat harga beli, laba, dan
              mengatur pengguna). Akun berikutnya menjadi{' '}
              <strong>Kasir</strong> — fokus berjualan, tanpa akses harga beli
              dan laba.
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-stone-400">
          LarisPOS — kasir warung kelontong, open source (MIT).
        </p>
      </div>
    </div>
  )
}
