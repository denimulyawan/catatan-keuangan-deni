/* =========================================================
   app.js — Utilitas bersama semua halaman
   (dipanggil pertama di setiap halaman)
   ========================================================= */
'use strict';

/* ---------------- Kategori ---------------- */
// Kategori bawaan (TETAP / hardcode — diubah manual di sini jika perlu).
const KATEGORI_DEFAULT = {
  pemasukan: ['Gaji', 'Bonus'],
  pengeluaran: ['Makan', 'Transportasi', 'Tagihan', 'Hiburan', 'Pendidikan', 'Orang Tua']
};
const TIPE_TRANSAKSI = { PEMASUKAN: 'Pemasukan', PENGELUARAN: 'Pengeluaran' };

/* =========================================================
   🔐 LOGIN — UBAH USERNAME & PASSWORD DI SINI
   ---------------------------------------------------------
   Cari tulisan "admin" di bawah, ganti dengan username &
   password yang Anda mau, lalu push ke GitHub.
   ---------------------------------------------------------
   ⚠️ CATATAN PENTING:
   Ini proteksi RINGAN di sisi website (tanpa server). Kode
   username/password bisa dibaca siapa pun lewat "Lihat
   sumber halaman" / DevTools browser. Jadi ini cukup untuk
   menjaga orang awam, BUKAN keamanan tingkat tinggi.
   ========================================================= */
const KONFIG_LOGIN = {
  username: 'deni',        // ← ganti username Anda
  password: 'ngapainliatliat',     // ← ganti password Anda
  sesiHari: 7               // berapa hari tetap masuk sebelum minta login lagi
};

/** Daftar kategori tetap untuk satu tipe.
 *  Tipe boleh ditulis "Pemasukan"/"Pengeluaran" maupun kunci kecil,
 *  supaya tidak ada dropdown kategori yang kosong. */
function getKategori(tipe) {
  const kunci = String(tipe || '').toLowerCase() === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
  return (KATEGORI_DEFAULT[kunci] || []).slice();
}

/** Semua kategori unik (untuk filter di halaman Data). */
function daftarSemuaKategori() {
  const gabung = getKategori('pemasukan').concat(getKategori('pengeluaran'));
  const unik = [];
  gabung.forEach(function (k) { if (unik.indexOf(k) === -1) unik.push(k); });
  return unik;
}

/* ---------------- Format angka & tanggal ---------------- */
function formatRupiah(n) {
  n = Number(n) || 0;
  const tanda = n < 0 ? '-' : '';
  return tanda + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');
}

function formatAngka(n) {
  return (Number(n) || 0).toLocaleString('id-ID');
}

/** Input nominal -> ambil angka murninya (hapus pemisah titik). */
function nilaiDariInputRupiah(input) {
  const bersih = String(input.value || '').replace(/\D/g, '');
  return bersih === '' ? 0 : parseInt(bersih, 10);
}

/** Pasang format ribuan otomatis (1.500.000) pada input bertipe text. */
function siapkanInputRupiah(input) {
  input.addEventListener('input', function () {
    const angka = String(input.value || '').replace(/\D/g, '');
    input.value = angka === '' ? '' : parseInt(angka, 10).toLocaleString('id-ID');
  });
}

function tanggalHariIni() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function tanggalISOkeTanggal(s) {
  const bagian = String(s || '').split('-').map(Number);
  if (bagian.length !== 3) return null;
  const t = new Date(bagian[0], (bagian[1] || 1) - 1, bagian[2] || 1);
  return isNaN(t.getTime()) ? null : t;
}

