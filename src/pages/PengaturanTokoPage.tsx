// Halaman Pengaturan Toko (owner saja): ubah nama toko yang
// tampil di header, judul tab browser, dan struk. (Pro juga
// bisa mengubah logo; lihat halaman yang sama di tree Pro.)

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { simpanPengaturan } from '../lib/api'
import { usePengaturan } from '../lib/usePengaturan'

export default function PengaturanTokoPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data: pengaturan, isLoading, isError } = usePengaturan()
  const [nama, setNama] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pesan, setPesan] = useState<string | null>(null)

  // Nilai nama mengikuti pengaturan sampai pengguna mulai mengetik.
  const namaTampil = nama ?? pengaturan?.nama_toko ?? ''

  const simpanMutation = useMutation({
    mutationFn: (namaBaru: string) => simpanPengaturan({ nama_toko: namaBaru }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pengaturan'] })
      setPesan(t('pengaturanToko.disimpan'))
      setError(null)
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error ? err.message : t('pengaturanToko.gagalSimpan'),
      )
    },
  })

  function simpan() {
    const bersih = namaTampil.trim()
    if (!bersih) {
      setError(t('pengaturanToko.namaWajib'))
      return
    }
    if (bersih.length > 50) {
      setError(t('pengaturanToko.namaMaksimal'))
      return
    }
    setError(null)
    setPesan(null)
    simpanMutation.mutate(bersih)
  }

  if (isLoading) {
    return <p className="text-stone-600">{t('umum.memuat')}</p>
  }

  if (isError || !pengaturan) {
    return (
      <div>
        <h1 className="mb-3 judul-halaman">{t('pengaturanToko.judul')}</h1>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('pengaturanToko.gagalMemuat')}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="judul-halaman">{t('pengaturanToko.judul')}</h1>
        <p className="mt-1 text-sm text-stone-600">
          {t('pengaturanToko.keterangan')}
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

      <div className="card px-4 py-4 sm:px-5">
        <label htmlFor="nama-toko" className="label">
          {t('pengaturanToko.namaToko')}
        </label>
        <input
          id="nama-toko"
          className="input"
          value={namaTampil}
          maxLength={50}
          onChange={(e) => setNama(e.target.value)}
          placeholder={t('pengaturanToko.placeholderNama')}
        />
        <p className="mt-1.5 text-xs text-stone-600">
          {t('pengaturanToko.keteranganNama')}
        </p>
        <button
          type="button"
          disabled={
            simpanMutation.isPending ||
            !namaTampil.trim() ||
            namaTampil.trim() === pengaturan.nama_toko
          }
          onClick={simpan}
          className="btn-primary mt-3 min-h-11"
        >
          {t('umum.simpan')}
        </button>
      </div>
    </div>
  )
}
