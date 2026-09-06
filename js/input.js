/* =========================================================
   input.js — Halaman Input Transaksi
   ========================================================= */
'use strict';

let tipeTerpilih = TIPE_TRANSAKSI.PEMASUKAN;

/* ---------------- Bangun pilihan kategori ---------------- */
function bangunSelectKategori(pilih) {
  const daftar = getKategori(tipeTerpilih);
  let opsi = daftar.map(function (k) {
    return '<option value="' + aman(k) + '"' + (k === pilih ? ' selected' : '') + '>' + aman(k) + '</option>';
  }).join('');
  const el = $('#kategori');
  el.innerHTML = opsi || '<option value="">(tidak ada)</option>';
}

/* ---------------- Pratinjau nominal ---------------- */
function perbaruiPratinjau() {
  const nilai = nilaiDariInputRupiah($('#nominal'));
  const el = $('#pratinjau-nominal');
  el.textContent = formatRupiah(nilai);
  el.classList.toggle('keluar', tipeTerpilih === TIPE_TRANSAKSI.PENGELUARAN);
}

/* ---------------- Validasi ---------------- */
function tandaiGagal(el, pesan) {
  const grup = el.closest('.form-grup');
  el.classList.add('gagal');
  let pesanEl = grup ? grup.querySelector('.pesan-error') : null;
  if (!pesanEl && grup) {
    pesanEl = document.createElement('div');
    pesanEl.className = 'pesan-error';
    grup.appendChild(pesanEl);
  }
  if (pesanEl) pesanEl.textContent = pesan;
  el.focus();
}

function bersihkanGagal(el) {
  el.classList.remove('gagal');
  const grup = el.closest('.form-grup');
  if (grup) {
    const pesanEl = grup.querySelector('.pesan-error');
    if (pesanEl) pesanEl.remove();
  }
}

/* ---------------- Muat ulang daftar terakhir ---------------- */
async function muatTransaksiTerakhir() {
  const wadah = $('#daftar-terakhir');
  try {
    const semua = await getTransaksi();
    const terbaru = semua.slice().sort(function (a, b) {
      const byTgl = String(b.tanggal).localeCompare(String(a.tanggal));
      if (byTgl !== 0) return byTgl;
      return (Number(b.rowIndex) || 0) - (Number(a.rowIndex) || 0);
    }).slice(0, 5);

    $('#jumlah-terakhir').textContent = terbaru.length > 0 ? '5 terakhir dari ' + semua.length + ' transaksi' : '';

    if (terbaru.length === 0) {
      tampilkanKosong(wadah, '📭', 'Belum ada transaksi tersimpan.');
      return;
    }
    wadah.innerHTML = terbaru.map(function (t) {
      const masuk = t.tipe === TIPE_TRANSAKSI.PEMASUKAN;
      return '<div class="entri-barisan">' +
        '<span class="bulatan ' + (masuk ? 'masuk' : 'keluar') + '">' + (masuk ? '+' : '−') + '</span>' +
        '<div class="entri-isi">' +
        '<div class="entri-judul">' + aman(t.kategori) + (t.deskripsi ? ' · ' + aman(t.deskripsi) : '') + '</div>' +
        '<div class="entri-sub">' + formatTanggal(t.tanggal) + '</div>' +
        '</div>' +
        '<span class="' + (masuk ? 'nominal-plus' : 'nominal-minus') + '">' + (masuk ? '+' : '−') + formatRupiah(t.nominal) + '</span>' +
        '</div>';
    }).join('');
  } catch (e) {
    // Daftar terakhir tidak wajib; jangan ganggu pengguna
  }
}

/* ---------------- Simpan transaksi ---------------- */
async function simpanTransaksi(e) {
  e.preventDefault();

  const tanggal = $('#tanggal');
  const kategori = $('#kategori');
  const deskripsi = $('#deskripsi');
  const nominal = $('#nominal');

  // Validasi
  let valid = true;
  [tanggal, kategori, nominal].forEach(bersihkanGagal);
  if (!tanggal.value) { tandaiGagal(tanggal, 'Pilih tanggal transaksi.'); valid = false; }
  if (!kategori.value) { tandaiGagal(kategori, 'Pilih kategori.'); valid = false; }
  const nilai = nilaiDariInputRupiah(nominal);
  if (nilai <= 0) { tandaiGagal(nominal, 'Nominal harus lebih dari 0.'); valid = false; }
  if (!valid) return;

  const tombol = $('#tombol-simpan');
  tombol.disabled = true;
  tombol.textContent = 'Menyimpan…';

  try {
    await tambahTransaksi({
      tanggal: tanggal.value,
      kategori: kategori.value,
      deskripsi: deskripsi.value.trim(),
      nominal: nilai,
      tipe: tipeTerpilih
    });
    toast('Transaksi tersimpan ✅');
    resetFormulir();
    muatTransaksiTerakhir();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    tombol.disabled = false;
    tombol.textContent = 'Simpan Transaksi';
  }
}

function resetFormulir() {
  const form = $('#form-transaksi');
  form.reset();
  // reset() mengembalikan ke state awal HTML (checked = Pemasukan)
  tipeTerpilih = TIPE_TRANSAKSI.PEMASUKAN;
  bangunSelectKategori('');
  $('#tanggal').value = tanggalHariIni();
  perbaruiPratinjau();
}

/* ---------------- Inisialisasi ---------------- */
function initInput() {
  siapkanInputRupiah($('#nominal'));
  $('#tanggal').value = tanggalHariIni();

  // Pemilihan tipe
  const radios = document.querySelectorAll('input[name="tipe"]');
  radios.forEach(function (r) {
    r.addEventListener('change', function () {
      tipeTerpilih = r.value;
      bangunSelectKategori('');
      perbaruiPratinjau();
    });
  });

  bangunSelectKategori('');
  perbaruiPratinjau();
  $('#nominal').addEventListener('input', perbaruiPratinjau);
  $('#nominal').addEventListener('keydown', function (e2) {
    if (e2.key === 'Enter') e2.preventDefault();
  });

  // Panel tambah kategori baru
  const tombolPanel = $('#tombol-kategori-baru');
  const panel = $('#panel-kategori-baru');
  tombolPanel.addEventListener('click', function () {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) $('#nama-kategori-baru').focus();
  });
  $('#simpan-kategori-baru').addEventListener('click', function () {
    const input = $('#nama-kategori-baru');
    const nama = input.value.trim();
    if (!nama) { input.focus(); return; }
    if (tambahKategoriBaru(tipeTerpilih, nama)) {
      bangunSelectKategori(nama);
      toast('Kategori "' + nama + '" ditambahkan 🎉');
    } else {
      toast('Kategori "' + nama + '" sudah ada.', 'info');
      bangunSelectKategori(nama);
    }
    input.value = '';
    panel.hidden = true;
  });

  // Submit & reset
  $('#form-transaksi').addEventListener('submit', simpanTransaksi);
  $('#tombol-reset').addEventListener('click', function () {
    resetFormulir();
    toast('Formulir dibersihkan.', 'info');
  });

  muatTransaksiTerakhir();
}

initInput();
