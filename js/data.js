/* =========================================================
   data.js — Halaman Data Transaksi (filter, cari, edit, hapus)
   ========================================================= */
'use strict';

let TRANSAKSI = [];      // semua data dari server
let filter = { bulan: '', kategori: '', tipe: '', cari: '' };

/* ---------------- Inisialisasi ---------------- */
function pasangListener() {
  $('#cari').addEventListener('input', function (e) { filter.cari = e.target.value.toLowerCase(); render(); });
  $('#filter-bulan').addEventListener('change', function (e) { filter.bulan = e.target.value; render(); });
  $('#filter-kategori').addEventListener('change', function (e) { filter.kategori = e.target.value; render(); });
  $('#filter-tipe').addEventListener('change', function (e) { filter.tipe = e.target.value; render(); });
  muatData();
}

async function muatData() {
  const isi = $('#isi-data');
  tampilkanPemuat(isi);
  try {
    TRANSAKSI = await getTransaksi();
  } catch (err) {
    tampilkanError(isi, err.message, 'Coba Lagi', muatData);
    return;
  }
  bangunPilihanBulan();
  bangunPilihanKategori();
  render();
}

/* ---------------- Pilihan filter ---------------- */
function bangunPilihanBulan() {
  const set = {};
  TRANSAKSI.forEach(function (t) { const k = String(t.tanggal || '').slice(0, 7); if (k) set[k] = true; });
  const daftar = Object.keys(set).sort().reverse();
  const el = $('#filter-bulan');
  let html = '<option value="">Semua Bulan</option>';
  daftar.forEach(function (k) { html += '<option value="' + k + '">' + labelBulan(k) + '</option>'; });
  el.innerHTML = html;
  el.value = filter.bulan;
}

function bangunPilihanKategori() {
  const el = $('#filter-kategori');
  let html = '<option value="">Semua Kategori</option>';
  daftarSemuaKategori().forEach(function (k) {
    html += '<option value="' + aman(k) + '">' + aman(k) + '</option>';
  });
  el.innerHTML = html;
  el.value = filter.kategori;
}

/* ---------------- Filter & render tabel ---------------- */
function dataTerverifikasi() {
  return TRANSAKSI.filter(function (t) {
    if (filter.bulan && String(t.tanggal || '').slice(0, 7) !== filter.bulan) return false;
    if (filter.kategori && t.kategori !== filter.kategori) return false;
    if (filter.tipe && t.tipe !== filter.tipe) return false;
    if (filter.cari) {
      const gabung = String(t.kategori + ' ' + (t.deskripsi || '') + ' ' + (t.tanggal || '') + ' ' + formatRupiah(t.nominal)).toLowerCase();
      if (gabung.indexOf(filter.cari) === -1) return false;
    }
    return true;
  }).sort(function (a, b) {
    const byTgl = String(b.tanggal).localeCompare(String(a.tanggal));
    if (byTgl !== 0) return byTgl;
    return (Number(b.rowIndex) || 0) - (Number(a.rowIndex) || 0);
  });
}

function render() {
  const hasil = dataTerverifikasi();
  $('#info-jumlah').textContent =
    'Menampilkan ' + hasil.length + ' dari ' + TRANSAKSI.length + ' transaksi';

  const isi = $('#isi-data');

  if (TRANSAKSI.length === 0) {
    tampilkanKosong(isi, '📭',
      'Belum ada transaksi. <a class="link" href="input.html">Catat transaksi pertama</a> agar muncul di sini.');
    return;
  }
  if (hasil.length === 0) {
    tampilkanKosong(isi, '🔍', 'Tidak ada transaksi yang cocok dengan filter Anda.');
    return;
  }

  isi.innerHTML =
    '<div class="tabel-wrap"><table>' +
    '<thead><tr>' +
    '<th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Nominal</th><th>Tipe</th><th>Aksi</th>' +
    '</tr></thead><tbody>' +
    hasil.map(barisTabel).join('') +
    '</tbody></table></div>';
}

function barisTabel(t) {
  const masuk = t.tipe === TIPE_TRANSAKSI.PEMASUKAN;
  const deskripsi = t.deskripsi
    ? '<div class="utama">' + aman(t.deskripsi) + '</div>'
    : '<div class="utama">—</div>';
  return '<tr class="baris" data-row="' + Number(t.rowIndex) + '">' +
    '<td class="td-tanggal">' + formatTanggal(t.tanggal) + '</td>' +
    '<td><strong>' + aman(t.kategori) + '</strong></td>' +
    '<td class="td-deskripsi">' + deskripsi + '</td>' +
    '<td class="' + (masuk ? 'nominal-plus' : 'nominal-minus') + '">' + (masuk ? '+' : '−') + formatRupiah(t.nominal) + '</td>' +
    '<td><span class="badge-tipe ' + (masuk ? 'badge-masuk' : 'badge-keluar') + '">' + (masuk ? 'Pemasukan' : 'Pengeluaran') + '</span></td>' +
    '<td class="aksi-sel">' +
    '<button type="button" class="btn-ikon" data-aksi="edit">✏️ Edit</button> ' +
    '<button type="button" class="btn-ikon btn-hapus" data-aksi="hapus">🗑 Hapus</button>' +
    '</td></tr>';
}

/* ---------------- Aksi baris (event delegation) ---------------- */
function pasangAksiBaris() {
  const isi = $('#isi-data');
  isi.addEventListener('click', function (e) {
    const tombol = e.target.closest('[data-aksi]');
    if (!tombol) return;
    const tr = tombol.closest('tr[data-row]');
    if (!tr) return;
    const rowIndex = Number(tr.dataset.row);
    const data = TRANSAKSI.find(function (t) { return Number(t.rowIndex) === rowIndex; });
    if (!data) return;

    if (tombol.dataset.aksi === 'hapus') {
      hapusBaris(data);
    } else if (tombol.dataset.aksi === 'edit') {
      bukaModalEdit(data);
    }
  });
}

