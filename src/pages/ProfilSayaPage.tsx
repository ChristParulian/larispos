// Halaman Profil Saya: kelola akun sendiri (nama, email, kata
// sandi). Bisa dibuka semua pengguna login, termasuk kasir.
// Aturannya sama seperti di PenggunaPage: email diubah langsung
// lewat fungsi ubah_email_sendiri (disalin ke profiles lewat
// trigger 012), kata sandi diubah setelah verifikasi kata sandi
// saat ini.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { NAMA_TOKO_BAWAAN, ubahNamaProfil } from '../lib/api'
import { ubahEmailSendiri, ubahKataSandiSendiri, useAuth } from '../lib/auth'
import { usePengaturan } from '../lib/usePengaturan'
import { isDemoMode } from '../lib/supabase'
import { formatTanggal } from '../lib/format'
import PemilihBahasa from '../components/PemilihBahasa'

type AksiSibuk = 'email' | 'sandi' | null

/** Bagian pemilih bahasa tampilan (Indonesia / Inggris). */
function BagianBahasa() {
  const { t } = useTranslation()
  return (
    <div>
      <span className="label">{t('bahasa.judul')}</span>
      <div className="mt-1">
        <PemilihBahasa />
      </div>
      <p className="mt-1.5 text-xs text-stone-600">{t('bahasa.keterangan')}</p>
    </div>
  )
}

/** Bagian tautan ke Pengaturan Toko (owner saja). */
function BagianToko() {
  const { t } = useTranslation()
  const { data: pengaturan } = usePengaturan()
  return (
    <div>
      <span className="label">{t('pengaturanToko.judul')}</span>
      <p className="mt-1 text-sm text-stone-600">
        {t('pengaturanToko.namaSaatIni', {
          nama: pengaturan?.nama_toko ?? NAMA_TOKO_BAWAAN,
        })}
      </p>
      <Link
        to="/pengaturan-toko"
        className="btn-secondary mt-2 inline-flex min-h-11 items-center px-4"
      >
        {t('pengaturanToko.ubahNama')}
      </Link>
    </div>
  )
}

