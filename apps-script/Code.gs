/********************************************************************
 *  CATATAN KEUANGAN — Backend Google Apps Script
 *  ----------------------------------------------------------------
 *  CARA PASANG:
 *  1. Buka Google Sheet Anda (yang berisi sheet "Transaksi", "Budget")
 *  2. Menu: Ekstensi (Extensions) → Apps Script
 *  3. Hapus semua kode lama di editor, tempel seluruh isi file ini
 *  4. Klik tombol Simpan (💾)
 *  5. Buka Deploy → Manage deployments → ✏️ Edit → Version: New version
 *     → Deploy (biar URL /exec tetap sama)
 *     atau Deploy → New deployment → Web app
 *     (Execute as: Me | Who has access: Anyone)
 *  6. Pastikan URL /exec di js/api.js cocok dengan deployment aktif.
 *
 *  SHEET (dibuat/dirapikan otomatis oleh fungsi pastikanStruktur):
 *  - "Transaksi" kolom:
 *      A=Tanggal(YYYY-MM-DD) B=Kategori C=Deskripsi D=Nominal
 *      E=Tipe(Pemasukan/Pengeluaran/Transfer) F=Dompet G=Dompet Tujuan
 *  - "Budget" kolom: A=Bulan(YYYY-MM) B=Kategori C=Anggaran
 *  - "Dompet" kolom: A=Nama B=Saldo Awal  (baris 2 dst = daftar dompet)
 ********************************************************************/

var NAMA_SHEET_TRANSAKSI = 'Transaksi';
var NAMA_SHEET_BUDGET = 'Budget';
var NAMA_SHEET_DOMPET = 'Dompet';
var JUMLAH_KOLOM_TRANSAKSI = 7;
var JUMLAH_KOLOM_BUDGET = 3;
var JUMLAH_KOLOM_DOMPET = 2;
var HEADER_TRANSAKSI = ['Tanggal', 'Kategori', 'Deskripsi', 'Nominal', 'Tipe', 'Dompet', 'Dompet Tujuan'];
var HEADER_BUDGET = ['Bulan', 'Kategori', 'Anggaran'];
var HEADER_DOMPET = ['Nama', 'Saldo Awal'];
var DOMPET_BAWAAN = 'Tunai';

/* ---------------- Titik masuk web app ---------------- */

