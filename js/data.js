/* =========================================================
   data.js — Halaman Data Transaksi (filter, cari, edit, hapus)
   ========================================================= */
'use strict';

let TRANSAKSI = [];       // semua data dari server
let DAFTAR_DOMPET = [];   // semua dompet dari server
let filter = { bulan: '', kategori: '', dompet: '', tipe: '', cari: '' };

/* ---------------- Inisialisasi ---------------- */
function pasangListener() {
  $('#cari').addEventListener('input', function (e) { filter.cari = e.target.value.toLowerCase(); render(); });
  $('#filter-bulan').addEventListener('change', function (e) { filter.bulan = e.target.value; render(); });
  $('#filter-kategori').addEventListener('change', function (e) { filter.kategori = e.target.value; render(); });
  $('#filter-dompet').addEventListener('change', function (e) { filter.dompet = e.target.value; render(); });
  $('#filter-tipe').addEventListener('change', function (e) { filter.tipe = e.target.value; render(); });
  muatData();
}

async function muatData() {
  const isi = $('#isi-data');
  tampilkanPemuat(isi);
  try {
    const hasil = await Promise.all([getTransaksi(), getDompet()]);
    TRANSAKSI = hasil[0];
    DAFTAR_DOMPET = hasil[1];
  } catch (err) {
    tampilkanError(isi, err.message, 'Coba Lagi', muatData);
    return;
  }
  bangunPilihanBulan();
  bangunPilihanKategori();
  bangunPilihanDompet();
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
  html += '<option value="Transfer">Transfer</option>';
  el.innerHTML = html;
  el.value = filter.kategori;
}

function bangunPilihanDompet() {
  const el = $('#filter-dompet');
  el.innerHTML = opsiDompetHTML(DAFTAR_DOMPET, filter.dompet, 'Semua Dompet');
}

