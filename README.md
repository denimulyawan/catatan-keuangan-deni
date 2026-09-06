# 💰 Catatan Keuangan

Aplikasi **catatan keuangan pribadi** berbasis website sederhana (tanpa login, tanpa server sendiri).
Data tersimpan di **Google Sheets**, dihubungkan lewat **Google Apps Script**, dan websitenya di-hosting di **Vercel** (atau GitHub Pages).

![Teknologi: HTML + CSS + Vanilla JS + Chart.js + Google Apps Script](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20Vanilla%20JS%20%2B%20Apps%20Script-green)

---

## ✨ Fitur

| Halaman | Fungsi |
|---|---|
| **Login** | Gerbang masuk dengan username & password (bawaan `admin` / `admin123` — **ubah di `js/app.js` bagian `KONFIG_LOGIN`**) |
| **Dashboard** | **Saldo per dompet**, KPI bulan ini (Pemasukan, Pengeluaran, Saldo), **filter dompet**, pie chart pengeluaran per kategori, line chart tren 6 bulan, transaksi terbaru |
| **Input** | Catat **pemasukan / pengeluaran / transfer antar dompet** (tanggal, dompet, tipe, kategori, deskripsi, nominal) + tambah kategori sendiri + kelola dompet |
| **Data** | Tabel semua transaksi; filter **bulan / kategori / dompet / tipe**, pencarian, edit & hapus |
| **Budget** | Atur budget per kategori per bulan + progress bar dengan peringatan otomatis (>70% kuning, ≥100% merah) |

> 🔐 **Catatan login:** karena aplikasi tanpa server, proteksinya ringan (username/password ada di kode frontend). Cukup untuk menjaga dari orang awam, **bukan** keamanan tingkat tinggi — jangan pakai password penting Anda.

**Dompet / rekening:** Anda bisa punya banyak dompet (Tunai, rekening bank, e-wallet) dengan **Saldo Awal** masing-masing. Transfer antar dompet sendiri **tidak dihitung** sebagai pemasukan/pengeluaran.

**Kategori bawaan:**
- Pemasukan: `Gaji`, `Bonus`
- Pengeluaran: `Makan`, `Transportasi`, `Tagihan`, `Hiburan`, `Pendidikan`, `Orang Tua`
- Kategori tambahan yang Anda buat tersimpan di **browser** (localStorage) — tidak ikut pindah ke perangkat lain.

---

## 📁 Struktur File

```
catatan-keuangan-deni/
├── index.html          → halaman pembuka (otomatis ke Login / Dashboard)
├── login.html          → halaman masuk (username & password)
├── dashboard.html      → saldo dompet + KPI + chart
├── input.html          → form input (pemasukan/pengeluaran/transfer)
├── data.html           → tabel + filter + edit/hapus
├── budget.html         → atur budget bulanan
├── css/
│   └── style.css       → semua gaya (mobile-first, responsif)
├── js/
│   ├── app.js          → 🔐 KONFIG_LOGIN (ganti username/password di sini)
│   ├── login.js        → logika halaman login
│   ├── api.js          → ⚙️ URL Apps Script + semua fungsi fetch
│   ├── dashboard.js
│   ├── input.js
│   ├── data.js
│   └── budget.js
├── apps-script/
│   └── Code.gs         → 🧩 backend: salin isinya ke Google Apps Script
├── vercel.json
├── .gitignore
└── README.md
```

---

## 🚀 Cara Pasang (lakukan sekali saja)

### Bagian 1 — Google Sheets & Apps Script