/** Dibuka via GET di browser → cek API hidup. */
function doGet() {
  return ContentService.createTextOutput('Catatan Keuangan API aktif. Kirim permintaan dengan metode POST.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/** Semua permintaan dari website masuk ke sini (POST JSON). */
function doPost(e) {
  try {
    var payload = bacaPayload(e);
    var action = payload.action || '';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    pastikanStruktur(ss);

    var hasil;
    if (action === 'getTransaksi') {
      hasil = { status: 'success', data: bacaSemuaTransaksi(ss) };
    } else if (action === 'getBudget') {
      hasil = { status: 'success', data: bacaSemuaBudget(ss) };
    } else if (action === 'getDompet') {
      hasil = { status: 'success', data: bacaSemuaDompet(ss) };
    } else if (action === 'tambahTransaksi') {
      hasil = tambahTransaksi(ss, payload.data);
    } else if (action === 'editTransaksi') {
      hasil = editTransaksi(ss, payload.data);
    } else if (action === 'hapusTransaksi') {
      hasil = hapusTransaksi(ss, Number(payload.rowIndex));
    } else if (action === 'setBudget') {
      hasil = setBudget(ss, payload.data);
    } else if (action === 'tambahDompet') {
      hasil = tambahDompet(ss, payload.data);
    } else if (action === 'editDompet') {
      hasil = editDompet(ss, payload.data);
    } else if (action === 'hapusDompet') {
      hasil = hapusDompet(ss, Number(payload.rowIndex));
    } else {
      hasil = { status: 'error', message: 'Action tidak dikenal: ' + action };
    }
    return kirimJSON(hasil);
  } catch (err) {
    return kirimJSON({ status: 'error', message: 'Terjadi kesalahan: ' + err });
  }
}

/* ---------------- Bantuan umum ---------------- */

function bacaPayload(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (err) {
      return e.parameter || {};
    }
  }
  return (e && e.parameter) || {};
}

function kirimJSON(objek) {
  return ContentService
    .createTextOutput(JSON.stringify(objek))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Angka dari berbagai bentuk (angka, teks "1.500.000", "1,5", dll). */
function angka(x) {
  if (typeof x === 'number') return x;
  if (x === null || x === undefined || x === '') return 0;
  var bersih = String(x).replace(/\./g, '').replace(',', '.');
  var n = parseFloat(bersih);
  return isNaN(n) ? 0 : n;
}

/** Normalisasi nilai tanggal menjadi teks YYYY-MM-DD. */
function teksTanggal(x) {
  if (x instanceof Date) {
    return Utilities.formatDate(x, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(x || '').slice(0, 10);
}

function bersih(x) {
  return String(x === null || x === undefined ? '' : x).trim();
}

/* ---------------- Struktur sheet ---------------- */

/** Buat/rapikan sheet + header + migrasi data lama (aman diulang). */
function pastikanStruktur(ss) {
  // --- Sheet Transaksi ---
  var shTrx = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
  if (!shTrx) shTrx = ss.insertSheet(NAMA_SHEET_TRANSAKSI);
  if (shTrx.getLastRow() === 0) {
    shTrx.getRange(1, 1, 1, JUMLAH_KOLOM_TRANSAKSI).setValues([HEADER_TRANSAKSI]);
    shTrx.setFrozenRows(1);
  }
  // Header kolom tambahan Dompet & Dompet Tujuan (kalau belum ada)
  if (bersih(shTrx.getRange(1, 6).getValue()) === '') shTrx.getRange(1, 6).setValue('Dompet');
  if (bersih(shTrx.getRange(1, 7).getValue()) === '') shTrx.getRange(1, 7).setValue('Dompet Tujuan');

  // Rapikan label header bila tertukar (data tetap terbaca berdasarkan posisi):
  // kasus: D tertulis "Tipe" padahal isinya Nominal, dan E kosong padahal isinya Tipe.
  var headerD = bersih(shTrx.getRange(1, 4).getValue());
  var headerE = bersih(shTrx.getRange(1, 5).getValue());
  if (headerD.toUpperCase() === 'TIPE' && headerE === '') {
    shTrx.getRange(1, 4).setValue('Nominal');
    shTrx.getRange(1, 5).setValue('Tipe');
  }

  // --- Sheet Budget ---
  var shBg = ss.getSheetByName(NAMA_SHEET_BUDGET);
  if (!shBg) shBg = ss.insertSheet(NAMA_SHEET_BUDGET);
  if (shBg.getLastRow() === 0) {
    shBg.getRange(1, 1, 1, JUMLAH_KOLOM_BUDGET).setValues([HEADER_BUDGET]);
    shBg.setFrozenRows(1);
  }

  // --- Sheet Dompet ---
  var shDp = ss.getSheetByName(NAMA_SHEET_DOMPET);
  if (!shDp) shDp = ss.insertSheet(NAMA_SHEET_DOMPET);
  if (shDp.getLastRow() === 0) {
    shDp.getRange(1, 1, 1, JUMLAH_KOLOM_DOMPET).setValues([HEADER_DOMPET]);
    shDp.setFrozenRows(1);
  }
  // Seed dompet bawaan kalau daftar masih kosong
  var dompetPertama = namaDompetPertama(shDp);
  if (shDp.getLastRow() < 2) {
    shDp.appendRow([DOMPET_BAWAAN, 0]);
    dompetPertama = DOMPET_BAWAAN;
  }

  // Migrasi transaksi lama (belum punya dompet) → dompet pertama
  if (shTrx.getLastRow() >= 2 && dompetPertama) {
    var barisData = shTrx.getLastRow() - 1;
    var tipeKolom = shTrx.getRange(2, 5, barisData, 1).getValues();
    var dompetKolom = shTrx.getRange(2, 6, barisData, 1).getValues();
    for (var i = 0; i < barisData; i++) {
      var tipe = bersih(tipeKolom[i][0]);
      if (bersih(dompetKolom[i][0]) === '' && (tipe === 'Pemasukan' || tipe === 'Pengeluaran' || tipe === 'Transfer')) {
        shTrx.getRange(i + 2, 6).setValue(dompetPertama);
      }
    }
  }
}

function namaDompetPertama(shDp) {
  if (shDp.getLastRow() < 2) return '';
  var nilai = shDp.getRange(2, 1, shDp.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < nilai.length; i++) {
    var nama = bersih(nilai[i][0]);
    if (nama) return nama;
  }
  return '';
}

/** Daftar nama dompet yang valid (dari sheet Dompet). */
function daftarNamaDompet(ss) {
  var daftar = [];
  var sh = ss.getSheetByName(NAMA_SHEET_DOMPET);
  if (!sh || sh.getLastRow() < 2) return daftar;
  var nilai = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < nilai.length; i++) {
    var nama = bersih(nilai[i][0]);
    if (nama) daftar.push(nama);
  }
  return daftar;
}

function dompetAda(ss, nama) {
  return daftarNamaDompet(ss).indexOf(nama) !== -1;
}

/* ---------------- Validasi ---------------- */

function validasiTransaksi(t) {
  if (!t) return 'Data transaksi kosong.';
  if (!t.tanggal) return 'Tanggal wajib diisi.';
  if (!(angka(t.nominal) > 0)) return 'Nominal harus lebih dari 0.';

  var tipe = bersih(t.tipe);
  var dompet = bersih(t.dompet);
  var dompetTujuan = bersih(t.dompetTujuan);

  if (tipe === 'Transfer') {
    if (!dompet) return 'Dompet asal wajib dipilih.';
    if (!dompetTujuan) return 'Dompet tujuan wajib dipilih.';
    if (dompet === dompetTujuan) return 'Dompet asal dan tujuan tidak boleh sama.';
  } else if (tipe === 'Pemasukan' || tipe === 'Pengeluaran') {
    if (!t.kategori || bersih(t.kategori) === '') return 'Kategori wajib diisi.';
    if (!dompet) return 'Dompet wajib dipilih.';
  } else {
    return 'Tipe harus Pemasukan, Pengeluaran, atau Transfer.';
  }
  return null;
}

function validasiNamaDompetBaru(ss, nama, kecualiBaris) {
  var sh = ss.getSheetByName(NAMA_SHEET_DOMPET);
  var nilai = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < nilai.length; i++) {
    var baris = i + 2;
    if (kecualiBaris && baris === kecualiBaris) continue;
    if (bersih(nilai[i][0]) === nama) return true; // duplikat
  }
  return false;
}

/* ---------------- Baca data ---------------- */

function bacaSemuaTransaksi(ss) {
  var sh = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
  var barisAkhir = sh.getLastRow();
  if (barisAkhir < 2) return [];

  var nilai = sh.getRange(2, 1, barisAkhir - 1, JUMLAH_KOLOM_TRANSAKSI).getValues();
  var hasil = [];
  for (var i = 0; i < nilai.length; i++) {
    var r = nilai[i];
    var tanggal = teksTanggal(r[0]);
    var kategori = bersih(r[1]);
    if (!tanggal || !kategori) continue; // lewati baris kosong
    hasil.push({
      rowIndex: i + 2,              // nomor baris asli di spreadsheet
      tanggal: tanggal,
      kategori: kategori,
      deskripsi: String(r[2] || ''),
      nominal: angka(r[3]),
      tipe: bersih(r[4]) || 'Pengeluaran',
      dompet: bersih(r[5]),
      dompetTujuan: bersih(r[6])
    });
  }
  return hasil;
}

function bacaSemuaBudget(ss) {
  var sh = ss.getSheetByName(NAMA_SHEET_BUDGET);
  var barisAkhir = sh.getLastRow();
  if (barisAkhir < 2) return [];

  var nilai = sh.getRange(2, 1, barisAkhir - 1, JUMLAH_KOLOM_BUDGET).getValues();
  var hasil = [];
  for (var i = 0; i < nilai.length; i++) {
    var r = nilai[i];
    var bulan = bersih(r[0]);
    var kategori = bersih(r[1]);
    if (!/^\d{4}-\d{2}$/.test(bulan) || !kategori) continue;
    hasil.push({
      rowIndex: i + 2,
      bulan: bulan,
      kategori: kategori,
      anggaran: angka(r[2])
    });
  }
  return hasil;
}

function bacaSemuaDompet(ss) {
  var sh = ss.getSheetByName(NAMA_SHEET_DOMPET);
  var barisAkhir = sh.getLastRow();
  if (barisAkhir < 2) return [];

  var nilai = sh.getRange(2, 1, barisAkhir - 1, JUMLAH_KOLOM_DOMPET).getValues();
  var hasil = [];
  for (var i = 0; i < nilai.length; i++) {
    var nama = bersih(nilai[i][0]);
    if (!nama) continue;
    hasil.push({
      rowIndex: i + 2,
      nama: nama,
      saldoAwal: angka(nilai[i][1])
    });
  }
  return hasil;
}

/* ---------------- Tulis transaksi ---------------- */

function tambahTransaksi(ss, data) {
  var pesan = validasiTransaksi(data);
  if (pesan) return { status: 'error', message: pesan };

  var sh = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
  var barisBaru = sh.getLastRow() + 1;
  var tipe = bersih(data.tipe);
  var dompet = bersih(data.dompet);
  var dompetTujuan = tipe === 'Transfer' ? bersih(data.dompetTujuan) : '';

  if (!dompetAda(ss, dompet) || (dompetTujuan && !dompetAda(ss, dompetTujuan))) {
    return { status: 'error', message: 'Dompet tidak ditemukan. Muat ulang halaman lalu coba lagi.' };
  }

  var kategori = tipe === 'Transfer' ? 'Transfer' : bersih(data.kategori);
  sh.getRange(barisBaru, 1, 1, JUMLAH_KOLOM_TRANSAKSI).setValues([[
    String(data.tanggal), kategori, String(data.deskripsi || '').trim(),
    angka(data.nominal), tipe, dompet, dompetTujuan
  ]]);
  sh.getRange(barisBaru, 1).setNumberFormat('@'); // kolom tanggal = teks
  return { status: 'success', rowIndex: barisBaru };
}

function editTransaksi(ss, data) {
  var pesan = validasiTransaksi(data);
  if (pesan) return { status: 'error', message: pesan };

  var rowIndex = Number(data.rowIndex);
  var sh = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
  if (!rowIndex || rowIndex < 2 || rowIndex > sh.getLastRow()) {
    return { status: 'error', message: 'Nomor baris transaksi tidak valid.' };
  }

  var tipe = bersih(data.tipe);
  var dompet = bersih(data.dompet);
  var dompetTujuan = tipe === 'Transfer' ? bersih(data.dompetTujuan) : '';
  if (!dompetAda(ss, dompet) || (dompetTujuan && !dompetAda(ss, dompetTujuan))) {
    return { status: 'error', message: 'Dompet tidak ditemukan. Muat ulang halaman lalu coba lagi.' };
  }

  var kategori = tipe === 'Transfer' ? 'Transfer' : bersih(data.kategori);
  sh.getRange(rowIndex, 1, 1, JUMLAH_KOLOM_TRANSAKSI).setValues([[
    String(data.tanggal), kategori, String(data.deskripsi || '').trim(),
    angka(data.nominal), tipe, dompet, dompetTujuan
  ]]);
  sh.getRange(rowIndex, 1).setNumberFormat('@');
  return { status: 'success', rowIndex: rowIndex };
}

function hapusTransaksi(ss, rowIndex) {
  var sh = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
  if (!rowIndex || rowIndex < 2 || rowIndex > sh.getLastRow()) {
    return { status: 'error', message: 'Nomor baris transaksi tidak valid.' };
  }
  sh.deleteRow(rowIndex);
  return { status: 'success' };
}

/* ---------------- Budget ---------------- */

function setBudget(ss, data) {
  if (!data || !data.kategori || bersih(data.kategori) === '') {
    return { status: 'error', message: 'Kategori budget wajib diisi.' };
  }
  var bulan = bersih(data.bulan);
  if (!/^\d{4}-\d{2}$/.test(bulan)) {
    return { status: 'error', message: 'Bulan harus format YYYY-MM (contoh: 2025-01).' };
  }
  var nominal = angka(data.anggaran);
  if (nominal < 0) return { status: 'error', message: 'Anggaran tidak boleh negatif.' };

  var sh = ss.getSheetByName(NAMA_SHEET_BUDGET);
  var kategori = bersih(data.kategori);

  var daftar = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), JUMLAH_KOLOM_BUDGET).getValues();
  for (var i = 0; i < daftar.length; i++) {
    if (bersih(daftar[i][0]) === bulan && bersih(daftar[i][1]) === kategori) {
      var rowIndex = i + 2;
      sh.getRange(rowIndex, 3).setValue(nominal);
      return { status: 'success', rowIndex: rowIndex };
    }
  }

  var barisBaru = sh.getLastRow() + 1;
  sh.getRange(barisBaru, 1, 1, JUMLAH_KOLOM_BUDGET).setValues([[bulan, kategori, nominal]]);
  sh.getRange(barisBaru, 1).setNumberFormat('@'); // kolom bulan = teks
  return { status: 'success', rowIndex: barisBaru };
}

