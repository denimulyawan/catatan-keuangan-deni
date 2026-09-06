/* =========================================================
   input.js — Halaman Input Transaksi (pemasukan/pengeluaran/transfer)
   ========================================================= */
'use strict';

let tipeTerpilih = TIPE_TRANSAKSI.PEMASUKAN;
let DAFTAR_DOMPET = [];   // dari server: [{rowIndex, nama, saldoAwal}]

/* ---------------- Bangun pilihan kategori ---------------- */
function bangunSelectKategori(pilih) {
  const daftar = getKategori(tipeTerpilih);
  let opsi = daftar.map(function (k) {
    return '<option value="' + aman(k) + '"' + (k === pilih ? ' selected' : '') + '>' + aman(k) + '</option>';
  }).join('');
  const el = $('#kategori');
  el.innerHTML = opsi || '<option value="">(tidak ada)</option>';
}

/* ---------------- Bangun pilihan dompet ---------------- */
function isiSelectDompet(select, pilih) {
  select.innerHTML = opsiDompetHTML(DAFTAR_DOMPET, pilih);
}

function isiSelectDompetTanpa(select, pilih, kecuali) {
  let html = '';
  DAFTAR_DOMPET.forEach(function (w) {
    if (w.nama === kecuali) return;
    html += '<option value="' + aman(w.nama) + '"' + (w.nama === pilih ? ' selected' : '') + '>' + aman(w.nama) + '</option>';
  });
  select.innerHTML = html || '<option value="">(tidak ada)</option>';
}

/* ---------------- Tampilan mengikuti tipe ---------------- */

/** Baca pilihan tipe LANGSUNG dari tombol radio yang aktif (anti-salah-cache). */
function tipeTerpilihSekarang() {
  const radio = document.querySelector('input[name="tipe"]:checked');
  return radio ? radio.value : TIPE_TRANSAKSI.PEMASUKAN;
}

function perbaruiBidangTipe() {
  tipeTerpilih = tipeTerpilihSekarang();
  const transfer = tipeTerpilih === 'Transfer';
  $('#grup-dompet-tunggal').hidden = transfer;
  $('#grup-transfer').hidden = !transfer;
  $('#grup-kategori').hidden = transfer;
  $('#label-deskripsi').textContent = transfer ? 'Keterangan' : 'Deskripsi';

  if (transfer) {
    const asal = $('#dompet-asal').value;
    const tujuan = $('#dompet-tujuan').value;
    isiSelectDompet($('#dompet-asal'), asal);
    isiSelectDompetTanpa($('#dompet-tujuan'), (tujuan === asal ? '' : tujuan), asal);
  } else {
    bangunSelectKategori('');
    isiSelectDompet($('#dompet'), $('#dompet').value);
  }
  perbaruiRingkasan();
}

/** Ringkasan "akan disimpan sebagai apa" — biar tidak salah pilih. */
function perbaruiRingkasan() {
  const wadah = $('#ringkasan-simpan');
  if (!wadah) return;
  const nilai = nilaiDariInputRupiah($('#nominal'));
  const tipe = tipeTerpilihSekarang();
  if (nilai <= 0) { wadah.hidden = true; return; }

  if (tipe === 'Transfer') {
    const dari = $('#dompet-asal').value;
    const ke = $('#dompet-tujuan').value;
    if (!dari || !ke) { wadah.hidden = true; return; }
    wadah.hidden = false;
    wadah.innerHTML = 'Akan disimpan: <b>Transfer</b> <span class="nominal-transfer">' + formatRupiah(nilai) + '</span>' +
      ' — dari <b>' + aman(dari) + '</b> ke <b>' + aman(ke) + '</b>.';
    return;
  }

  const masuk = tipe === TIPE_TRANSAKSI.PEMASUKAN;
  const kategori = $('#kategori').value || '…';
  const dompet = $('#dompet').value || '…';
  wadah.hidden = false;
  wadah.innerHTML = 'Akan disimpan: <b>' + aman(tipe) + '</b> ' +
    '<span class="' + (masuk ? 'nominal-plus' : 'nominal-minus') + '">' + (masuk ? '+' : '−') + formatRupiah(nilai) + '</span>' +
    ' · Kategori <b>' + aman(kategori) + '</b> · Dompet <b>' + aman(dompet) + '</b>';
}

/** Sinkronkan isi dropdown transfer (asal ↔ tujuan tak boleh sama). */
function singkronTransfer() {
  const asal = $('#dompet-asal').value;
  const tujuan = $('#dompet-tujuan').value;
  isiSelectDompetTanpa($('#dompet-tujuan'), (tujuan === asal ? '' : tujuan), asal);
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
      return entriBaris(t);
    }).join('');
  } catch (e) {
    // Daftar terakhir tidak wajib; jangan ganggu pengguna
  }
}

