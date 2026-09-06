/* =========================================================
   api.js — Koneksi ke backend Google Apps Script
   ---------------------------------------------------------
   ⚠️ JANGAN LUPA: ganti API_URL di bawah jika URL deployment
      Apps Script Anda berubah (saat ini sudah diisi URL Anda).
   ---------------------------------------------------------
   Cara kerja:
   - Semua permintaan dikirim sebagai POST JSON:
       { "action": "getTransaksi" | "getBudget" | "getDompet"
                  | "tambahTransaksi" | "editTransaksi" | "hapusTransaksi"
                  | "setBudget" | "tambahDompet" | "editDompet" | "hapusDompet",
         "data": {...}, "rowIndex": ... }
   - Backend (file apps-script/Code.gs) membaca action tsb lalu
     membaca/menulis Google Sheets, kemudian membalas JSON:
       { "status": "success", "data": [...] }
     atau bila gagal:
       { "status": "error", "message": "..." }
   ========================================================= */
'use strict';

const API_URL = 'https://script.google.com/macros/s/AKfycbzZzwSjekH2P6sPcBPVn4usxozf2CgiCnHaXbNVMbC3jIRVUYkebcgr3JFEZC6k8d8/exec';

/** Kirim satu permintaan POST JSON ke Apps Script. */
async function kirimKeApi(payload) {
  let respon;
  try {
    respon = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
  } catch (e) {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda, lalu coba lagi.');
  }

  const teks = await respon.text();
  let json = null;
  try { json = JSON.parse(teks); } catch (e) { /* bukan JSON */ }

  if (!json) {
    // Respons bukan JSON (mis. halaman error Google)
    throw new Error('Respons server tidak valid. Pastikan Apps Script sudah di-deploy dengan benar (lihat README).');
  }
  if (json.status === 'error') {
    throw new Error(json.message || 'Terjadi kesalahan di server.');
  }
  return json;
}

/** Ambil SEMUA transaksi dari sheet Transaksi.
 *  @returns Promise<Array> berisi objek:
 *   { rowIndex, tanggal:"YYYY-MM-DD", kategori, deskripsi, nominal,
 *     tipe:"Pemasukan|Pengeluaran|Transfer", dompet, dompetTujuan } */
async function getTransaksi() {
  const hasil = await kirimKeApi({ action: 'getTransaksi' });
  return normalisasiDaftar(hasil);
}

/** Ambil SEMUA budget dari sheet Budget.
 *  @returns Promise<Array> berisi objek:
 *   { rowIndex, bulan:"YYYY-MM", kategori, anggaran } */
async function getBudget() {
  const hasil = await kirimKeApi({ action: 'getBudget' });
  return normalisasiDaftar(hasil);
}

/** Terima baik respons { data: [...] } maupun array langsung. */
function normalisasiDaftar(hasil) {
  if (Array.isArray(hasil)) return hasil;
  if (hasil && Array.isArray(hasil.data)) return hasil.data;
  return [];
}

/** Tambah transaksi baru.
 *  @param data { tanggal, kategori, deskripsi, nominal, tipe } */
async function tambahTransaksi(data) {
  const hasil = await kirimKeApi({ action: 'tambahTransaksi', data: data });
  return hasil; // { status, rowIndex? }
}

/** Ubah transaksi berdasarkan nomor baris di Google Sheets.
 *  @param data { rowIndex, tanggal, kategori, deskripsi, nominal, tipe } */
async function editTransaksi(data) {
  return kirimKeApi({ action: 'editTransaksi', data: data });
}

/** Hapus satu baris transaksi di Google Sheets.
 *  @param rowIndex nomor baris asli di spreadsheet */
async function hapusTransaksi(rowIndex) {
  return kirimKeApi({ action: 'hapusTransaksi', rowIndex: rowIndex });
}

/** Simpan (tambah/ubah) budget satu kategori untuk satu bulan.
 *  @param data { bulan:"YYYY-MM", kategori, anggaran } */
async function setBudget(data) {
  return kirimKeApi({ action: 'setBudget', data: data });
}

/* ---------------- Dompet / rekening ---------------- */

/** Ambil SEMUA dompet dari sheet Dompet.
 *  @returns Promise<Array> berisi objek: { rowIndex, nama, saldoAwal } */
async function getDompet() {
  const hasil = await kirimKeApi({ action: 'getDompet' });
  return normalisasiDaftar(hasil);
}

/** Tambah dompet baru. @param data { nama, saldoAwal } */
async function tambahDompet(data) {
  return kirimKeApi({ action: 'tambahDompet', data: data });
}

/** Ubah nama/saldo awal dompet (referensi transaksi ikut diperbarui).
 *  @param data { rowIndex, nama, saldoAwal } */
async function editDompet(data) {
  return kirimKeApi({ action: 'editDompet', data: data });
}

/** Hapus dompet (ditolak bila masih dipakai transaksi). */
async function hapusDompet(rowIndex) {
  return kirimKeApi({ action: 'hapusDompet', rowIndex: rowIndex });
}