/* ---------------- Filter & render tabel ---------------- */
function dataTerverifikasi() {
  return TRANSAKSI.filter(function (t) {
    if (filter.bulan && String(t.tanggal || '').slice(0, 7) !== filter.bulan) return false;
    if (filter.kategori && t.kategori !== filter.kategori && !(filter.kategori === 'Transfer' && t.tipe === 'Transfer')) return false;
    if (filter.tipe && t.tipe !== filter.tipe) return false;
    if (filter.dompet && t.dompet !== filter.dompet && t.dompetTujuan !== filter.dompet) return false;
    if (filter.cari) {
      const gabung = String(
        (t.kategori || '') + ' ' + (t.deskripsi || '') + ' ' + (t.dompet || '') + ' ' +
        (t.dompetTujuan || '') + ' ' + (t.tanggal || '') + ' ' + formatRupiah(t.nominal) + ' ' + (t.tipe || '')
      ).toLowerCase();
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
    '<th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th>Dompet</th><th>Nominal</th><th>Tipe</th><th>Aksi</th>' +
    '</tr></thead><tbody>' +
    hasil.map(barisTabel).join('') +
    '</tbody></table></div>';
}

function teksDompet(t) {
  if (t.tipe === 'Transfer') {
    return aman(t.dompet) + ' <span class="panah-transfer">→</span> ' + aman(t.dompetTujuan || '');
  }
  return '<span class="tag-dompet" style="margin-left:0">' + aman(t.dompet) + '</span>';
}

function barisTabel(t) {
  const transfer = t.tipe === 'Transfer';
  const masuk = t.tipe === TIPE_TRANSAKSI.PEMASUKAN;
  const deskripsi = t.deskripsi ? aman(t.deskripsi) : '—';
  const kelasNominal = transfer ? 'nominal-transfer' : (masuk ? 'nominal-plus' : 'nominal-minus');
  const tanda = transfer ? '' : (masuk ? '+' : '−');
  const kelasBadge = transfer ? 'badge-transfer' : (masuk ? 'badge-masuk' : 'badge-keluar');
  const teksBadge = transfer ? 'Transfer' : (masuk ? 'Pemasukan' : 'Pengeluaran');
  const teksKategori = transfer ? '<span class="panah-transfer">⇄</span>' : '<strong>' + aman(t.kategori) + '</strong>';

  return '<tr class="baris" data-row="' + Number(t.rowIndex) + '">' +
    '<td class="td-tanggal">' + formatTanggal(t.tanggal) + '</td>' +
    '<td>' + teksKategori + '</td>' +
    '<td class="td-deskripsi"><div class="utama">' + deskripsi + '</div></td>' +
    '<td class="td-dompet">' + teksDompet(t) + '</td>' +
    '<td class="' + kelasNominal + '">' + tanda + formatRupiah(t.nominal) + '</td>' +
    '<td><span class="badge-tipe ' + kelasBadge + '">' + teksBadge + '</span></td>' +
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
function isiOpsiKategoriModal(sel, tipe, pilih) {
  const daftar = getKategori(tipe === 'Pemasukan' ? 'pemasukan' : 'pengeluaran');
  sel.innerHTML = daftar.map(function (k) {
    return '<option value="' + aman(k) + '"' + (k === pilih ? ' selected' : '') + '>' + aman(k) + '</option>';
  }).join('') || '<option value="">(tidak ada)</option>';
}

function bukaModalEdit(data) {
  const transfer = data.tipe === 'Transfer';
  const tipeAwal = transfer ? 'Transfer' : (data.tipe === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran');
  const kategoriAwal = transfer ? 'Transfer' : data.kategori;

  const lapisan = bukaModal(
    '<div class="modal-judul"><h3>Edit Transaksi</h3>' +
    '<button type="button" class="modal-tutup" data-tutup-modal aria-label="Tutup">✕</button></div>' +
    '<form id="form-edit">' +
    '<div class="form-grup"><label for="m-tanggal">Tanggal</label>' +
    '<input type="date" class="form-kontrol" id="m-tanggal" value="' + aman(data.tanggal) + '" required></div>' +
    '<div class="form-grup"><label for="m-tipe">Tipe</label>' +
    '<select class="form-kontrol" id="m-tipe">' +
    '<option value="Pemasukan"' + (tipeAwal === 'Pemasukan' ? ' selected' : '') + '>Pemasukan</option>' +
    '<option value="Pengeluaran"' + (tipeAwal === 'Pengeluaran' ? ' selected' : '') + '>Pengeluaran</option>' +
    '<option value="Transfer"' + (tipeAwal === 'Transfer' ? ' selected' : '') + '>Transfer</option>' +
    '</select></div>' +
    '<div class="form-grup" id="m-grup-dompet-tunggal"' + (transfer ? ' hidden' : '') + '>' +
    '<label for="m-dompet">Dompet</label>' +
    '<select class="form-kontrol" id="m-dompet"></select></div>' +
    '<div class="form-grup" id="m-grup-transfer"' + (transfer ? '' : ' hidden') + '>' +
    '<label for="m-dompet-asal">Dari Dompet</label>' +
    '<select class="form-kontrol" id="m-dompet-asal"></select>' +
    '<label for="m-dompet-tujuan" style="margin-top:12px">Ke Dompet</label>' +
    '<select class="form-kontrol" id="m-dompet-tujuan"></select></div>' +
    '<div class="form-grup" id="m-grup-kategori"' + (transfer ? ' hidden' : '') + '>' +
    '<label for="m-kategori">Kategori</label>' +
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
  const selDompet = lapisan.querySelector('#m-dompet');
  const selAsal = lapisan.querySelector('#m-dompet-asal');
  const selTujuan = lapisan.querySelector('#m-dompet-tujuan');
  const inputNominal = lapisan.querySelector('#m-nominal');

  function isiDompetTunggal() {
    selDompet.innerHTML = opsiDompetHTML(DAFTAR_DOMPET, data.dompet);
  }
  function isiTransfer() {
    selAsal.innerHTML = opsiDompetHTML(DAFTAR_DOMPET, data.dompet);
    let opsi = '';
    DAFTAR_DOMPET.forEach(function (w) {
      if (w.nama === data.dompet) return;
      opsi += '<option value="' + aman(w.nama) + '"' + (w.nama === data.dompetTujuan ? ' selected' : '') + '>' +
        aman(w.nama) + '</option>';
    });
    selTujuan.innerHTML = opsi || '<option value="">(tidak ada)</option>';
  }
  function perbaruiBidang() {
    const transferBaru = selTipe.value === 'Transfer';
    lapisan.querySelector('#m-grup-dompet-tunggal').hidden = transferBaru;
    lapisan.querySelector('#m-grup-transfer').hidden = !transferBaru;
    lapisan.querySelector('#m-grup-kategori').hidden = transferBaru;
    if (transferBaru) isiTransfer(); else { isiDompetTunggal(); isiOpsiKategoriModal(selKategori, selTipe.value, data.kategori); }
  }

  isiDompetTunggal();
  isiOpsiKategoriModal(selKategori, tipeAwal === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran', kategoriAwal);
  isiTransfer();
  selTipe.addEventListener('change', perbaruiBidang);
  selAsal.addEventListener('change', function () {
    let opsi = '';
    DAFTAR_DOMPET.forEach(function (w) {
      if (w.nama === selAsal.value) return;
      opsi += '<option value="' + aman(w.nama) + '"' + (w.nama === selTujuan.value ? ' selected' : '') + '>' +
        aman(w.nama) + '</option>';
    });
    selTujuan.innerHTML = opsi || '<option value="">(tidak ada)</option>';
  });
  siapkanInputRupiah(inputNominal);

  lapisan.querySelector('#form-edit').addEventListener('submit', async function (e) {
    e.preventDefault();
    const tanggal = lapisan.querySelector('#m-tanggal').value;
    const tipeEdit = selTipe.value;
    const transferEdit = tipeEdit === 'Transfer';
    const dompetEdit = transferEdit ? selAsal.value : selDompet.value;
    const dompetTujuanEdit = transferEdit ? selTujuan.value : '';
    const kategoriEdit = transferEdit ? 'Transfer' : selKategori.value;
    const deskripsiBaru = lapisan.querySelector('#m-deskripsi').value.trim();
    const nominalBaru = nilaiDariInputRupiah(inputNominal);

    if (!tanggal || nominalBaru <= 0) {
      toast('Tanggal dan nominal harus diisi dengan benar.', 'error');
      return;
    }
    if (transferEdit && (!dompetEdit || !dompetTujuanEdit || dompetEdit === dompetTujuanEdit)) {
      toast('Dompet asal & tujuan harus diisi dan tidak boleh sama.', 'error');
      return;
    }
    if (!transferEdit && (!dompetEdit || !kategoriEdit)) {
      toast('Dompet dan kategori wajib diisi.', 'error');
      return;
    }

    const tombol = lapisan.querySelector('#m-simpan');
    tombol.disabled = true;
    tombol.textContent = 'Menyimpan…';
    try {
      await editTransaksi({
        rowIndex: data.rowIndex,
        tanggal: tanggal,
        kategori: kategoriEdit,
        deskripsi: deskripsiBaru,
        nominal: nominalBaru,
        tipe: tipeEdit,
        dompet: dompetEdit,
        dompetTujuan: dompetTujuanEdit
      });
      const idx = TRANSAKSI.findIndex(function (t) { return Number(t.rowIndex) === Number(data.rowIndex); });
      if (idx !== -1) {
        TRANSAKSI[idx] = {
          rowIndex: data.rowIndex, tanggal: tanggal, kategori: kategoriEdit,
          deskripsi: deskripsiBaru, nominal: nominalBaru, tipe: tipeEdit,
          dompet: dompetEdit, dompetTujuan: dompetTujuanEdit
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