/* ---------------- Dompet ---------------- */

function tambahDompet(ss, data) {
  var nama = bersih(data && data.nama);
  if (!nama) return { status: 'error', message: 'Nama dompet wajib diisi.' };
  if (nama.length > 30) return { status: 'error', message: 'Nama dompet maksimal 30 karakter.' };
  if (validasiNamaDompetBaru(ss, nama)) {
    return { status: 'error', message: 'Dompet "' + nama + '" sudah ada.' };
  }

  var saldoAwal = Math.max(0, angka(data && data.saldoAwal));
  var sh = ss.getSheetByName(NAMA_SHEET_DOMPET);
  var barisBaru = sh.getLastRow() + 1;
  sh.getRange(barisBaru, 1, 1, JUMLAH_KOLOM_DOMPET).setValues([[nama, saldoAwal]]);
  return { status: 'success', rowIndex: barisBaru };
}

function editDompet(ss, data) {
  var rowIndex = Number(data && data.rowIndex);
  var nama = bersih(data && data.nama);
  if (!rowIndex || rowIndex < 2) return { status: 'error', message: 'Nomor baris dompet tidak valid.' };
  if (!nama) return { status: 'error', message: 'Nama dompet wajib diisi.' };
  if (nama.length > 30) return { status: 'error', message: 'Nama dompet maksimal 30 karakter.' };
  if (validasiNamaDompetBaru(ss, nama, rowIndex)) {
    return { status: 'error', message: 'Dompet "' + nama + '" sudah ada.' };
  }

  var shDp = ss.getSheetByName(NAMA_SHEET_DOMPET);
  var namaLama = bersih(shDp.getRange(rowIndex, 1).getValue());
  var saldoAwal = Math.max(0, angka(data.saldoAwal));
  shDp.getRange(rowIndex, 1, 1, JUMLAH_KOLOM_DOMPET).setValues([[nama, saldoAwal]]);

  // Kalau namanya berubah, ikutkan ke semua transaksi lama
  if (namaLama && namaLama !== nama) {
    var shTrx = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
    if (shTrx.getLastRow() >= 2) {
      var jml = shTrx.getLastRow() - 1;
      var nilai = shTrx.getRange(2, 6, jml, 2).getValues(); // kolom F & G
      for (var i = 0; i < nilai.length; i++) {
        if (bersih(nilai[i][0]) === namaLama) shTrx.getRange(i + 2, 6).setValue(nama);
        if (bersih(nilai[i][1]) === namaLama) shTrx.getRange(i + 2, 7).setValue(nama);
      }
    }
  }
  return { status: 'success', rowIndex: rowIndex };
}

function hapusDompet(ss, rowIndex) {
  var shDp = ss.getSheetByName(NAMA_SHEET_DOMPET);
  if (!rowIndex || rowIndex < 2 || rowIndex > shDp.getLastRow()) {
    return { status: 'error', message: 'Nomor baris dompet tidak valid.' };
  }
  var nama = bersih(shDp.getRange(rowIndex, 1).getValue());

  // Cek apakah dompet masih dipakai transaksi
  var shTrx = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
  if (shTrx.getLastRow() >= 2) {
    var jml = shTrx.getLastRow() - 1;
    var nilai = shTrx.getRange(2, 6, jml, 2).getValues();
    var dipakai = 0;
    for (var i = 0; i < nilai.length; i++) {
      if (bersih(nilai[i][0]) === nama || bersih(nilai[i][1]) === nama) dipakai++;
    }
    if (dipakai > 0) {
      return { status: 'error', message: 'Dompet "' + nama + '" masih dipakai ' + dipakai +
        ' transaksi. Pindahkan/hapus transaksinya dulu, atau ubah dompet transaksi via Edit di halaman Data.' };
    }
  }
  shDp.deleteRow(rowIndex);
  return { status: 'success' };
}
