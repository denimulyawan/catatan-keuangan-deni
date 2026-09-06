/********************************************************************
 *  CATATAN KEUANGAN — Backend Google Apps Script
 *  ----------------------------------------------------------------
 *  CARA PASANG:
 *  1. Buka Google Sheet Anda (yang berisi sheet "Transaksi" & "Budget")
 *  2. Menu: Ekstensi (Extensions) → Apps Script
 *  3. Hapus semua kode lama di editor, tempel seluruh isi file ini
 *  4. Klik tombol Simpan (💾)
 *  5. Klik Deploy → New deployment → pilih jenis "Web app"
 *     - Description: terserah (mis. "Catatan Keuangan v1")
 *     - Execute as: Me (akun Anda)
 *     - Who has access: Anyone
 *  6. Klik Deploy, lalu izinkan akses ke spreadsheet Anda.
 *  7. Salin URL /exec yang muncul → pastikan SAMA dengan API_URL
 *     di file js/api.js proyek website Anda.
 *
 *  Sheet yang dibutuhkan (dibuat otomatis bila belum ada):
 *  - "Transaksi" kolom: A=Tanggal(YYYY-MM-DD) B=Kategori
 *                       C=Deskripsi D=Nominal E=Tipe(Pemasukan/Pengeluaran)
 *  - "Budget" kolom:    A=Bulan(YYYY-MM) B=Kategori C=Anggaran
 ********************************************************************/

var NAMA_SHEET_TRANSAKSI = 'Transaksi';
var NAMA_SHEET_BUDGET = 'Budget';
var JUMLAH_KOLOM_TRANSAKSI = 5;
var JUMLAH_KOLOM_BUDGET = 3;
var HEADER_TRANSAKSI = ['Tanggal', 'Kategori', 'Deskripsi', 'Nominal', 'Tipe'];
var HEADER_BUDGET = ['Bulan', 'Kategori', 'Anggaran'];

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
    } else if (action === 'tambahTransaksi') {
      hasil = tambahTransaksi(ss, payload.data);
    } else if (action === 'editTransaksi') {
      hasil = editTransaksi(ss, payload.data);
    } else if (action === 'hapusTransaksi') {
      hasil = hapusTransaksi(ss, Number(payload.rowIndex));
    } else if (action === 'setBudget') {
      hasil = setBudget(ss, payload.data);
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

/** Buat sheet + header bila belum ada (aman dijalankan berulang kali). */
function pastikanStruktur(ss) {
  var shTrx = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
  if (!shTrx) shTrx = ss.insertSheet(NAMA_SHEET_TRANSAKSI);
  if (shTrx.getLastRow() === 0) {
    shTrx.getRange(1, 1, 1, JUMLAH_KOLOM_TRANSAKSI).setValues([HEADER_TRANSAKSI]);
    shTrx.setFrozenRows(1);
  }

  var shBg = ss.getSheetByName(NAMA_SHEET_BUDGET);
  if (!shBg) shBg = ss.insertSheet(NAMA_SHEET_BUDGET);
  if (shBg.getLastRow() === 0) {
    shBg.getRange(1, 1, 1, JUMLAH_KOLOM_BUDGET).setValues([HEADER_BUDGET]);
    shBg.setFrozenRows(1);
  }
}

function validasiTransaksi(t) {
  if (!t) return 'Data transaksi kosong.';
  if (!t.tanggal) return 'Tanggal wajib diisi.';
  if (!t.kategori || String(t.kategori).trim() === '') return 'Kategori wajib diisi.';
  if (angka(t.nominal) <= 0) return 'Nominal harus lebih dari 0.';
  if (String(t.tipe) !== 'Pemasukan' && String(t.tipe) !== 'Pengeluaran') {
    return 'Tipe harus "Pemasukan" atau "Pengeluaran".';
  }
  return null;
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
    var kategori = String(r[1] || '').trim();
    if (!tanggal || !kategori) continue; // lewati baris kosong
    hasil.push({
      rowIndex: i + 2,              // nomor baris asli di spreadsheet
      tanggal: tanggal,
      kategori: kategori,
      deskripsi: String(r[2] || ''),
      nominal: angka(r[3]),
      tipe: String(r[4] || '') || 'Pengeluaran'
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
    var bulan = String(r[0] || '').trim();
    var kategori = String(r[1] || '').trim();
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

/* ---------------- Tulis transaksi ---------------- */

function tambahTransaksi(ss, data) {
  var pesan = validasiTransaksi(data);
  if (pesan) return { status: 'error', message: pesan };

  var sh = ss.getSheetByName(NAMA_SHEET_TRANSAKSI);
  var barisBaru = sh.getLastRow() + 1;

  // Tulis sebagai teks agar tanggal tidak berubah jadi format lain otomatis
  sh.getRange(barisBaru, 1, 1, JUMLAH_KOLOM_TRANSAKSI).setValues([[
    String(data.tanggal),
    String(data.kategori).trim(),
    String(data.deskripsi || '').trim(),
    angka(data.nominal),
    data.tipe
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

  sh.getRange(rowIndex, 1, 1, JUMLAH_KOLOM_TRANSAKSI).setValues([[
    String(data.tanggal),
    String(data.kategori).trim(),
    String(data.deskripsi || '').trim(),
    angka(data.nominal),
    data.tipe
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
  if (!data || !data.kategori || String(data.kategori).trim() === '') {
    return { status: 'error', message: 'Kategori budget wajib diisi.' };
  }
  var bulan = String(data.bulan || '');
  if (!/^\d{4}-\d{2}$/.test(bulan)) {
    return { status: 'error', message: 'Bulan harus format YYYY-MM (contoh: 2025-01).' };
  }
  var nominal = angka(data.anggaran);
  if (nominal < 0) return { status: 'error', message: 'Anggaran tidak boleh negatif.' };

  var sh = ss.getSheetByName(NAMA_SHEET_BUDGET);
  var kategori = String(data.kategori).trim();

  // Cari baris dengan bulan + kategori yang sama → perbarui; kalau tidak ada → tambah
  var daftar = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), JUMLAH_KOLOM_BUDGET).getValues();
  for (var i = 0; i < daftar.length; i++) {
    if (String(daftar[i][0]).trim() === bulan && String(daftar[i][1]).trim() === kategori) {
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
