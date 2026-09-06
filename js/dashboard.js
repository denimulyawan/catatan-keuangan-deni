/* =========================================================
   dashboard.js — Halaman Dashboard
   (saldo per dompet + KPI + pie chart + line chart + terbaru)
   ========================================================= */
'use strict';

let SEMUA_TRANSAKSI = [];   // semua transaksi dari server
let DAFTAR_DOMPET = [];     // semua dompet dari server
let bulanAktif = bulanHariIniKey();
let urutBulan = [];         // bulan yang tersedia (turun)
let filterDompet = '';      // '' = semua dompet
let chartPie = null;
let chartLine = null;

/* ---------------- Inisialisasi ---------------- */
async function initDashboard() {
  const wadahBulan = $('#pilih-bulan');
  const wadahDompet = $('#pilih-dompet');
  const kpi = $('#kpi-cards');

  tampilkanPemuat($('#riwayat-dashboard'));
  try {
    const hasil = await Promise.all([getTransaksi(), getDompet()]);
    SEMUA_TRANSAKSI = hasil[0];
    DAFTAR_DOMPET = hasil[1];
  } catch (err) {
    tampilkanError(kpi, err.message, 'Coba Lagi', initDashboard);
    return;
  }

  urutBulan = daftarBulanDariTransaksi(SEMUA_TRANSAKSI);
  if (urutBulan.indexOf(bulanAktif) === -1) bulanAktif = urutBulan[0];

  // Pemilih bulan: ‹ [bulan] ›
  wadahBulan.innerHTML =
    '<button type="button" class="tombol-bulan" id="bulan-mundur" aria-label="Bulan sebelumnya">‹</button>' +
    '<span class="label-bulan" id="label-bulan"></span>' +
    '<button type="button" class="tombol-bulan" id="bulan-maju" aria-label="Bulan berikutnya">›</button>';

  $('#bulan-mundur').addEventListener('click', function () {
    const pos = urutBulan.indexOf(bulanAktif);
    if (pos < urutBulan.length - 1) { bulanAktif = urutBulan[pos + 1]; renderSemua(); }
  });
  $('#bulan-maju').addEventListener('click', function () {
    const pos = urutBulan.indexOf(bulanAktif);
    if (pos > 0) { bulanAktif = urutBulan[pos - 1]; renderSemua(); }
  });

  // Pemilih dompet: Semua Dompet / satu dompet
  wadahDompet.innerHTML =
    '<span class="label-grup">Dompet:</span>' +
    '<select id="select-dompet" aria-label="Filter dompet">' + opsiDompetHTML(DAFTAR_DOMPET, '', 'Semua Dompet') + '</select>' +
    '<button type="button" class="btn btn-garis btn-kecil" id="tombol-kelola-dompet">⚙️ Kelola</button>';

  $('#select-dompet').addEventListener('change', function () {
    filterDompet = this.value;
    renderSemua();
  });
  $('#tombol-kelola-dompet').addEventListener('click', bukaKelolaDompet);

  renderSemua();
}

function renderSemua() {
  $('#label-bulan').textContent = labelBulan(bulanAktif);
  perbaruiTombolBulan();
  renderSaldoDompet();
  renderKPI();
  renderPie();
  renderLine();
  renderTerbaru();
}

function perbaruiTombolBulan() {
  const pos = urutBulan.indexOf(bulanAktif);
  $('#bulan-mundur').disabled = pos >= urutBulan.length - 1;
  $('#bulan-maju').disabled = pos <= 0;
}

/* ---------------- Filter data ---------------- */

/** Transaksi yang "menyentuh" dompet pilihan (Semua = tanpa filter). */
function transaksiUntukDompet(daftar) {
  if (!filterDompet) return daftar;
  return daftar.filter(function (t) {
    return t.dompet === filterDompet || t.dompetTujuan === filterDompet;
  });
}

