# AGENTS.md: LarisPOS

Panduan untuk agen AI yang bekerja di repo ini.

## antislop

Project ini memakai antislop (Anti Slop: Rules for AI Coding Agents,
v3.2.30). antislop adalah filter, bukan panduan gaya: ia menghentikan
UI, teks, dan kode generik hasil AI tanpa mengatur estetika.

**Mode untuk project ini: during.** Diputuskan owner pada 2026-11-18:
terapkan aturan saat menulis kode, jangan audit belakangan. Jangan
tanya lagi soal mode di sesi baru.

Untuk pekerjaan UI, teks, aksesibilitas, layout mobile, atau komentar
kode, muat skill yang cocok SEBELUM mulai. Setiap skill adalah folder
di `.agents/skills/` (baca `SKILL.md` di dalamnya):

- Filter inti, selalu aktif: `.agents/skills/antislop/SKILL.md`
- UI / visual: `.agents/skills/antislop-ui/SKILL.md`
- Teks: `.agents/skills/antislop-copywriting/SKILL.md`
- Aksesibilitas: `.agents/skills/antislop-human/SKILL.md`
- Layout mobile: `.agents/skills/antislop-layoutmobile/SKILL.md`
- Komentar kode: `.agents/skills/antislop-code/SKILL.md`

Arah desain ada di `DESIGN.md`. Baca file itu dulu untuk pekerjaan UI,
lalu terapkan antislop sebagai filter di atasnya. Jalankan Delivery
Gate antislop sebelum push: laporan PASS/FAIL wajib menyertai hasil
kerja, dan hasil dengan satu FAIL tidak boleh di-push.

## Project

- Stack: Vite + React + TypeScript + Tailwind v4, Supabase sebagai
  backend (PostgreSQL + Auth + RLS), deploy di Vercel.
- Perintah: `npm run dev` untuk pengembangan, `npm run build` untuk
  verifikasi sebelum push. Build harus lolos.
- UI berbahasa Indonesia, mobile-first (pengguna warung memakai HP).
- Checkout SELALU lewat RPC `buat_transaksi()` di database. Harga dan
  total dihitung ulang di database, tidak pernah dipercaya dari browser.
- Jangan pernah memasukkan `service_role` key, `.env`, atau kredensial
  apa pun ke repo. Kunci anon Supabase boleh ada di frontend (RLS yang
  melindungi).
- Tabel Pro (pelanggan, piutang, pembayaran_hutang) TIDAK BOLEH ada di
  repo publik ini. Modul Pro hidup di repo privat terpisah.
- Commit atas nama owner, tanpa atribusi asisten AI.