1. Buat Google Sheet baru (lewat [sheets.new](https://sheets.new)).
2. Pastikan ada sheet (tab): **`Transaksi`**, **`Budget`**, dan **`Dompet`**.
   (Backend membuatkannya otomatis bila belum ada.)
3. Urutan kolom yang dipakai aplikasi (baris 1 = header, jangan diubah urutannya):

   **Sheet `Transaksi`** (7 kolom):
   ```
   Tanggal | Kategori | Deskripsi | Nominal | Tipe | Dompet | Dompet Tujuan
   ```
   - `Tanggal` format `2025-01-05` · `Nominal` angka polos tanpa Rp/titik
   - `Tipe`: `Pemasukan` / `Pengeluaran` / `Transfer`
   - `Dompet` = asal uang · `Dompet Tujuan` hanya dipakai saat tipe `Transfer`

   **Sheet `Budget`** (3 kolom):
   ```
   Bulan | Kategori | Anggaran
   ```
   - `Bulan` format `2025-01`

   **Sheet `Dompet`** (2 kolom):
   ```
   Nama | Saldo Awal
   ```
   - Baris 2 dst diisi otomatis lewat menu **Kelola Dompet** di aplikasi.
   - Saldo awal = uang yang sudah ada di dompet itu sebelum mulai mencatat.

4. Di Google Sheet: menu **Ekstensi → Apps Script**.
5. **Hapus semua kode** di editor, lalu **tempel seluruh isi file `apps-script/Code.gs`** dari repo ini.
6. Klik **💾 Simpan**, lalu **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** (URL `/exec` tetap sama).
   - Kalau belum ada deployment sama sekali: **Deploy → New deployment → Web app**, *Execute as*: `Me`, *Who has access*: `Anyone`.
7. Salin URL Web app (diakhiri `/exec`) → pastikan sama dengan `API_URL` di `js/api.js`.

> 💡 **Tes cepat:** buka URL `/exec` di browser → harus muncul teks
> *"Catatan Keuangan API aktif. Kirim permintaan dengan metode POST."*

### Bagian 2 — Isi URL di api.js

Buka **`js/api.js`**, pastikan baris ini memakai URL `/exec` Anda:

```js
const API_URL = 'https://script.google.com/macros/s/XXXXXX/exec';
```

### Bagian 3 — Upload ke Vercel

1. Buat repository baru di [github.com/new](https://github.com/new) (boleh **Private**).
2. Upload **semua isi folder** `catatan-keuangan-deni/` ke repo (file `index.html` di **root repo**).
3. Buka [vercel.com/new](https://vercel.com/new), **import** repository → **Deploy**.
4. Setiap perubahan kode: `git add -A && git commit -m "..." && git push origin main` → Vercel otomatis build ulang.

---

## 🧪 Cara Mencoba / Tes

1. Buka **Input** → tipe **Pengeluaran** → pilih dompet (mis. `Tunai`) → kategori `Makan`, nominal `50000` → Simpan. Ulangi beberapa kali + satu Pemasukan.
2. **Kelola dompet** (tombol ⚙️ di Dashboard / Input): tambah `BCA`, `OVO`, isi saldo awalnya.
3. Catat **Transfer** dari `BCA` → `OVO` — cek saldo kedua dompet berubah tanpa memengaruhi KPI pemasukan/pengeluaran.
4. Cek **Dashboard** (saldo per dompet + KPI + chart) dan **Budget**.

> ⏳ Panggilan pertama ke Apps Script kadang butuh **20–40 detik** (server "tidur"). Kalau error pertama kali, muat ulang halaman.

---

## 🔄 Cara Update Kode Backend (penting saat fitur baru)

Setelah Anda menarik versi terbaru `apps-script/Code.gs`:
1. Buka Google Sheet → **Ekstensi → Apps Script** → ganti seluruh kode dengan isi file terbaru.
2. **💾 Simpan** → **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
3. Muat ulang website (Ctrl+F5).

Fungsi `pastikanStruktur` di backend otomatis: membuat sheet `Dompet`, menambah kolom `Dompet` & `Dompet Tujuan`, dan **memindahkan transaksi lama ke dompet `Tunai`** (data aman, tidak ada yang hilang).

---

## ❓ Pertanyaan yang Sering Muncul

**Bagaimana cara ganti username / password?**
Buka `js/app.js`, cari bagian **`KONFIG_LOGIN`** (di bagian atas file), lalu ubah baris:
```js
username: 'admin',    // ← ganti username Anda
password: 'admin123', // ← ganti password Anda
```
Simpan, lalu push ke GitHub (`git add -A && git commit -m "ganti password" && git push origin main`).

**Lupa harus masuk terus tiap buka?**
Secara bawaan setelah login Anda "diingat" selama 7 hari (atur lewat `sesiHari` di `KONFIG_LOGIN`). Klik tombol **Keluar** di pojok kanan atas untuk keluar.

**Apakah login ini aman?**
Ini proteksi ringan sisi website tanpa server — username/password tersimpan di kode yang bisa dibaca lewat DevTools browser. Jangan memakai password penting/email Anda.

**Transaksi lama saya ke mana?**
Tetap ada — otomatis tercatat ke dompet **`Tunai`**. Ubah lewat halaman Data → tombol Edit jika ingin pindah dompet.

**Hapus dompet tidak bisa?**
Dompet yang masih dipakai transaksi tidak bisa dihapus (demi keutuhan data). Ubah/hapus transaksinya dulu, atau ganti dompet transaksi via Edit.

**Data tidak muncul / ada error merah?**
1. Pastikan URL di `js/api.js` persis URL `/exec` Anda.
2. Buka URL `/exec` di browser — harus muncul "API aktif".
3. Setelah ganti kode Apps Script: **Manage deployments → Edit → New version → Deploy**.
4. Muat ulang halaman website (Ctrl+F5).

**Edit/hapus salah baris?**
Aplikasi memakai nomor baris asli di spreadsheet. Jangan menyisipkan/menghapus baris manual di spreadsheet saat aplikasi dipakai.

**Apakah ada batasan?**
Google Apps Script gratis punya kuota harian (ribuan panggilan/hari) — sangat cukup untuk catatan pribadi.

---

Dibuat dengan 💚 — semoga keuangannya makin sehat!
