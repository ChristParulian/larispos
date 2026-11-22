// Hook bersama: pengaturan toko (nama + logo) dipakai header,
// judul tab, struk, dan halaman Pengaturan Toko. Satu query
// react-query, jadi semua pemakai berbagi satu fetch. Query hanya
// jalan saat sudah login (atau mode demo), supaya tidak memanggil
// Supabase tanpa sesi.

import { useQuery } from '@tanstack/react-query'
import { fetchPengaturan } from './api'
import { useAuth } from './auth'
import { isDemoMode } from './supabase'

export function usePengaturan() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['pengaturan'],
    queryFn: fetchPengaturan,
    enabled: isDemoMode || !!user,
  })
}
