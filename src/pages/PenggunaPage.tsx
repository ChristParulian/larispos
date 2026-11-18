// Halaman Pengguna (khusus Owner, Tahap 2): daftar akun yang
// terdaftar beserta perannya, dan ubah peran owner/kasir.
// Aturan ditegakkan database (004): hanya owner yang boleh mengubah
// peran, dan owner terakhir tidak boleh diturunkan.

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSemuaProfil, ubahPeranProfil } from '../lib/api'
import { useAuth } from '../lib/auth'
import { isDemoMode } from '../lib/supabase'
import { formatTanggal } from '../lib/format'
import type { Peran, Profil } from '../lib/types'

export default function PenggunaPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  const profilQuery = useQuery({
    queryKey: ['profil-semua'],
    queryFn: fetchSemuaProfil,
    enabled: !isDemoMode,
  })

  const ubahMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Peran }) =>
      ubahPeranProfil(id, role),
    onSuccess: (_d, v) => {
      void queryClient.invalidateQueries({ queryKey: ['profil-semua'] })
      setPesan(
        `Peran diubah menjadi ${v.role === 'owner' ? 'Owner' : 'Kasir'}.`,
      )
      setError(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal mengubah peran.')
    },
  })

  function konfirmasiUbah(p: Profil) {
    const target: Peran = p.role === 'owner' ? 'kasir' : 'owner'
    if (
      window.confirm(
        `Ubah ${p.nama ?? 'pengguna ini'} menjadi ${
          target === 'owner' ? 'Owner' : 'Kasir'
        }?`,
      )
    ) {
      ubahMutation.mutate({ id: p.id, role: target })
    }
  }

  function badgePeran(role: Peran) {
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
          role === 'owner'
            ? 'bg-amber-100 text-amber-800'
            : 'bg-stone-100 text-stone-700'
        }`}
      >
        {role === 'owner' ? 'Owner' : 'Kasir'}
      </span>
    )
  }

  if (isDemoMode) {
    return (
      <div>
        <h1 className="mb-3 text-2xl font-bold">Pengguna</h1>
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Halaman ini hanya tersedia saat memakai Supabase. Di mode demo
          tidak ada akun pengguna.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Pengguna</h1>
        <p className="mt-1 text-sm text-stone-500">
          Owner bisa melihat harga beli, laba, dan mengatur peran. Kasir
          fokus berjualan. Akun baru yang mendaftar otomatis menjadi
          Kasir.
        </p>
      </div>

      {pesan && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {pesan}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {profilQuery.isLoading && (
        <p className="text-stone-500">Memuat pengguna…</p>
      )}
      {profilQuery.isError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat pengguna:{' '}
          {profilQuery.error instanceof Error
            ? profilQuery.error.message
            : 'terjadi kesalahan.'}
        </p>
      )}

      {profilQuery.data && profilQuery.data.length === 0 && (
        <p className="text-stone-500">Belum ada pengguna terdaftar.</p>
      )}

      {profilQuery.data && profilQuery.data.length > 0 && (
        <>
          {/* Tabel untuk layar besar, kartu untuk HP */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-stone-50 text-left">
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Peran</th>
                  <th className="px-4 py-3 font-semibold">Terdaftar</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {profilQuery.data.map((p) => {
                  const iniSaya = p.id === user?.id
                  return (
                    <tr
                      key={p.id}
                      className="border-b transition-colors last:border-0 hover:bg-stone-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {p.nama ?? 'Tanpa nama'}
                          {iniSaya && (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              Kamu
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500">
                          #{p.id.slice(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-4 py-3">{badgePeran(p.role)}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {formatTanggal(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {iniSaya ? (
                          <span className="text-xs text-stone-400">
                            Peran sendiri tidak bisa diubah di sini.
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={ubahMutation.isPending}
                            onClick={() => konfirmasiUbah(p)}
                            className="inline-flex min-h-9 items-center rounded-lg border border-stone-300 px-3 text-xs font-bold hover:bg-stone-100 disabled:opacity-50"
                          >
                            {p.role === 'owner'
                              ? 'Jadikan Kasir'
                              : 'Jadikan Owner'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {profilQuery.data.map((p) => {
              const iniSaya = p.id === user?.id
              return (
                <div key={p.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="break-words font-semibold leading-snug">
                        {p.nama ?? 'Tanpa nama'}
                        {iniSaya && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            Kamu
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-stone-500">
                        #{p.id.slice(0, 8).toUpperCase()} · Terdaftar{' '}
                        {formatTanggal(p.created_at)}
                      </div>
                    </div>
                    {badgePeran(p.role)}
                  </div>
                  {iniSaya ? (
                    <p className="mt-3 text-xs text-stone-400">
                      Peran sendiri tidak bisa diubah di sini.
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={ubahMutation.isPending}
                      onClick={() => konfirmasiUbah(p)}
                      className="btn-secondary mt-3 min-h-10 w-full py-2"
                    >
                      {p.role === 'owner' ? 'Jadikan Kasir' : 'Jadikan Owner'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