export default function ProfilSayaPage() {
  const { t } = useTranslation()
  const { user, profil, loading, muatUlangProfil, isOwner } = useAuth()
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
      setPesan(t('pengguna.namaDiubah', { nama: v.nama }))
      setError(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t('pengguna.gagalUbahNama'))
    },
  })

  async function simpanEmail() {
    const baru = emailBaru.trim()
    if (!baru) {
      setError(t('profil.emailBaruWajib'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(baru)) {
      setError(t('galat.emailTidakValid'))
      return
    }
    if (baru.toLowerCase() === (profil?.email ?? '').toLowerCase()) {
      setError(t('profil.emailBaruSama'))
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
    setPesan(t('profil.emailDiubah', { email: baru }))
    setEmailBaru('')
    void muatUlangProfil()
  }

  async function simpanSandi() {
    if (!sandiLama || !sandiBaru || !sandiBaruUlang) {
      setError(t('profil.semuaKolomSandiWajib'))
      return
    }
    if (sandiBaru.length < 8) {
      setError(t('galat.sandiBaruMin8'))
      return
    }
    if (sandiBaru !== sandiBaruUlang) {
      setError(t('aturSandi.konfirmasiTidakCocok'))
      return
    }
    const email = user?.email
    if (!email) {
      setError(t('profil.emailAkunTidakDitemukan'))
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
    setPesan(t('profil.sandiDiubah'))
    setSandiLama('')
    setSandiBaru('')
    setSandiBaruUlang('')
  }

  if (loading) {
    return <p className="text-stone-600">{t('profil.memuat')}</p>
  }

  if (isDemoMode) {
    return (
      <div>
        <h1 className="mb-3 judul-halaman">{t('profil.judul')}</h1>
        <p className="rounded-lg bg-aksen-100 px-4 py-3 text-sm text-aksen-800">
          {t('pengguna.hanyaSupabase')}
        </p>
        <div className="card mt-4 px-4 py-4 sm:px-5">
          <BagianBahasa />
          <div className="mt-5 border-t border-dashed border-garis pt-5">
            <BagianToko />
          </div>
        </div>
      </div>
    )
  }

  if (!profil) {
    return (
      <div>
        <h1 className="mb-3 judul-halaman">{t('profil.judul')}</h1>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('profil.gagalMemuat')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="judul-halaman">{t('profil.judul')}</h1>
        <p className="mt-1 text-sm text-stone-600">{t('profil.keterangan')}</p>
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
            {profil.nama ?? t('pengguna.tanpaNama')}
          </div>
          <div className="mt-0.5 break-words text-sm text-stone-600">
            {profil.email ?? t('pengguna.tanpaEmail')}
          </div>
          <div className="text-xs text-stone-600">
            {t('profil.ringkasanAkun', {
              peran: t(
                profil.role === 'owner'
                  ? 'pengguna.peranOwner'
                  : 'pengguna.peranKasir',
              ),
              tanggal: formatTanggal(profil.created_at),
            })}
          </div>
        </div>

        <div className="space-y-5 border-t border-dashed border-garis px-4 py-4 sm:px-5">
          <BagianBahasa />

          {isOwner && (
            <div className="border-t border-dashed border-garis pt-5">
              <BagianToko />
            </div>
          )}

          <div className="border-t border-dashed border-garis pt-5">
            <label htmlFor="nama-profil" className="label">
              {t('umum.nama')}
            </label>
            <div className="flex gap-2">
              <input
                id="nama-profil"
                className="input"
                value={namaTampil}
                onChange={(e) => setNamaEdit(e.target.value)}
                placeholder={t('pengguna.placeholderNama')}
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
                {t('umum.simpan')}
              </button>
            </div>
          </div>

          <div className="border-t border-dashed border-garis pt-5">
            <label htmlFor="email-profil" className="label">
              {t('umum.email')}
            </label>
            <p className="text-sm text-stone-600">
              {t('profil.emailSaatIni', {
                email: profil.email ?? t('pengguna.tanpaEmail'),
              })}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                id="email-profil"
                type="email"
                className="input"
                value={emailBaru}
                onChange={(e) => setEmailBaru(e.target.value)}
                placeholder={t('profil.emailBaruPlaceholder')}
                autoComplete="email"
              />
              <button
                type="button"
                disabled={sibukAksi === 'email'}
                onClick={() => void simpanEmail()}
                className="btn-secondary min-h-11 shrink-0 px-4"
              >
                {t('profil.ubahEmail')}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-stone-600">
              {t('profil.keteranganEmail')}
            </p>
          </div>

          <div className="border-t border-dashed border-garis pt-5">
            <div className="flex items-center justify-between">
              <span className="label">{t('umum.kataSandi')}</span>
              <button
                type="button"
                onClick={() => setLihatSandi((v) => !v)}
                className="min-h-11 px-2 text-xs font-bold text-pinus-700"
              >
                {lihatSandi ? t('aturSandi.sembunyikan') : t('aturSandi.lihat')}
              </button>
            </div>
            <div className="space-y-2">
              <input
                type={lihatSandi ? 'text' : 'password'}
                className="input"
                value={sandiLama}
                onChange={(e) => setSandiLama(e.target.value)}
                placeholder={t('profil.sandiSaatIni')}
                aria-label={t('profil.sandiSaatIni')}
                autoComplete="current-password"
              />
              <input
                type={lihatSandi ? 'text' : 'password'}
                className="input"
                value={sandiBaru}
                onChange={(e) => setSandiBaru(e.target.value)}
                placeholder={t('profil.sandiBaruPlaceholder')}
                aria-label={t('profil.sandiBaruPlaceholder')}
                autoComplete="new-password"
              />
              <input
                type={lihatSandi ? 'text' : 'password'}
                className="input"
                value={sandiBaruUlang}
                onChange={(e) => setSandiBaruUlang(e.target.value)}
                placeholder={t('aturSandi.ulangiSandiBaru')}
                aria-label={t('aturSandi.ulangiSandiBaru')}
                autoComplete="new-password"
              />
            </div>
            <button
              type="button"
              disabled={sibukAksi === 'sandi'}
              onClick={() => void simpanSandi()}
              className="btn-secondary mt-2 min-h-11 w-full sm:w-auto"
            >
              {t('profil.ubahSandi')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
