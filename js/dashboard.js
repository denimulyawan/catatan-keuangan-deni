/* =========================================================
   dashboard.js — Halaman Dashboard
   (KPI + pie chart pengeluaran + line chart tren + terbaru)
   ========================================================= */
'use strict';

let SEMUA_TRANSAKSI = [];   // semua transaksi dari server
let bulanAktif = bulanHariIniKey();
let urutBulan = [];         // bulan yang tersedia (turun)
let chartPie = null;
let chartLine = null;

/* ---------------- Inisialisasi ---------------- */
async function initDashboard() {
  const wadahBulan = $('#pilih-bulan');
  const kpi = $('#kpi-cards');

  tampilkanPemuat($('#riwayat-dashboard'));
  try {
    SEMUA_TRANSAKSI = await getTransaksi();
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

  renderSemua();
}

function renderSemua() {
  $('#label-bulan').textContent = labelBulan(bulanAktif);
  renderKPI();
  renderPie();
  renderLine();
  renderTerbaru();
  perbaruiTombolBulan();
}

function perbaruiTombolBulan() {
  const pos = urutBulan.indexOf(bulanAktif);
  $('#bulan-mundur').disabled = pos >= urutBulan.length - 1;
  $('#bulan-maju').disabled = pos <= 0;
}

/* ---------------- Filter transaksi ---------------- */
function transaksiDiBulan(kunci) {
  return SEMUA_TRANSAKSI.filter(function (t) {
    return String(t.tanggal || '').slice(0, 7) === kunci;
  });
}

function hitungPerTipe(daftar) {
  let masuk = 0, keluar = 0;
  daftar.forEach(function (t) {
    const n = Number(t.nominal) || 0;
    if (t.tipe === TIPE_TRANSAKSI.PEMASUKAN) masuk += n;
    else keluar += n;
  });
  return { masuk: masuk, keluar: keluar };
}

/* ---------------- KPI ---------------- */
function renderKPI() {
  const daftar = transaksiDiBulan(bulanAktif);
  const { masuk, keluar } = hitungPerTipe(daftar);
  const saldo = masuk - keluar;

  $('#kpi-cards').innerHTML =
    kpiKartu('Pemasukan', formatRupiah(masuk), 'nilai-hijau', '💵 Masuk bulan ini') +
    kpiKartu('Pengeluaran', formatRupiah(keluar), 'nilai-merah', '💸 Keluar bulan ini') +
    kpiKartu('Saldo Bulan Ini', formatRupiah(saldo), saldo >= 0 ? 'nilai-primer' : 'nilai-merah',
      saldo >= 0 ? 'Sisa uang bulan ini' : 'Melebihi pemasukan') +
    kpiKartu('Jumlah Transaksi', String(daftar.length), 'nilai-biru', 'Di bulan ini');
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

  // Kelompokkan per kategori
  const peta = {};
  daftar.forEach(function (t) { peta[t.kategori] = (peta[t.kategori] || 0) + (Number(t.nominal) || 0); });
  const label = Object.keys(peta);
  const nilai = label.map(function (k) { return peta[k]; });

  $('#judul-pie').textContent = labelBulan(bulanAktif);

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

  // Ambil 6 bulan terakhir sampai bulan aktif
  const kunciBulan = [];
  let k = bulanAktif;
  for (let i = 0; i < 6; i++) {
    kunciBulan.push(k);
    k = bulanKey(k, -1);
  }
  kunciBulan.reverse(); // urut naik (bulan tertua -> terbaru)

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
  const salinan = SEMUA_TRANSAKSI.slice().sort(function (a, b) {
    const byTgl = String(b.tanggal).localeCompare(String(a.tanggal));
    if (byTgl !== 0) return byTgl;
    return (Number(b.rowIndex) || 0) - (Number(a.rowIndex) || 0);
  }).slice(0, 5);

  if (salinan.length === 0) {
    tampilkanKosong(wadah, '📭',
      'Belum ada transaksi. Klik <strong>＋ Transaksi Baru</strong> untuk memulai pencatatan.');
    return;
  }

  wadah.innerHTML = salinan.map(function (t) {
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
}

/* ---------------- Jalankan ---------------- */
initDashboard();
