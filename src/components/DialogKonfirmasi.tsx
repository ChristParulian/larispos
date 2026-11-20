// Dialog konfirmasi di dalam aplikasi, pengganti window.confirm:
// tampilannya mengikuti desain LarisPOS, teksnya diterjemahkan,
// dan bisa dipakai keyboard. Escape atau klik di luar kartu
// membatalkan; Tab berputar di dalam dialog; fokus awal jatuh ke
// tombol Batal supaya aksi berbahaya tidak pernah jadi pilihan
// bawaan saat pengguna menekan Enter; saat dialog ditutup, fokus
// kembali ke tombol yang membukanya.

import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  judul: string
  pesan: string
  labelKonfirmasi: string
  // Aksi berbahaya (hapus, batalkan, reset): tombol konfirmasi
  // memakai garis merah. Aksi yang bisa dibalik (ubah peran)
  // memakai tombol primer biasa.
  berbahaya?: boolean
  onKonfirmasi: () => void
  onBatal: () => void
}

export default function DialogKonfirmasi({
  judul,
  pesan,
  labelKonfirmasi,
  berbahaya = false,
  onKonfirmasi,
  onBatal,
}: Props) {
  const { t } = useTranslation()
  const refDialog = useRef<HTMLDivElement>(null)
  const refBatal = useRef<HTMLButtonElement>(null)
  // Elemen yang memicu dialog, supaya fokus bisa kembali ke sana
  // saat dialog ditutup.
  const refPemicu = useRef<Element | null>(null)

  useEffect(() => {
    refPemicu.current = document.activeElement
    refBatal.current?.focus()
    // Halaman di belakang dialog tidak bisa di-scroll selama dialog
    // terbuka.
    const overflowAwal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflowAwal
      const pemicu = refPemicu.current
      if (pemicu instanceof HTMLElement) pemicu.focus()
    }
  }, [])

  function tekanTombol(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onBatal()
      return
    }
    if (e.key !== 'Tab' || !refDialog.current) return
    // Jebak fokus di dalam dialog: Tab dari tombol terakhir kembali
    // ke tombol pertama, dan sebaliknya dengan Shift+Tab.
    const tombol = Array.from(
      refDialog.current.querySelectorAll('button:not([disabled])'),
    )
    if (tombol.length === 0) return
    const pertama = tombol[0] as HTMLElement
    const terakhir = tombol[tombol.length - 1] as HTMLElement
    if (e.shiftKey && document.activeElement === pertama) {
      e.preventDefault()
      terakhir.focus()
    } else if (!e.shiftKey && document.activeElement === terakhir) {
      e.preventDefault()
      pertama.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 no-print"
      onClick={onBatal}
    >
      <div
        ref={refDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-dialog-konfirmasi"
        aria-describedby="pesan-dialog-konfirmasi"
        className="w-full max-w-md rounded-t-lg bg-white shadow-angkat sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={tekanTombol}
      >
        <div className="px-6 py-6">
          <h2 id="judul-dialog-konfirmasi" className="text-lg font-bold">
            {judul}
          </h2>
          <p
            id="pesan-dialog-konfirmasi"
            className="mt-2 text-sm text-stone-600"
          >
            {pesan}
          </p>
          <div className="mt-6 flex gap-2">
            <button
              ref={refBatal}
              type="button"
              onClick={onBatal}
              className="btn-secondary flex-1"
            >
              {t('umum.batal')}
            </button>
            <button
              type="button"
              onClick={onKonfirmasi}
              className={
                berbahaya ? 'btn-danger-outline flex-1' : 'btn-primary flex-1'
              }
            >
              {labelKonfirmasi}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
