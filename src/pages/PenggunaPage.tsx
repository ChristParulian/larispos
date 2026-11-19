// Halaman Pengguna (khusus Owner, Tahap 2): daftar akun yang
// terdaftar beserta perannya, dan kelola akun pengguna lain:
// ubah nama, ubah peran, dan kirim tautan atur ulang kata sandi.
// Akun sendiri dikelola di halaman Profil Saya.
// Aturan ditegakkan database (004): hanya owner yang boleh mengubah
// peran, dan owner terakhir tidak boleh diturunkan.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchSemuaProfil,
  ubahNamaProfil,
  ubahPeranProfil,
} from '../lib/api'
import { kirimLinkAturUlangSandi, useAuth } from '../lib/auth'
import { isDemoMode } from '../lib/supabase'
import { formatTanggal } from '../lib/format'
import { IconChevron, IconSearch } from '../components/icons'
import type { Peran, Profil } from '../lib/types'

export default function PenggunaPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [cari, setCari] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [namaEdit, setNamaEdit] = useState('')
  const [sibukReset, setSibukReset] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const profilQuery = useQuery({
    queryKey: ['profil-semua'],
    queryFn: fetchSemuaProfil,
    enabled: !isDemoMode,
  })

  const ubahMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Peran; nama: string }) =>
      ubahPeranProfil(id, role),
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['profil-semua'] })
      setPesan(
        `Peran ${v.nama} diubah menjadi ${v.role === 'owner' ? 'Owner' : 'Kasir'}.`,
      )
      setError(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal mengubah peran.')
    },
  })

  const namaMutation = useMutation({
    mutationFn: ({ id, nama }: { id: string; nama: string }) =>
      ubahNamaProfil(id, nama),
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['profil-semua'] })
      setPesan(`Nama diubah menjadi ${v.nama}.`)
      setError(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal mengubah nama.')
    },
  })

  // Daftar terfilter: cari berdasarkan nama atau email.
  const profilTampil = useMemo(() => {
    const semua = profilQuery.data ?? []
    const q = cari.trim().toLowerCase()
    if (!q) return semua
    return semua.filter(
      (p) =>
        (p.nama ?? '').toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q),
    )
  }, [profilQuery.data, cari])

  const jumlahOwner = (profilQuery.data ?? []).filter(
    (p) => p.role === 'owner',
  ).length
  const jumlahKasir = (profilQuery.data ?? []).length - jumlahOwner

  function alihkanDetail(p: Profil) {
    const buka = detailId !== p.id
    setDetailId(buka ? p.id : null)
    if (buka) {
      setNamaEdit(p.nama ?? '')
    }
  }

  function konfirmasiUbah(p: Profil) {
    const target: Peran = p.role === 'owner' ? 'kasir' : 'owner'
    const nama = p.nama ?? p.email ?? 'pengguna ini'
    if (
      window.confirm(
        `Ubah ${nama} menjadi ${target === 'owner' ? 'Owner' : 'Kasir'}?`,
      )
    ) {
      ubahMutation.mutate({ id: p.id, role: target, nama })
    }
  }

  async function kirimReset(p: Profil) {
    if (!p.email) {
      setError('Pengguna ini tidak punya email.')
      return
    }
    setSibukReset(true)
    setError(null)
    setPesan(null)
    const err = await kirimLinkAturUlangSandi(p.email)
    setSibukReset(false)
    if (err) {
      setError(err)
      return
    }
    setPesan(`Link atur ulang kata sandi dikirim ke ${p.email}.`)
  }

  function badgePeran(role: Peran) {
    return (
      <span
        className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${
          role === 'owner'
            ? 'bg-aksen-100 text-aksen-800'
            : 'bg-kertas-gelap text-stone-700'
        }`}
      >
        {role === 'owner' ? 'Owner' : 'Kasir'}
      </span>
    )
  }

  if (isDemoMode) {
    return (
      <div>
        <h1 className="mb-3 judul-halaman">Pengguna</h1>
        <p className="rounded-lg bg-aksen-100 px-4 py-3 text-sm text-aksen-800">
          Halaman ini hanya tersedia saat memakai Supabase. Di mode demo
          tidak ada akun pengguna.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="judul-halaman">Pengguna</h1>
        <p className="mt-1 text-sm text-stone-600">
          Owner bisa melihat harga beli, laba, dan mengatur peran. Kasir
          fokus berjualan. Akun baru yang mendaftar otomatis menjadi
          Kasir. Ketuk salah satu pengguna untuk mengubah nama dan
          perannya, atau mengirim link atur ulang kata sandi. Untuk
          akunmu sendiri, buka Profil Saya di pojok kanan atas.
        </p>
        {profilQuery.data && (
          <p className="mt-2 text-sm">
            <span className="font-semibold">
              {profilQuery.data.length} pengguna
            </span>
            <span className="text-stone-600">
              {' '}· {jumlahOwner} Owner · {jumlahKasir} Kasir
            </span>
          </p>
        )}
      </div>

      <div className="relative mb-3">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-600" />
        <input
          type="search"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama atau email…"
          className="input pl-11"
        />
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

      {profilQuery.isLoading && (
        <p className="text-stone-600">Memuat pengguna…</p>
      )}
      {profilQuery.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat pengguna:{' '}
          {profilQuery.error instanceof Error
            ? profilQuery.error.message
            : 'terjadi kesalahan.'}
        </p>
      )}

      {profilQuery.data && profilQuery.data.length === 0 && (
        <p className="text-stone-600">Belum ada pengguna terdaftar.</p>
      )}

      {profilQuery.data &&
        profilQuery.data.length > 0 &&
        profilTampil.length === 0 && (
          <div className="card px-6 py-10 text-center">
            <p className="font-semibold">
              Tidak ada pengguna yang cocok dengan “{cari}”.
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Coba kata kunci lain.
            </p>
          </div>
        )}

      {profilTampil.length > 0 && (
        <div className="card">
          <ul className="divide-y divide-garis">
            {profilTampil.map((p) => {
              const iniSaya = p.id === user?.id
              const terbuka = detailId === p.id
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => alihkanDetail(p)}
                    aria-expanded={terbuka}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words font-medium">
                          {p.nama ?? 'Tanpa nama'}
                        </span>
                        {iniSaya && (
                          <span className="rounded-md bg-pinus-100 px-2 py-0.5 text-xs font-semibold text-pinus-800">
                            Kamu
                          </span>
                        )}
                        {badgePeran(p.role)}
                      </div>
                      <div className="mt-0.5 break-words text-sm text-stone-600">
                        {p.email ?? 'Tanpa email'}
                      </div>
                      <div className="text-xs text-stone-600">
                        Terdaftar {formatTanggal(p.created_at)}
                      </div>
                    </div>
                    <IconChevron
                      className={`h-5 w-5 shrink-0 text-stone-600 transition-transform ${
                        terbuka ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {terbuka && (
                    <div className="space-y-5 border-t border-dashed border-garis px-4 py-4 sm:px-5">
                      {iniSaya ? (
                        <>
                          <p className="text-sm text-stone-600">
                            Kelola nama, email, dan kata sandimu di
                            halaman{' '}
                            <Link
                              to="/profil-saya"
                              className="font-bold text-pinus-700 underline"
                            >
                              Profil Saya
                            </Link>
                            .
                          </p>
                          <p className="text-xs text-stone-600">
                            Peran sendiri tidak bisa diubah di sini.
                          </p>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="label">Nama</span>
                            <div className="flex gap-2">
                              <input
                                className="input"
                                value={namaEdit}
                                onChange={(e) => setNamaEdit(e.target.value)}
                                placeholder="Nama pengguna"
                                autoComplete="name"
                              />
                              <button
                                type="button"
                                disabled={
                                  namaMutation.isPending ||
                                  !namaEdit.trim() ||
                                  namaEdit.trim() === (p.nama ?? '')
                                }
                                onClick={() =>
                                  namaMutation.mutate({
                                    id: p.id,
                                    nama: namaEdit.trim(),
                                  })
                                }
                                className="btn-secondary min-h-11 shrink-0 px-4"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-garis pt-5">
                            <span className="label">Peran</span>
                            <div className="flex flex-wrap items-center gap-2">
                              {badgePeran(p.role)}
                              <button
                                type="button"
                                disabled={ubahMutation.isPending}
                                onClick={() => konfirmasiUbah(p)}
                                className="btn-secondary min-h-11 px-4"
                              >
                                {p.role === 'owner'
                                  ? 'Jadikan Kasir'
                                  : 'Jadikan Owner'}
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-garis pt-5">
                            <span className="label">Email</span>
                            <p className="text-sm text-stone-600">
                              Email hanya bisa diubah oleh pemilik akun
                              dari akunnya sendiri.
                            </p>
                          </div>

                          <div className="border-t border-dashed border-garis pt-5">
                            <span className="label">Kata sandi</span>
                            <p className="text-sm text-stone-600">
                              Kata sandi tidak bisa dilihat atau diubah
                              langsung. Kirim link atur ulang ke email
                              pengguna, dan dia mengatur kata sandi
                              barunya sendiri.
                            </p>
                            <button
                              type="button"
                              disabled={sibukReset || !p.email}
                              onClick={() => void kirimReset(p)}
                              className="btn-secondary mt-2 min-h-11 w-full sm:w-auto"
                            >
                              Kirim link atur ulang kata sandi
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
