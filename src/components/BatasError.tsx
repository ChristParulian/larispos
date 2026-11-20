// Batas error (error boundary): menangkap error render di bawahnya supaya
// aplikasi tidak jadi layar putih. React hanya menyediakan error boundary
// sebagai komponen kelas, jadi bagian dalamnya memang ditulis sebagai kelas.
//
// Dipakai dua tingkat: di App (menangkap error dari Layout sendiri) dan di
// Layout (menangkap error halaman, supaya header dan menu bawah tetap ada).
// Pindah rute otomatis mereset batasnya, jadi halaman yang sempat error bisa
// dibuka lagi setelah pengguna pindah halaman. React sendiri sudah mencatat
// error yang ditangkap ke console browser, jadi tidak ada logging tambahan.
import { Component, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface PropertiDalam {
  children: ReactNode
  /** Nilai yang bila berubah, mereset batasnya (dipakai: pathname rute). */
  resetKeys?: unknown[]
}

interface StateBatas {
  galat: Error | null
}

class BatasErrorDalam extends Component<PropertiDalam, StateBatas> {
  state: StateBatas = { galat: null }

  static getDerivedStateFromError(galat: Error): StateBatas {
    return { galat }
  }

  componentDidUpdate(prevProps: PropertiDalam): void {
    if (this.state.galat === null) return
    const sebelum = prevProps.resetKeys ?? []
    const sesudah = this.props.resetKeys ?? []
    if (
      sebelum.length !== sesudah.length ||
      sebelum.some((kunci, i) => kunci !== sesudah[i])
    ) {
      this.setState({ galat: null })
    }
  }

  private ulang = (): void => {
    this.setState({ galat: null })
  }

  render(): ReactNode {
    const { galat } = this.state
    if (galat) {
      return <TampilanGalat galat={galat} onUlang={this.ulang} />
    }
    return this.props.children
  }
}

function TampilanGalat({
  galat,
  onUlang,
}: {
  galat: Error
  onUlang: () => void
}) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="judul-halaman">{t('batasError.judul')}</h1>
      <p className="mt-2 text-sm text-stone-600">{t('batasError.pesan')}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          {t('batasError.muatUlang')}
        </button>
        <Link to="/dashboard" onClick={onUlang} className="btn-secondary">
          {t('batasError.keDashboard')}
        </Link>
      </div>
      <details className="mt-6 text-left">
        <summary className="text-sm text-stone-600">
          {t('batasError.rincian')}
        </summary>
        <pre className="mt-2 rounded-lg bg-kertas-gelap p-3 text-xs whitespace-pre-wrap break-words">
          {galat.toString()}
        </pre>
      </details>
    </div>
  )
}

/** Batas error yang mereset sendiri saat rute berubah. */
export default function BatasError({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <BatasErrorDalam resetKeys={[pathname]}>{children}</BatasErrorDalam>
}
