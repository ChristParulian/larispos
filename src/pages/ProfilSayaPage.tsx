// Halaman Profil Saya: kelola akun sendiri (nama, email, kata
// sandi). Bisa dibuka semua pengguna login, termasuk kasir.
// Aturannya sama seperti di PenggunaPage: email diubah lewat
// tautan konfirmasi ke email baru (disalin ke profiles lewat
// trigger 012), kata sandi diubah setelah verifikasi kata sandi
// saat ini.

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ubahNamaProfil } from '../lib/api'
import {
  ubahEmailSendiri,
  ubahKataSandiSendiri,
  useAuth,
} from '../lib/auth'
import { isDemoMode } from '../lib/supabase'
import { formatTanggal } from '../lib/format'

type AksiSibuk = 'email' | 'sandi' | null

export default function ProfilSayaPage() {
  const { user, profil, loading, muatUlangProfil } = useAuth()
  const queryClient = useQueryClient()
  const [namaEdit, setNamaEdit] = useState<string | null>(null)
  const [emailBaru, setEmailBaru] = useState('')
  const [sandiLama, setSandiLama] = useState('')
  const [sandiBaru, setSandiBaru] = useState('')
  const [sandiBaruUlang, setSandiBaruUlang] = useState('')
  const [lihatSandi, setLihatSandi] = useState(false)
  const [sibukAksi, setSibukAksi] = useState<AksiSibuk>(null)
  const [error, setError] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  // Nilai nama mengikuti profil sampai pengguna mulai mengetik.
  const namaTampil = namaEdit ?? profil?.nama ?? ''

  const namaMutation = useMutation({
    mutationFn: ({ id, nama }: { id: string; nama: string }) =>
      ubahNamaProfil(id, nama),
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['profil-semua'] })
      void muatUlangProfil()
      setPesan(`Nama diubah menjadi ${v.nama}.`)
      setError(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal mengubah nama.')
    },
  })

  async function simpanEmail() {
    const baru = emailBaru.trim()
    if (!baru) {
      setError('Email baru wajib diisi.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(baru)) {
      setError('Format email tidak valid.')
      return
    }
    if (baru.toLowerCase() === (profil?.email ?? '').toLowerCase()) {
      setError('Email baru sama dengan email saat ini.')
      return
    }
    setSibukAksi('email')
    setError(null)
    setPesan(null)
    const err = await ubahEmailSendiri(baru)
    setSibukAksi(null)
    if (err) {
      setError(err)
      return
    }
    setPesan(
      `Link konfirmasi dikirim ke ${baru}. Email berubah setelah kamu membuka link itu.`,
    )
    setEmailBaru('')
  }

  async function simpanSandi() {
    if (!sandiLama || !sandiBaru || !sandiBaruUlang) {
      setError('Semua kolom kata sandi wajib diisi.')
      return
    }
    if (sandiBaru.length < 8) {
      setError('Kata sandi baru minimal 8 karakter.')
      return
    }
    if (sandiBaru !== sandiBaruUlang) {
      setError('Konfirmasi kata sandi baru tidak cocok.')
      return
    }
    const email = user?.email
    if (!email) {
      setError('Email akun tidak ditemukan. Masuk ulang lalu coba lagi.')
      return
    }
    setSibukAksi('sandi')
    setError(null)
    setPesan(null)
    const err = await ubahKataSandiSendiri(email, sandiLama, sandiBaru)
    setSibukAksi(null)
    if (err) {
      setError(err)
      return
    }
    setPesan('Kata sandi diubah.')
    setSandiLama('')
    setSandiBaru('')
    setSandiBaruUlang('')
  }

  if (loading) {
    return <p className="text-stone-600">Memuat profil…</p>
  }

  if (isDemoMode) {
    return (
      <div>
        <h1 className="mb-3 judul-halaman">Profil Saya</h1>
        <p className="rounded-lg bg-aksen-100 px-4 py-3 text-sm text-aksen-800">
          Halaman ini hanya tersedia saat memakai Supabase. Di mode demo
          tidak ada akun pengguna.
        </p>
      </div>
    )
  }

  if (!profil) {
    return (
      <div>
        <h1 className="mb-3 judul-halaman">Profil Saya</h1>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat profil. Coba muat ulang halaman.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="judul-halaman">Profil Saya</h1>
        <p className="mt-1 text-sm text-stone-600">
          Kelola akunmu: nama, email, dan kata sandi.
        </p>
      </div>

      {pesan && (
        <p className="mb-3 rounded-lg bg-pinus-50 px-4 py-3 text-sm text-pinus-800">
          {pesan}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="card">
        <div className="px-4 py-4 sm:px-5">
          <div className="break-words font-medium">
            {profil.nama ?? 'Tanpa nama'}
          </div>
          <div className="mt-0.5 break-words text-sm text-stone-600">
            {profil.email ?? 'Tanpa email'}
          </div>
          <div className="text-xs text-stone-600">
            Peran {profil.role === 'owner' ? 'Owner' : 'Kasir'} · Terdaftar{' '}
            {formatTanggal(profil.created_at)}
          </div>
        </div>

        <div className="space-y-5 border-t border-dashed border-garis px-4 py-4 sm:px-5">
          <div>
            <span className="label">Nama</span>
            <div className="flex gap-2">
              <input
                className="input"
                value={namaTampil}
                onChange={(e) => setNamaEdit(e.target.value)}
                placeholder="Nama pengguna"
                autoComplete="name"
              />
              <button
                type="button"
                disabled={
                  namaMutation.isPending ||
                  !namaTampil.trim() ||
                  namaTampil.trim() === (profil.nama ?? '')
                }
                onClick={() =>
                  namaMutation.mutate({
                    id: profil.id,
                    nama: namaTampil.trim(),
                  })
                }
                className="btn-secondary min-h-11 shrink-0 px-4"
              >
                Simpan
              </button>
            </div>
          </div>

          <div className="border-t border-dashed border-garis pt-5">
            <span className="label">Email</span>
            <p className="text-sm text-stone-600">
              Email saat ini: {profil.email ?? 'Tanpa email'}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="email"
                className="input"
                value={emailBaru}
                onChange={(e) => setEmailBaru(e.target.value)}
                placeholder="Email baru"
                autoComplete="email"
              />
              <button
                type="button"
                disabled={sibukAksi === 'email'}
                onClick={() => void simpanEmail()}
                className="btn-secondary min-h-11 shrink-0 px-4"
              >
                Ubah email
              </button>
            </div>
            <p className="mt-1.5 text-xs text-stone-600">
              Link konfirmasi dikirim ke email baru. Email berubah setelah
              kamu membuka link itu.
            </p>
          </div>

          <div className="border-t border-dashed border-garis pt-5">
            <div className="flex items-center justify-between">
              <span className="label">Kata sandi</span>
              <button
                type="button"
                onClick={() => setLihatSandi((v) => !v)}
                className="min-h-11 px-2 text-xs font-bold text-pinus-700"
              >
                {lihatSandi ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            <div className="space-y-2">
              <input
                type={lihatSandi ? 'text' : 'password'}
                className="input"
                value={sandiLama}
                onChange={(e) => setSandiLama(e.target.value)}
                placeholder="Kata sandi saat ini"
                autoComplete="current-password"
              />
              <input
                type={lihatSandi ? 'text' : 'password'}
                className="input"
                value={sandiBaru}
                onChange={(e) => setSandiBaru(e.target.value)}
                placeholder="Kata sandi baru (minimal 8 karakter)"
                autoComplete="new-password"
              />
              <input
                type={lihatSandi ? 'text' : 'password'}
                className="input"
                value={sandiBaruUlang}
                onChange={(e) => setSandiBaruUlang(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                autoComplete="new-password"
              />
            </div>
            <button
              type="button"
              disabled={sibukAksi === 'sandi'}
              onClick={() => void simpanSandi()}
              className="btn-secondary mt-2 min-h-11 w-full sm:w-auto"
            >
              Ubah kata sandi
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
