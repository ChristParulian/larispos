export default {
  keranjangKosong: 'The cart is empty.',
  qtyPositif: 'Quantity must be greater than 0 for all items.',
  qtyPositifDemo: 'Quantity must be greater than 0.',
  produkTidakDitemukan: 'Product not found.',
  produkTidakDitemukanId: 'Product not found: {{id}}',
  stokTidakCukup:
    'Not enough stock for "{{nama}}" ({{sisa}} left, {{diminta}} requested).',
  uangKurang:
    'Amount paid (Rp{{dibayar}}) is less than the total (Rp{{total}}).',
  transaksiTidakDitemukan: 'Transaction not found.',
  transaksiSudahBatal: 'This transaction was already cancelled.',
  transaksiBatalTidakBisaDiubah:
    'A cancelled transaction cannot be edited.',
  bonHanyaPro: 'Bon transactions can only be edited in the Pro version.',
  ubah24Jam: 'Transactions can only be edited within 24 hours of the sale.',
  pembayaranBonHanyaPro: 'Bon payments are only available in the Pro version.',
  bonWajibPelanggan: 'Bon payments require a customer.',
  pelangganTidakDitemukan: 'Customer not found: {{id}}',
  pelangganHanyaBon: 'Customers are only used for Bon payments.',
  metodeTidakDikenal: 'Unknown payment method: {{metode}}',
  metodeTidakDiCore:
    'Payment method "{{metode}}" is not available in the core (Bon is only in the Pro module).',
  bayarMelebihiHutang:
    'Payment of Rp{{bayar}} exceeds the remaining debt of Rp{{sisa}}.',
  hutangTidakBisaDiubah:
    'Debt payments cannot be edited directly; delete and record it again.',
  piutangTidakDitemukan: 'Receivable not found: {{id}}',
  hanyaOwnerUbahPeran: 'Only the owner can change user roles.',
  ownerTerakhir: 'The last owner cannot be changed to cashier.',
  hanyaOwnerHargaBeli: 'Only the owner can set the purchase price.',
  hanyaOwnerUbahHargaBeli: 'Only the owner can change the purchase price.',
  jumlahStokMinimal: 'Stock amount must be at least 1.',
  sudahAda: '{{label}} "{{nama}}" already exists.',
  namaKategoriKosong: 'Category name cannot be empty.',
  namaSatuanKosong: 'Unit name cannot be empty.',
  kategoriTidakDitemukan: 'Category not found.',
  satuanTidakDitemukan: 'Unit not found.',
  produkPernahTerjual:
    'A product that has been sold cannot be deleted (to keep the transaction history).',
  emailSalah: 'Incorrect email or password.',
  emailBelumKonfirmasi:
    'Email not confirmed yet. Check your inbox and click the confirmation link.',
  emailTerdaftar: 'This email is already registered. Please sign in.',
  sandiMin6: 'Password must be at least 6 characters.',
  emailTidakValid: 'Invalid email format.',
  terlaluBanyak: 'Too many attempts. Wait a moment and try again.',
  tidakTerhubung: 'Cannot reach the server. Check your connection.',
  supabaseBelumSiap: 'Supabase is not configured.',
  emailDipakai: 'This email is already used by another account.',
  sandiBaruMin8: 'The new password must be at least 8 characters.',
  sandiLamaSalah: 'The current password is incorrect.',
}
