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
import type { Peran } from '../lib/types'

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

  if (isDemoMode) {
    return (
      <div>
        <h1 className="mb-3 text-2xl font-bold">Pengguna</h1>
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Halaman ini hanya tersedia saat memakai Supabase. Di mode demo
          tidak ada akun pengguna.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Pengguna</h1>
      <p className="mb-3 text-sm text-stone-500">
        Owner bisa melihat harga beli, laba, dan mengatur peran. Kasir
        fokus berjualan. Akun baru yang mendaftar otomatis menjadi
        Kasir.
      </p>

      {pesan && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {pesan}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {profilQuery.isLoading && (
        <p className="text-stone-500">Memuat pengguna…</p>
      )}
      {profilQuery.isError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Gagal memuat pengguna:{' '}
          {profilQuery.error instanceof Error
            ? profilQuery.error.message
            : 'terjadi kesalahan.'}
        </p>
      )}

      {profilQuery.data && (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
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
                  <tr key={p.id} className="border-b last:border-0">
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
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          p.role === 'owner'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {p.role === 'owner' ? 'Owner' : 'Kasir'}
                      </span>
                    </td>
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
                          onClick={() => {
                            const target: Peran =
                              p.role === 'owner' ? 'kasir' : 'owner'
                            if (
                              window.confirm(
                                `Ubah ${p.nama ?? 'pengguna ini'} menjadi ${
                                  target === 'owner' ? 'Owner' : 'Kasir'
                                }?`,
                              )
                            ) {
                              ubahMutation.mutate({ id: p.id, role: target })
                            }
                          }}
                          className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-semibold hover:bg-stone-100 disabled:opacity-50"
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
      )}
    </div>
  )
}