/* ---------------- Hapus ---------------- */
async function hapusBaris(data) {
  const ya = await konfirmasi({
    judul: 'Hapus Transaksi?',
    pesan: 'Transaksi "' + data.kategori + (data.deskripsi ? ' · ' + data.deskripsi : '') +
      '" sebesar ' + formatRupiah(data.nominal) + ' akan dihapus permanen dari Google Sheets.',
    tombol: 'Ya, Hapus'
  });
  if (!ya) return;

  try {
    await hapusTransaksi(data.rowIndex);
    TRANSAKSI = TRANSAKSI.filter(function (t) { return Number(t.rowIndex) !== Number(data.rowIndex); });
    bangunPilihanBulan();
    render();
    toast('Transaksi dihapus 🗑');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ---------------- Edit (modal) ---------------- */
function bukaModalEdit(data) {
  const tipeModal = data.tipe === TIPE_TRANSAKSI.PEMASUKAN ? 'Pemasukan' : 'Pengeluaran';
  const kategori = getKategori(tipeModal === 'Pemasukan' ? 'pemasukan' : 'pengeluaran')
    .map(function (k) {
      return '<option value="' + aman(k) + '"' + (k === data.kategori ? ' selected' : '') + '>' + aman(k) + '</option>';
    }).join('');

  const lapisan = bukaModal(
    '<div class="modal-judul"><h3>Edit Transaksi</h3>' +
    '<button type="button" class="modal-tutup" data-tutup-modal aria-label="Tutup">✕</button></div>' +
    '<form id="form-edit">' +
    '<div class="form-grup"><label for="m-tanggal">Tanggal</label>' +
    '<input type="date" class="form-kontrol" id="m-tanggal" value="' + aman(data.tanggal) + '" required></div>' +
    '<div class="form-grup"><label for="m-tipe">Tipe</label>' +
    '<select class="form-kontrol" id="m-tipe">' +
    '<option value="Pemasukan"' + (tipeModal === 'Pemasukan' ? ' selected' : '') + '>Pemasukan</option>' +
    '<option value="Pengeluaran"' + (tipeModal === 'Pengeluaran' ? ' selected' : '') + '>Pengeluaran</option>' +
    '</select></div>' +
    '<div class="form-grup"><label for="m-kategori">Kategori</label>' +
    '<select class="form-kontrol" id="m-kategori"></select></div>' +
    '<div class="form-grup"><label for="m-deskripsi">Deskripsi <span class="opsional">(opsional)</span></label>' +
    '<input type="text" class="form-kontrol" id="m-deskripsi" value="' + aman(data.deskripsi || '') + '" maxlength="100"></div>' +
    '<div class="form-grup"><label for="m-nominal">Nominal (Rp)</label>' +
    '<input type="text" class="form-kontrol" id="m-nominal" inputmode="numeric" value="' +
    formatAngka(Number(data.nominal) || 0) + '"></div>' +
    '<div class="modal-aksi">' +
    '<button type="button" class="btn btn-abu" data-tutup-modal>Batal</button>' +
    '<button type="submit" class="btn btn-primer" id="m-simpan">Simpan Perubahan</button>' +
    '</div></form>'
  );

  const selTipe = lapisan.querySelector('#m-tipe');
  const selKategori = lapisan.querySelector('#m-kategori');
  const inputNominal = lapisan.querySelector('#m-nominal');

  function isiKategori() {
    const tipeKunci = selTipe.value === 'Pemasukan' ? 'pemasukan' : 'pengeluaran';
    selKategori.innerHTML = getKategori(tipeKunci).map(function (k) {
      return '<option value="' + aman(k) + '"' + (k === data.kategori ? ' selected' : '') + '>' + aman(k) + '</option>';
    }).join('');
  }
  isiKategori();
  selTipe.addEventListener('change', isiKategori);
  siapkanInputRupiah(inputNominal);

  lapisan.querySelector('#form-edit').addEventListener('submit', async function (e) {
    e.preventDefault();
    const tanggal = lapisan.querySelector('#m-tanggal').value;
    const kategoriBaru = selKategori.value;
    const deskripsiBaru = lapisan.querySelector('#m-deskripsi').value.trim();
    const nominalBaru = nilaiDariInputRupiah(inputNominal);

    if (!tanggal || !kategoriBaru || nominalBaru <= 0) {
      toast('Tanggal, kategori, dan nominal harus diisi dengan benar.', 'error');
      return;
    }

    const tombol = lapisan.querySelector('#m-simpan');
    tombol.disabled = true;
    tombol.textContent = 'Menyimpan…';
    try {
      await editTransaksi({
        rowIndex: data.rowIndex,
        tanggal: tanggal,
        kategori: kategoriBaru,
        deskripsi: deskripsiBaru,
        nominal: nominalBaru,
        tipe: selTipe.value
      });
      // Perbarui data lokal
      const idx = TRANSAKSI.findIndex(function (t) { return Number(t.rowIndex) === Number(data.rowIndex); });
      if (idx !== -1) {
        TRANSAKSI[idx] = {
          rowIndex: data.rowIndex, tanggal: tanggal, kategori: kategoriBaru,
          deskripsi: deskripsiBaru, nominal: nominalBaru, tipe: selTipe.value
        };
      }
      tutupModal();
      render();
      toast('Transaksi diperbarui ✅');
    } catch (err) {
      toast(err.message, 'error');
      tombol.disabled = false;
      tombol.textContent = 'Simpan Perubahan';
    }
  });
}

/* ---------------- Jalankan ---------------- */
pasangListener();
pasangAksiBaris();