/** Satu baris ringkas (dipakai juga untuk riwayat terakhir). */
function entriBaris(t) {
  const isTransfer = t.tipe === 'Transfer';
  if (isTransfer) {
    return '<div class="entri-barisan">' +
      '<span class="bulatan masuk" style="background:#dbeafe;color:#1e40af">⇄</span>' +
      '<div class="entri-isi">' +
      '<div class="entri-judul">Transfer' + (t.deskripsi ? ' · ' + aman(t.deskripsi) : '') + '</div>' +
      '<div class="entri-sub">' + aman(t.dompet) + ' → ' + aman(t.dompetTujuan) + ' · ' + formatTanggal(t.tanggal) + '</div>' +
      '</div>' +
      '<span class="nominal-transfer">' + formatRupiah(t.nominal) + '</span>' +
      '</div>';
  }
  const masuk = t.tipe === TIPE_TRANSAKSI.PEMASUKAN;
  return '<div class="entri-barisan">' +
    '<span class="bulatan ' + (masuk ? 'masuk' : 'keluar') + '">' + (masuk ? '+' : '−') + '</span>' +
    '<div class="entri-isi">' +
    '<div class="entri-judul">' + aman(t.kategori) + (t.deskripsi ? ' · ' + aman(t.deskripsi) : '') +
    '<span class="tag-dompet">' + aman(t.dompet) + '</span></div>' +
    '<div class="entri-sub">' + formatTanggal(t.tanggal) + '</div>' +
    '</div>' +
    '<span class="' + (masuk ? 'nominal-plus' : 'nominal-minus') + '">' + (masuk ? '+' : '−') + formatRupiah(t.nominal) + '</span>' +
    '</div>';
}

/* ---------------- Simpan transaksi ---------------- */
async function simpanTransaksi(e) {
  e.preventDefault();

  // Pastikan tipe diambil langsung dari radio yang aktif saat disimpan
  tipeTerpilih = tipeTerpilihSekarang();

  const tanggal = $('#tanggal');
  const kategori = $('#kategori');
  const deskripsi = $('#deskripsi');
  const nominal = $('#nominal');
  const transfer = tipeTerpilih === 'Transfer';
  const dompet = $('#dompet');
  const dompetAsal = $('#dompet-asal');
  const dompetTujuan = $('#dompet-tujuan');

  // Validasi
  let valid = true;
  [tanggal, nominal].forEach(bersihkanGagal);
  if (!transfer) { bersihkanGagal(kategori); bersihkanGagal(dompet); } else {
    bersihkanGagal(dompetAsal); bersihkanGagal(dompetTujuan);
  }

  if (!tanggal.value) { tandaiGagal(tanggal, 'Pilih tanggal transaksi.'); valid = false; }
  const nilai = nilaiDariInputRupiah(nominal);
  if (nilai <= 0) { tandaiGagal(nominal, 'Nominal harus lebih dari 0.'); valid = false; }

  if (transfer) {
    if (!dompetAsal.value) { tandaiGagal(dompetAsal, 'Pilih dompet asal.'); valid = false; }
    if (!dompetTujuan.value) { tandaiGagal(dompetTujuan, 'Pilih dompet tujuan.'); valid = false; }
    if (dompetAsal.value && dompetAsal.value === dompetTujuan.value) {
      tandaiGagal(dompetTujuan, 'Dompet asal dan tujuan tidak boleh sama.'); valid = false;
    }
  } else {
    if (!kategori.value) { tandaiGagal(kategori, 'Pilih kategori.'); valid = false; }
    if (!dompet.value) { tandaiGagal(dompet, 'Pilih dompet.'); valid = false; }
  }
  if (!valid) return;

  const tombol = $('#tombol-simpan');
  tombol.disabled = true;
  tombol.textContent = 'Menyimpan…';

  const payload = {
    tanggal: tanggal.value,
    kategori: transfer ? 'Transfer' : kategori.value,
    deskripsi: deskripsi.value.trim(),
    nominal: nilai,
    tipe: tipeTerpilih,
    dompet: transfer ? dompetAsal.value : dompet.value,
    dompetTujuan: transfer ? dompetTujuan.value : ''
  };

  try {
    await tambahTransaksi(payload);
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
  tipeTerpilih = TIPE_TRANSAKSI.PEMASUKAN;
  $('#tanggal').value = tanggalHariIni();
  perbaruiBidangTipe();
  bangunSelectKategori('');
  perbaruiPratinjau();
}

/* ---------------- Inisialisasi ---------------- */
async function initInput() {
  siapkanInputRupiah($('#nominal'));
  $('#tanggal').value = tanggalHariIni();

  // Ambil daftar dompet
  try {
    DAFTAR_DOMPET = await getDompet();
  } catch (err) {
    toast(err.message, 'error');
  }

  // Pemilihan tipe
  const radios = document.querySelectorAll('input[name="tipe"]');
  radios.forEach(function (r) {
    r.addEventListener('change', function () {
      tipeTerpilih = r.value;
      perbaruiBidangTipe();
      perbaruiPratinjau();
    });
  });

  $('#dompet').addEventListener('change', function () {
    isiSelectDompet($('#dompet-asal'), this.value);
    singkronTransfer();
    perbaruiRingkasan();
  });
  $('#dompet-asal').addEventListener('change', function () {
    singkronTransfer();
    perbaruiRingkasan();
  });
  $('#kategori').addEventListener('change', perbaruiRingkasan);

  perbaruiBidangTipe();
  bangunSelectKategori('');
  perbaruiPratinjau();
  perbaruiRingkasan();
  $('#nominal').addEventListener('input', function () {
    perbaruiPratinjau();
    perbaruiRingkasan();
  });
  $('#nominal').addEventListener('keydown', function (e2) {
    if (e2.key === 'Enter') e2.preventDefault();
  });

  // Kelola dompet
  $('#tombol-kelola-dompet').addEventListener('click', bukaKelolaDompet);

  // Submit & reset
  $('#form-transaksi').addEventListener('submit', simpanTransaksi);
  $('#tombol-reset').addEventListener('click', function () {
    resetFormulir();
    toast('Formulir dibersihkan.', 'info');
  });

  muatTransaksiTerakhir();
}

initInput();
