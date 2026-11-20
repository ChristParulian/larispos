export default {
  // Pesan dari database (dan mode demo, yang memakai pesan yang sama).
  // Nilai Indonesia harus sama persis dengan pesan aslinya.
  keranjangKosong: 'Keranjang kosong.',
  qtyPositif: 'Jumlah (qty) harus lebih dari 0 untuk semua item.',
  qtyPositifDemo: 'Jumlah (qty) harus lebih dari 0.',
  produkTidakDitemukan: 'Produk tidak ditemukan.',
  produkTidakDitemukanId: 'Produk tidak ditemukan: {{id}}',
  stokTidakCukup:
    'Stok "{{nama}}" tidak cukup (sisa {{sisa}}, diminta {{diminta}}).',
  uangKurang: 'Uang dibayar (Rp{{dibayar}}) kurang dari total (Rp{{total}}).',
  transaksiTidakDitemukan: 'Transaksi tidak ditemukan.',
  transaksiSudahBatal: 'Transaksi ini sudah dibatalkan.',
  transaksiBatalTidakBisaDiubah:
    'Transaksi yang sudah dibatalkan tidak bisa diubah.',
  bonHanyaPro: 'Transaksi Bon hanya bisa diubah di versi Pro.',
  ubah24Jam: 'Transaksi hanya bisa diubah dalam 24 jam setelah dibuat.',
  pembayaranBonHanyaPro: 'Pembayaran Bon hanya tersedia di versi Pro.',
  bonWajibPelanggan: 'Pembayaran Bon wajib memilih pelanggan.',
  pelangganTidakDitemukan: 'Pelanggan tidak ditemukan: {{id}}',
  pelangganHanyaBon: 'Pelanggan hanya dipakai untuk pembayaran Bon.',
  metodeTidakDikenal: 'Metode bayar tidak dikenal: {{metode}}',
  metodeTidakDiCore:
    'Metode bayar "{{metode}}" tidak tersedia di core (Bon hanya di modul Pro).',
  bayarMelebihiHutang:
    'Pembayaran Rp{{bayar}} melebihi sisa hutang Rp{{sisa}}.',
  hutangTidakBisaDiubah:
    'Pembayaran hutang tidak boleh diubah langsung; hapus lalu catat ulang.',
  piutangTidakDitemukan: 'Piutang tidak ditemukan: {{id}}',
  hanyaOwnerUbahPeran: 'Hanya owner yang boleh mengubah peran pengguna.',
  ownerTerakhir: 'Owner terakhir tidak boleh diubah menjadi kasir.',
  hanyaOwnerHargaBeli: 'Hanya owner yang boleh mengisi harga beli.',
  hanyaOwnerUbahHargaBeli: 'Hanya owner yang boleh mengubah harga beli.',
  jumlahStokMinimal: 'Jumlah stok harus minimal 1.',
  // Pesan dari kode aplikasi.
  sudahAda: '{{label}} "{{nama}}" sudah ada.',
  namaKategoriKosong: 'Nama kategori tidak boleh kosong.',
  namaSatuanKosong: 'Nama satuan tidak boleh kosong.',
  kategoriTidakDitemukan: 'Kategori tidak ditemukan.',
  satuanTidakDitemukan: 'Satuan tidak ditemukan.',
  produkPernahTerjual:
    'Produk yang pernah terjual tidak bisa dihapus (menjaga riwayat transaksi).',
  // Pesan login dan akun (terjemahan pesan Supabase Auth).
  emailSalah: 'Email atau kata sandi salah.',
  emailBelumKonfirmasi:
    'Email belum dikonfirmasi. Cek kotak masukmu dan klik tautan konfirmasi.',
  emailTerdaftar: 'Email ini sudah terdaftar. Silakan masuk.',
  sandiMin6: 'Kata sandi minimal 6 karakter.',
  emailTidakValid: 'Format email tidak valid.',
  terlaluBanyak: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  tidakTerhubung: 'Tidak bisa terhubung ke server. Periksa koneksimu.',
  supabaseBelumSiap: 'Supabase belum dikonfigurasi.',
  emailDipakai: 'Email ini sudah dipakai akun lain.',
  harusMasuk: 'Harus masuk dulu.',
  hanyaOwnerUbahEmail: 'Hanya owner yang boleh mengubah email pengguna lain.',
  hanyaOwnerAturSandi:
    'Hanya owner yang boleh mengatur kata sandi pengguna lain.',
  ubahEmailSendiriProfil: 'Ubah email sendiri dari halaman Profil Saya.',
  ubahSandiSendiriProfil: 'Ubah kata sandi sendiri dari halaman Profil Saya.',
  penggunaTidakDitemukan: 'Pengguna tidak ditemukan.',
  sandiBaruMin8: 'Kata sandi baru minimal 8 karakter.',
  sandiLamaSalah: 'Kata sandi saat ini salah.',
}
