/* =========================================================
   budget.js — Halaman Budget Bulanan
   (set budget per kategori per bulan + progress bar + alert)
   ========================================================= */
'use strict';

let SEMUA_BUDGET = [];     // { rowIndex, bulan, kategori, anggaran }
let SEMUA_TRANSAKSI_B = []; // transaksi (untuk hitung realisasi)
let bulanBudget = bulanHariIniKey();
let urutBulanBudget = [];

/* ---------------- Inisialisasi ---------------- */
async function initBudget() {
  const wadah = $('#pilih-bulan');
  const daftar = $('#daftar-budget');

  tampilkanPemuat(daftar);
  try {
    const hasil = await Promise.all([getBudget(), getTransaksi()]);
    SEMUA_BUDGET = hasil[0];
    SEMUA_TRANSAKSI_B = hasil[1];
  } catch (err) {
    tampilkanError(daftar, err.message, 'Coba Lagi', initBudget);
    return;
  }

  // Bulan yang tersedia: dari budget + transaksi + bulan berjalan
  const set = {};
  set[bulanHariIniKey()] = true;
  SEMUA_BUDGET.forEach(function (b) { if (b.bulan) set[b.bulan] = true; });
  SEMUA_TRANSAKSI_B.forEach(function (t) { const k = String(t.tanggal || '').slice(0, 7); if (k) set[k] = true; });
  urutBulanBudget = Object.keys(set).sort().reverse();
  if (urutBulanBudget.indexOf(bulanBudget) === -1) bulanBudget = urutBulanBudget[0];

  wadah.innerHTML =
    '<button type="button" class="tombol-bulan" id="bulan-mundur" aria-label="Bulan sebelumnya">‹</button>' +
    '<span class="label-bulan" id="label-bulan"></span>' +
    '<button type="button" class="tombol-bulan" id="bulan-maju" aria-label="Bulan berikutnya">›</button>';

  $('#bulan-mundur').addEventListener('click', function () {
    const pos = urutBulanBudget.indexOf(bulanBudget);
    if (pos < urutBulanBudget.length - 1) { bulanBudget = urutBulanBudget[pos + 1]; renderBudget(); }
  });
  $('#bulan-maju').addEventListener('click', function () {
    const pos = urutBulanBudget.indexOf(bulanBudget);
    if (pos > 0) { bulanBudget = urutBulanBudget[pos - 1]; renderBudget(); }
  });

  renderBudget();
}

/* ---------------- Data bantu ---------------- */
function budgetUntuk(bulanKey, kategori) {
  return SEMUA_BUDGET.find(function (b) {
    return b.bulan === bulanKey && b.kategori === kategori;
  });
}

function realisasiPerKategori(bulanKey) {
  const peta = {};
  SEMUA_TRANSAKSI_B.forEach(function (t) {
    if (t.tipe !== TIPE_TRANSAKSI.PENGELUARAN) return;
    if (String(t.tanggal || '').slice(0, 7) !== bulanKey) return;
    peta[t.kategori] = (peta[t.kategori] || 0) + (Number(t.nominal) || 0);
  });
  return peta;
}

function updateBudgetLokal(data, rowIndexBaru) {
  const lama = budgetUntuk(data.bulan, data.kategori);
  if (lama) {
    lama.anggaran = data.anggaran;
    if (rowIndexBaru) lama.rowIndex = rowIndexBaru;
  } else {
    SEMUA_BUDGET.push({
      rowIndex: rowIndexBaru || null,
      bulan: data.bulan,
      kategori: data.kategori,
      anggaran: data.anggaran
    });
  }
}