function transaksiDiBulan(kunci) {
  const diBulan = SEMUA_TRANSAKSI.filter(function (t) {
    return String(t.tanggal || '').slice(0, 7) === kunci;
  });
  return transaksiUntukDompet(diBulan);
}

function hitungPerTipe(daftar) {
  let masuk = 0, keluar = 0;
  daftar.forEach(function (t) {
    const n = Number(t.nominal) || 0;
    if (t.tipe === TIPE_TRANSAKSI.PEMASUKAN) masuk += n;
    else if (t.tipe === TIPE_TRANSAKSI.PENGELUARAN) keluar += n;
  });
  return { masuk: masuk, keluar: keluar };
}

/* ---------------- Saldo per dompet (semua waktu) ---------------- */
function renderSaldoDompet() {
  const wadah = $('#isi-saldo-dompet');
  let total = 0;
  const chip = DAFTAR_DOMPET.map(function (w) {
    let saldo = Number(w.saldoAwal) || 0;
    SEMUA_TRANSAKSI.forEach(function (t) {
      const n = Number(t.nominal) || 0;
      if (t.tipe === TIPE_TRANSAKSI.PEMASUKAN && t.dompet === w.nama) saldo += n;
      else if (t.tipe === TIPE_TRANSAKSI.PENGELUARAN && t.dompet === w.nama) saldo -= n;
      else if (t.tipe === 'Transfer') {
        if (t.dompet === w.nama) saldo -= n;
        if (t.dompetTujuan === w.nama) saldo += n;
      }
    });
    total += saldo;
    const warna = saldo < 0 ? 'nilai-merah' : 'nilai-primer';
    return '<div class="dompet-chip' + (filterDompet === w.nama ? ' total' : '') + '">' +
      '<span class="chip-nama">' + aman(w.nama) + '</span>' +
      '<span class="chip-nilai ' + warna + '">' + formatRupiah(saldo) + '</span></div>';
  }).join('');

  if (DAFTAR_DOMPET.length === 0) {
    wadah.innerHTML = '<div class="kosong" style="padding:16px">Belum ada dompet. ' +
      '<a class="link" href="#" id="link-kelola-dompet-kosong">Buat dompet dulu</a>.</div>';
    const link = $('#link-kelola-dompet-kosong');
    if (link) link.addEventListener('click', function (e) { e.preventDefault(); bukaKelolaDompet(); });
    return;
  }

  $('#info-saldo-dompet').textContent = 'Saldo saat ini (saldo awal + semua transaksi)';
  wadah.innerHTML =
    '<div class="dompet-chip-wrap">' +
    '<div class="dompet-chip total"><span class="chip-nama">Total Saldo</span>' +
    '<span class="chip-nilai ' + (total < 0 ? 'nilai-merah' : '') + '">' + formatRupiah(total) + '</span></div>' +
    chip +
    '</div>';
}

/* ---------------- KPI bulan ini ---------------- */
function renderKPI() {
  const daftar = transaksiDiBulan(bulanAktif);
  const { masuk, keluar } = hitungPerTipe(daftar);
  const saldo = masuk - keluar;
  const keteranganDompet = filterDompet ? ' · hanya ' + filterDompet : '';

  $('#kpi-cards').innerHTML =
    kpiKartu('Pemasukan', formatRupiah(masuk), 'nilai-hijau', '💵 Masuk bulan ini' + keteranganDompet) +
    kpiKartu('Pengeluaran', formatRupiah(keluar), 'nilai-merah', '💸 Keluar bulan ini' + keteranganDompet) +
    kpiKartu('Saldo Bulan Ini', formatRupiah(saldo), saldo >= 0 ? 'nilai-primer' : 'nilai-merah',
      saldo >= 0 ? 'Sisa uang bulan ini' : 'Melebihi pemasukan') +
    kpiKartu('Jumlah Transaksi', String(daftar.length), 'nilai-biru', 'Di bulan ini' + keteranganDompet);
}