function formatTanggal(s) {
  const t = tanggalISOkeTanggal(s);
  if (!t) return String(s || '-');
  return t.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ---------------- Utilitas bulan (kunci "YYYY-MM") ---------------- */
function bulanHariIniKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function bulanKey(kunci, geserBulan) {
  const [y, m] = String(kunci).split('-').map(Number);
  const t = new Date(y, (m || 1) - 1 + geserBulan, 1);
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0');
}

function labelBulan(kunci) {
  const t = tanggalISOkeTanggal(kunci + '-01');
  if (!t) return kunci;
  const teks = t.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  return teks.charAt(0).toUpperCase() + teks.slice(1);
}

function labelBulanPendek(kunci) {
  const t = tanggalISOkeTanggal(kunci + '-01');
  if (!t) return kunci;
  return t.toLocaleDateString('id-ID', { month: 'short' });
}

/** Kumpulan bulan dari data + bulan berjalan, urut menurun. */
function daftarBulanDariTransaksi(transaksi) {
  const set = {};
  set[bulanHariIniKey()] = true;
  transaksi.forEach(function (t) {
    const k = String(t.tanggal || '').slice(0, 7);
    if (k) set[k] = true;
  });
  return Object.keys(set).sort().reverse();
}

/* ---------------- Utilitas DOM & HTML ---------------- */
function $(selektor) { return document.querySelector(selektor); }

/** Hindari XSS saat menampilkan teks pengguna. */
function aman(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tampilkanPemuat(el) {
  el.innerHTML = '<div class="pemuat"><div class="spinner"></div><span>Memuat data…</span></div>';
}

function tampilkanKosong(el, emoji, pesan) {
  el.innerHTML = '<div class="kosong"><span class="emoji">' + (emoji || '🗒️') + '</span>' + aman(pesan) + '</div>';
}

function tampilkanError(el, pesan, tombolUlangi, fnUlangi) {
  let html = '<div class="kotak-error"><span class="emoji">⚠️</span>' + aman(pesan) + '</div>';
  if (tombolUlangi && typeof fnUlangi === 'function') {
    html = '<div class="kotak-error"><span class="emoji">⚠️</span>' + aman(pesan) +
      '<div style="margin-top:12px"><button class="btn btn-kecil btn-bahaya" id="tombol-ulang">' + aman(tombolUlangi) + '</button></div></div>';
  }
  el.innerHTML = html;
  const btn = document.getElementById('tombol-ulang');
  if (btn) btn.addEventListener('click', fnUlangi);
}

/* ---------------- Navigasi (shell bersama) ---------------- */
const MENU = [
  {
    halaman: 'dashboard', label: 'Dashboard', url: 'dashboard.html',
    ikon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>'
  },
  {
    halaman: 'input', label: 'Input', url: 'input.html',
    ikon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>'
  },
  {
    halaman: 'data', label: 'Data', url: 'data.html',
    ikon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/></svg>'
  },
  {
    halaman: 'budget', label: 'Budget', url: 'budget.html',
    ikon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>'
  }
];

function buatDaftarNav(aktif) {
  return MENU.map(function (m) {
    return '<a class="nav-link' + (m.halaman === aktif ? ' aktif' : '') + '" href="' + m.url + '">' +
      m.ikon + '<span>' + m.label + '</span></a>';
  }).join('');
}

function buatDaftarNavBawah(aktif) {
  return MENU.map(function (m) {
    return '<a class="nav-bawah-link' + (m.halaman === aktif ? ' aktif' : '') + '" href="' + m.url + '">' +
      m.ikon + '<span>' + m.label + '</span></a>';
  }).join('');
}

function initShell() {
  const aktif = document.body.dataset.halaman || '';
  const header = document.getElementById('site-header');
  const navBawah = document.getElementById('nav-bawah');
  const tampilKeluar = statusLogin() && aktif !== 'login';
  if (header) {
    header.innerHTML =
      '<div class="container header-dalam">' +
      '<a class="brand" href="dashboard.html"><span class="brand-ikon">💰</span><span class="brand-teks">Catatan Keuangan</span></a>' +
      '<nav class="nav-atas">' + buatDaftarNav(aktif) + '</nav>' +
      (tampilKeluar ? '<button type="button" class="tombol-keluar" id="tombol-keluar" title="Keluar">Keluar</button>' : '') +
      '</div>';
  }
  if (navBawah) {
    navBawah.innerHTML = '<nav class="nav-bawah-in">' + buatDaftarNavBawah(aktif) + '</nav>';
  }
}

/* ---------------- Toast ---------------- */
function toast(pesan, tipe) {
  tipe = tipe || 'sukses';
  const wadah = document.getElementById('area-toast') || document.body;
  const el = document.createElement('div');
  el.className = 'toast toast-' + tipe;
  el.innerHTML = '<span class="titik"></span><span>' + aman(pesan) + '</span>';
  wadah.appendChild(el);
  setTimeout(function () {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(function () { el.remove(); }, 320);
  }, 3200);
}

/* ---------------- Modal ---------------- */
let modalAktif = null;

function bukaModal(isiHTML) {
  tutupModal();
  const lapisan = document.createElement('div');
  lapisan.className = 'lapisan-modal';
  lapisan.innerHTML = '<div class="modal-kotak" role="dialog" aria-modal="true">' + isiHTML + '</div>';
  lapisan.addEventListener('mousedown', function (e) { if (e.target === lapisan) tutupModal(); });
  document.body.appendChild(lapisan);
  document.body.classList.add('modal-terbuka');
  modalAktif = lapisan;
  const tombolTutup = lapisan.querySelector('[data-tutup-modal]');
  if (tombolTutup) tombolTutup.addEventListener('click', tutupModal);
  return lapisan;
}

function tutupModal() {
  if (modalAktif) {
    modalAktif.remove();
    modalAktif = null;
    document.body.classList.remove('modal-terbuka');
  }
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') tutupModal();
});

/** Kotak konfirmasi sederhana; resolve true/false. */
function konfirmasi(opts) {
  opts = opts || {};
  return new Promise(function (resolve) {
    const lapisan = bukaModal(
      '<div class="modal-judul"><h3>' + aman(opts.judul || 'Konfirmasi') + '</h3>' +
      '<button type="button" class="modal-tutup" data-tutup-modal aria-label="Tutup">✕</button></div>' +
      '<div class="pesan">' + aman(opts.pesan || 'Yakin melanjutkan?') + '</div>' +
      '<div class="modal-aksi">' +
      '<button type="button" class="btn btn-abu" data-modal-tidak>Batal</button>' +
      '<button type="button" class="btn ' + (opts.bahaya === false ? 'btn-primer' : 'btn-bahaya') + '" data-modal-ya>' +
      aman(opts.tombol || 'Ya, Lanjutkan') + '</button>' +
      '</div>'
    );
    lapisan.querySelector('[data-modal-ya]').addEventListener('click', function () { tutupModal(); resolve(true); });
    lapisan.querySelector('[data-modal-tidak]').addEventListener('click', function () { tutupModal(); resolve(false); });
    lapisan.querySelector('[data-tutup-modal]').addEventListener('click', function () { resolve(false); });
  });
}

/* ---------------- Dompet: pilihan & manajemen ---------------- */

/** Opsi <option> dari daftar dompet. */
function opsiDompetHTML(dompet, pilih, labelKosong) {
  let html = '';
  if (labelKosong) html += '<option value="">' + aman(labelKosong) + '</option>';
  dompet.forEach(function (w) {
    html += '<option value="' + aman(w.nama) + '"' + (w.nama === pilih ? ' selected' : '') + '>' +
      aman(w.nama) + '</option>';
  });
  return html;
}

let dompetBerubah = false;

/** Modal "Kelola Dompet": tambah, ubah nama/saldo awal, hapus. */
async function bukaKelolaDompet() {
  const lapisan = bukaModal(
    '<div class="modal-judul"><h3>Kelola Dompet / Rekening</h3>' +
    '<button type="button" class="modal-tutup" data-tutup-modal aria-label="Tutup">✕</button></div>' +
    '<p class="pesan" style="margin-bottom:12px">Dompet = tempat uang Anda (Tunai, rekening bank, e-wallet). ' +
    'Saldo awal dipakai untuk uang yang sudah ada sebelum mulai mencatat.</p>' +
    '<div id="isi-kelola-dompet"></div>'
  );

  // Tombol tutup di dalam konten (Selesai) — ganti perilaku tutup default bila ada perubahan
  await renderIsiKelolaDompet();

  const tombolX = lapisan.querySelector('[data-tutup-modal]');
  tombolX.addEventListener('click', function () {
    if (dompetBerubah) location.reload();
  });
  lapisan.addEventListener('mousedown', function (e) {
    if (e.target === lapisan && dompetBerubah) location.reload();
  });
}

async function renderIsiKelolaDompet() {
  const wadah = $('#isi-kelola-dompet');
  if (!wadah) return;
  wadah.innerHTML = '<div class="pemuat"><div class="spinner"></div><span>Memuat dompet…</span></div>';

  let dompet;
  try {
    dompet = await getDompet();
  } catch (err) {
    wadah.innerHTML = '<div class="kotak-error">' + aman(err.message) + '</div>';
    return;
  }

  wadah.innerHTML =
    // Form tambah baru
    '<div class="kelola-tambah">' +
    '<input type="text" class="form-kontrol" id="dp-nama-baru" placeholder="Nama dompet baru, mis. BCA" maxlength="30">' +
    '<div class="grup-input kecil-grup"><span class="grup-prefix">Rp</span>' +
    '<input type="text" class="form-kontrol kontrol-prefix" id="dp-saldo-baru" inputmode="numeric" placeholder="Saldo awal (0 jika kosong)"></div>' +
    '<button type="button" class="btn btn-primer btn-kecil" id="dp-tombol-tambah">＋ Tambah</button>' +
    '</div>' +
    '<div class="kelola-catatan kecil muted">Klik <strong>Simpan</strong> untuk mengunci perubahan tiap baris.</div>' +
    '<div id="dp-daftar"></div>';

  siapkanInputRupiah($('#dp-saldo-baru'));
  $('#dp-tombol-tambah').addEventListener('click', async function () {
    const inputNama = $('#dp-nama-baru');
    const nama = inputNama.value.trim();
    if (!nama) { inputNama.focus(); toast('Nama dompet wajib diisi.', 'error'); return; }
    const btn = this;
    btn.disabled = true;
    try {
      await tambahDompet({ nama: nama, saldoAwal: nilaiDariInputRupiah($('#dp-saldo-baru')) });
      dompetBerubah = true;
      toast('Dompet "' + nama + '" ditambahkan 🎉');
      inputNama.value = '';
      $('#dp-saldo-baru').value = '';
      await renderIsiKelolaDompet();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  if (dompet.length === 0) {
    $('#dp-daftar').innerHTML = '<div class="kosong">Belum ada dompet. Tambahkan di atas.</div>';
    return;
  }

  $('#dp-daftar').innerHTML = dompet.map(function (w) {
    return '<div class="kelola-baris" data-row="' + w.rowIndex + '">' +
      '<input type="text" class="form-kontrol" data-bidang="nama" value="' + aman(w.nama) + '" maxlength="30">' +
      '<div class="grup-input kecil-grup"><span class="grup-prefix">Rp</span>' +
      '<input type="text" class="form-kontrol kontrol-prefix" data-bidang="saldo" inputmode="numeric" value="' +
      (Number(w.saldoAwal) > 0 ? formatAngka(w.saldoAwal) : '') + '"></div>' +
      '<button type="button" class="btn btn-primer btn-kecil" data-tombol="simpan">Simpan</button>' +
      '<button type="button" class="btn btn-kecil btn-abu" data-tombol="hapus">🗑</button>' +
      '</div>';
  }).join('');

  $('#dp-daftar').querySelectorAll('.kelola-baris').forEach(function (baris) {
    const rowIndex = Number(baris.dataset.row);
    const inputNama = baris.querySelector('[data-bidang="nama"]');
    const inputSaldo = baris.querySelector('[data-bidang="saldo"]');
    const tombolSimpan = baris.querySelector('[data-tombol="simpan"]');
    const tombolHapus = baris.querySelector('[data-tombol="hapus"]');

    siapkanInputRupiah(inputSaldo);
    tombolSimpan.addEventListener('click', async function () {
      const nama = inputNama.value.trim();
      if (!nama) { toast('Nama dompet tidak boleh kosong.', 'error'); return; }
      tombolSimpan.disabled = true;
      tombolSimpan.textContent = '…';
      try {
        await editDompet({ rowIndex: rowIndex, nama: nama, saldoAwal: nilaiDariInputRupiah(inputSaldo) });
        dompetBerubah = true;
        toast('Dompet diperbarui ✅');
        await renderIsiKelolaDompet();
      } catch (err) {
        toast(err.message, 'error');
        tombolSimpan.disabled = false;
        tombolSimpan.textContent = 'Simpan';
      }
    });

    tombolHapus.addEventListener('click', async function () {
      const namaSekarang = inputNama.value.trim() || '(tanpa nama)';
      // Konfirmasi dua langkah di dalam tombol (hindari menutup modal induk)
      if (tombolHapus.dataset.yakin !== '1') {
        tombolHapus.dataset.yakin = '1';
        const teksAsli = tombolHapus.textContent;
        tombolHapus.textContent = 'Yakin?';
        tombolHapus.classList.add('btn-bahaya');
        setTimeout(function () {
          delete tombolHapus.dataset.yakin;
          tombolHapus.textContent = teksAsli;
          tombolHapus.classList.remove('btn-bahaya');
        }, 4000);
        return;
      }
      tombolHapus.disabled = true;
      tombolHapus.textContent = '…';
      try {
        await hapusDompet(rowIndex);
        dompetBerubah = true;
        toast('Dompet "' + namaSekarang + '" dihapus 🗑');
        await renderIsiKelolaDompet();
      } catch (err) {
        toast(err.message, 'error');
        tombolHapus.disabled = false;
        tombolHapus.textContent = '🗑';
      }
    });
  });
}

/* ---------------- Warna chart ---------------- */
const PALET_CHART = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#d97706',
  '#65a30d', '#16a34a', '#0d9488', '#0891b2', '#4f46e5', '#be185d'
];

/* ---------------- Login / proteksi halaman ---------------- */
const KUNCI_SESI = 'ck_sesi';

function statusLogin() {
  try {
    const data = JSON.parse(localStorage.getItem(KUNCI_SESI) || 'null');
    return !!(data && data.u === KONFIG_LOGIN.username && Number(data.exp) > Date.now());
  } catch (e) {
    return false;
  }
}

function buatSesi() {
  const hari = Number(KONFIG_LOGIN.sesiHari) || 7;
  localStorage.setItem(KUNCI_SESI, JSON.stringify({
    u: KONFIG_LOGIN.username,
    exp: Date.now() + hari * 86400000
  }));
}

function hapusSesi() {
  localStorage.removeItem(KUNCI_SESI);
}

/** Halaman login vs halaman lain; arahkan sesuai status masuk. */
function proteksiHalaman() {
  const halamanIni = document.body.dataset.halaman || '';
  const masuk = statusLogin();
  if (halamanIni === 'login') {
    if (masuk) location.replace('dashboard.html');
    return;
  }
  if (!masuk) location.replace('login.html');
}

/* ---------------- Inisialisasi shell ---------------- */
proteksiHalaman();
initShell();
if (statusLogin() && document.body.dataset.halaman !== 'login') {
  const tombolKeluar = document.getElementById('tombol-keluar');
  if (tombolKeluar) {
    tombolKeluar.addEventListener('click', function () {
      hapusSesi();
      location.replace('login.html');
    });
  }
}