/* ---------------- Render ---------------- */
function renderBudget() {
  const realisasi = realisasiPerKategori(bulanBudget);
  const kategoriDipakai = getKategori('pengeluaran');

  // Ringkasan
  let totalAnggaran = 0;
  kategoriDipakai.forEach(function (k) {
    const b = budgetUntuk(bulanBudget, k);
    if (b && Number(b.anggaran) > 0) totalAnggaran += Number(b.anggaran);
  });
  let totalKeluar = 0;
  Object.keys(realisasi).forEach(function (k) { totalKeluar += realisasi[k]; });
  const sisa = totalAnggaran - totalKeluar;

  $('#label-bulan').textContent = labelBulan(bulanBudget);
  const pos = urutBulanBudget.indexOf(bulanBudget);
  $('#bulan-mundur').disabled = pos >= urutBulanBudget.length - 1;
  $('#bulan-maju').disabled = pos <= 0;
  $('#keterangan-budget').textContent = 'Pengeluaran aktual dihitung otomatis dari transaksi';

  $('#ringkasan-budget').innerHTML =
    kpiBudget('Total Anggaran', formatRupiah(totalAnggaran), 'nilai-biru', 'Batas pengeluaran bulan ini') +
    kpiBudget('Sudah Terpakai', formatRupiah(totalKeluar), totalKeluar > totalAnggaran ? 'nilai-merah' : 'nilai-hijau', 'Total pengeluaran bulan ini') +
    kpiBudget('Sisa Anggaran', formatRupiah(sisa), sisa >= 0 ? 'nilai-primer' : 'nilai-merah',
      sisa >= 0 ? 'Masih bisa dipakai' : 'Sudah melebihi anggaran');

  // Daftar per kategori
  const wadah = $('#daftar-budget');
  if (kategoriDipakai.length === 0) {
    tampilkanKosong(wadah, '🏷️', 'Belum ada kategori pengeluaran.');
    return;
  }

  wadah.innerHTML = kategoriDipakai.map(function (kategori) {
    const b = budgetUntuk(bulanBudget, kategori);
    const anggaran = b ? Number(b.anggaran) || 0 : 0;
    const terpakai = realisasi[kategori] || 0;

    const persen = anggaran > 0 ? Math.round((terpakai / anggaran) * 100) : 0;
    const lebarBar = anggaran > 0 ? Math.min(persen, 100) : 0;
    const kelasBar = anggaran === 0 ? '' : (persen >= 100 ? 'over' : (persen > 70 ? 'warning' : ''));
    const kelasPil = anggaran === 0 ? 'pil-normal' : (persen >= 100 ? 'pil-over' : (persen > 70 ? 'pil-warning' : 'pil-normal'));
    const teksPil = anggaran === 0
      ? 'Belum diatur'
      : (persen >= 100 ? '⚠️ Over budget (' + persen + '%)'
        : (persen > 70 ? '⚠️ Peringatan (' + persen + '%)' : 'Aman (' + persen + '%)'));

    const bagianBar = anggaran > 0
      ? '<div class="budget-tengah"><div class="bar-lacak"><div class="bar-isi ' + kelasBar + '" style="width:' + lebarBar + '%"></div></div></div>' +
        '<div class="budget-angka">Terpakai ' + formatRupiah(terpakai) + ' dari ' + formatRupiah(anggaran) +
        (anggaran > 0 ? ' · Sisa ' + formatRupiah(Math.max(anggaran - terpakai, 0)) : '') + '</div>'
      : (terpakai > 0
        ? '<div class="budget-angka" style="margin-top:8px">Sudah terpakai ' + formatRupiah(terpakai) +
          ' tanpa anggaran. Atur anggaran di atas agar muncul peringatan.</div>'
        : '');

    return '<div class="baris-budget" data-kategori="' + aman(kategori) + '">' +
      '<div class="budget-atas">' +
      '<span class="budget-nama">' + aman(kategori) + '</span>' +
      '<span class="pil-status ' + kelasPil + '">' + teksPil + '</span>' +
      '<span class="budget-input"><span class="grup-prefix">Rp</span>' +
      '<input type="text" inputmode="numeric" class="input-anggaran" value="' +
      (anggaran > 0 ? formatAngka(anggaran) : '') + '" placeholder="0" aria-label="Anggaran ' + aman(kategori) + '"></span>' +
      '<button type="button" class="btn btn-primer btn-kecil tombol-simpan-budget" disabled>Simpan</button>' +
      '</div>' +
      bagianBar +
      '</div>';
  }).join('');

  // Aktifkan input ribuan + deteksi perubahan + tombol simpan per baris
  wadah.querySelectorAll('.baris-budget').forEach(function (baris) {
    const kategori = baris.dataset.kategori;
    const input = baris.querySelector('.input-anggaran');
    const tombol = baris.querySelector('.tombol-simpan-budget');

    siapkanInputRupiah(input);
    input.addEventListener('input', function () {
      tombol.disabled = false;
    });
    tombol.addEventListener('click', async function () {
      const nominal = nilaiDariInputRupiah(input);
      tombol.disabled = true;
      tombol.textContent = '…';
      try {
        const respon = await setBudget({ bulan: bulanBudget, kategori: kategori, anggaran: nominal });
        updateBudgetLokal({ bulan: bulanBudget, kategori: kategori, anggaran: nominal },
          respon && respon.rowIndex ? respon.rowIndex : null);
        toast('Budget "' + kategori + '" disimpan ✅');
      } catch (err) {
        toast(err.message, 'error');
        tombol.disabled = false;
      }
      tombol.textContent = 'Simpan';
      renderBudget();
    });
  });
}

function kpiBudget(label, nilai, warna, sub) {
  return '<div class="card kpi"><div class="kpi-label">' + aman(label) + '</div>' +
    '<div class="kpi-nilai ' + warna + '">' + aman(nilai) + '</div>' +
    '<div class="kpi-sub">' + aman(sub) + '</div></div>';
}

/* ---------------- Jalankan ---------------- */
initBudget();
