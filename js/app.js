/* =========================================================
   app.js — Utilitas bersama semua halaman
   (dipanggil pertama di setiap halaman)
   ========================================================= */
'use strict';

/* ---------------- Kategori ---------------- */
// Kategori bawaan (tetap). Kategori tambahan disimpan di localStorage
// browser (bersifat per-perangkat, tanpa login).
const KATEGORI_DEFAULT = {
  pemasukan: ['Gaji', 'Bonus'],
  pengeluaran: ['Makan', 'Transportasi', 'Tagihan', 'Hiburan', 'Pendidikan', 'Orang Tua']
};
const TIPE_TRANSAKSI = { PEMASUKAN: 'Pemasukan', PENGELUARAN: 'Pengeluaran' };
const KUNCI_EXTRA = {
  pemasukan: 'kat_pemasukan_ekstra',
  pengeluaran: 'kat_pengeluaran_ekstra'
};

function ambilKategoriEkstra(tipe) {
  try {
    const isi = JSON.parse(localStorage.getItem(KUNCI_EXTRA[tipe]) || '[]');
    return Array.isArray(isi) ? isi : [];
  } catch (e) { return []; }
}

function simpanKategoriEkstra(tipe, daftar) {
  localStorage.setItem(KUNCI_EXTRA[tipe], JSON.stringify(daftar));
}

/** Daftar kategori lengkap untuk satu tipe (bawaan + tambahan). */
function getKategori(tipe) {
  const dasar = KATEGORI_DEFAULT[tipe] || [];
  return dasar.concat(ambilKategoriEkstra(tipe));
}

/** Tambah kategori baru; return true bila berhasil ditambahkan. */
function tambahKategoriBaru(tipe, nama) {
  nama = String(nama || '').trim();
  if (!nama) return false;
  if (getKategori(tipe).indexOf(nama) !== -1) return false;
  const daftar = ambilKategoriEkstra(tipe);
  daftar.push(nama);
  simpanKategoriEkstra(tipe, daftar);
  return true;
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
  if (header) {
    header.innerHTML =
      '<div class="container header-dalam">' +
      '<a class="brand" href="dashboard.html"><span class="brand-ikon">💰</span><span class="brand-teks">Catatan Keuangan</span></a>' +
      '<nav class="nav-atas">' + buatDaftarNav(aktif) + '</nav>' +
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

/* ---------------- Warna chart ---------------- */
const PALET_CHART = [
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#d97706',
  '#65a30d', '#16a34a', '#0d9488', '#0891b2', '#4f46e5', '#be185d'
];

/* ---------------- Inisialisasi shell ---------------- */
initShell();
