// Halaman Masuk / Daftar (Tahap 2).
// Akun pertama yang mendaftar otomatis menjadi Owner, akun
// berikutnya menjadi Kasir (trigger di 004_tahap2_auth.sql).
// Bila konfirmasi email aktif di project Supabase, pendaftar harus
// mengklik tautan di email sebelum bisa masuk.

import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

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

  const inputCls =
    'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-3xl font-bold tracking-tight text-emerald-700">
          LarisPOS
        </div>
        <p className="mt-1 text-sm text-stone-500">
          Kasir warung kelontong — masuk untuk mulai berjualan.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex gap-2">
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
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${
                mode === t.mode
                  ? 'bg-emerald-700 text-white'
                  : 'border border-stone-300 bg-white text-stone-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {info && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {info}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'daftar' && (
            <label className="block">
              <span className="text-sm font-medium">Nama *</span>
              <input
                className={inputCls}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="mis. Budi Santoso"
                autoComplete="name"
              />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium">Email *</span>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">
              Kata sandi *{' '}
              {mode === 'daftar' && (
                <span className="font-normal text-stone-500">
                  (minimal 6 karakter)
                </span>
              )}
            </span>
            <input
              className={inputCls}
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
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
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
    </div>
  )
}
