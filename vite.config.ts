import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Satu chunk vendor untuk semua dependensi: berubah hanya saat
        // dependensi naik versi, jadi browser bisa memakai cache-nya di
        // banyak deploy. Kode aplikasi dan halaman tetap terpisah.
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: (id) => id.includes('node_modules'),
            },
          ],
        },
      },
    },
  },
})