function kpiKartu(label, nilai, warna, sub) {
  return '<div class="card kpi"><div class="kpi-label">' + aman(label) + '</div>' +
    '<div class="kpi-nilai ' + warna + '">' + aman(nilai) + '</div>' +
    '<div class="kpi-sub">' + aman(sub) + '</div></div>';
}

/* ---------------- Pie chart: pengeluaran per kategori ---------------- */
function renderPie() {
  const kosong = $('#kosong-pie');
  if (chartPie) { chartPie.destroy(); chartPie = null; }

  const daftar = transaksiDiBulan(bulanAktif).filter(function (t) {
    return t.tipe === TIPE_TRANSAKSI.PENGELUARAN;
  });

  const peta = {};
  daftar.forEach(function (t) { peta[t.kategori] = (peta[t.kategori] || 0) + (Number(t.nominal) || 0); });
  const label = Object.keys(peta);
  const nilai = label.map(function (k) { return peta[k]; });

  $('#judul-pie').textContent = labelBulan(bulanAktif) + (filterDompet ? ' · ' + filterDompet : '');

  if (typeof Chart === 'undefined') {
    tampilkanKosong($('#chart-pie').parentElement, '📉', 'Chart.js gagal dimuat. Periksa koneksi internet.');
    return;
  }
  if (label.length === 0) {
    kosong.hidden = false;
    return;
  }
  kosong.hidden = true;

  chartPie = new Chart($('#chart-pie'), {
    type: 'pie',
    data: {
      labels: label,
      datasets: [{
        data: nilai,
        backgroundColor: label.map(function (_, i) { return PALET_CHART[i % PALET_CHART.length]; }),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0);
              const persen = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0';
              return ' ' + ctx.label + ': ' + formatRupiah(ctx.parsed) + ' (' + persen + '%)';
            }
          }
        }
      }
    }
  });
}

/* ---------------- Line chart: tren 6 bulan ---------------- */
function renderLine() {
  if (chartLine) { chartLine.destroy(); chartLine = null; }
  if (typeof Chart === 'undefined') return;

  const kunciBulan = [];
  let k = bulanAktif;
  for (let i = 0; i < 6; i++) {
    kunciBulan.push(k);
    k = bulanKey(k, -1);
  }
  kunciBulan.reverse();

  const dataMasuk = [], dataKeluar = [];
  kunciBulan.forEach(function (kb) {
    const { masuk, keluar } = hitungPerTipe(transaksiDiBulan(kb));
    dataMasuk.push(masuk);
    dataKeluar.push(keluar);
  });

  chartLine = new Chart($('#chart-line'), {
    type: 'line',
    data: {
      labels: kunciBulan.map(labelBulanPendek),
      datasets: [
        {
          label: 'Pemasukan',
          data: dataMasuk,
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#16a34a'
        },
        {
          label: 'Pengeluaran',
          data: dataKeluar,
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220,38,38,0.06)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#dc2626'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 12, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + formatRupiah(ctx.parsed.y); }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: function (v) { return formatAngka(v); }, font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });
}

/* ---------------- Transaksi terbaru ---------------- */
function renderTerbaru() {
  const wadah = $('#riwayat-dashboard');
  const salinan = transaksiUntukDompet(SEMUA_TRANSAKSI).slice().sort(function (a, b) {
    const byTgl = String(b.tanggal).localeCompare(String(a.tanggal));
    if (byTgl !== 0) return byTgl;
    return (Number(b.rowIndex) || 0) - (Number(a.rowIndex) || 0);
  }).slice(0, 5);

  if (salinan.length === 0) {
    tampilkanKosong(wadah, '📭',
      'Belum ada transaksi' + (filterDompet ? ' untuk dompet ' + aman(filterDompet) : '') +
      '. Klik <strong>＋ Transaksi Baru</strong> untuk memulai pencatatan.');
    return;
  }

  wadah.innerHTML = salinan.map(function (t) {
    if (t.tipe === 'Transfer') {
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
  }).join('');
}

/* ---------------- Jalankan ---------------- */
initDashboard();
