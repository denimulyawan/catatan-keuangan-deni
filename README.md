# 💰 Catatan Keuangan

Aplikasi **catatan keuangan pribadi** berbasis website sederhana (tanpa login, tanpa server sendiri).
Data tersimpan di **Google Sheets**, dihubungkan lewat **Google Apps Script**, dan websitenya di-hosting di **Vercel** (atau GitHub Pages).

![Teknologi: HTML + CSS + Vanilla JS + Chart.js + Google Apps Script](https://img.shields.io/badge/stack-HTML%20%2B%20CSS%20%2B%20Vanilla%20JS%20%2B%20Apps%20Script-green)

---

## ✨ Fitur

| Halaman | Fungsi |
|---|---|
| **Dashboard** | KPI bulan ini (Pemasukan, Pengeluaran, Saldo), pie chart pengeluaran per kategori, line chart tren 6 bulan, transaksi terbaru |
| **Input** | Catat transaksi (tanggal, tipe, kategori, deskripsi, nominal) + tambah kategori sendiri |
| **Data** | Tabel semua transaksi; filter bulan/kategori/tipe, pencarian, edit & hapus |
| **Budget** | Atur budget per kategori per bulan + progress bar dengan peringatan otomatis (>70% kuning, ≥100% merah) |

**Kategori bawaan:**
- Pemasukan: `Gaji`, `Bonus`
- Pengeluaran: `Makan`, `Transportasi`, `Tagihan`, `Hiburan`, `Pendidikan`, `Orang Tua`
- Kategori tambahan yang Anda buat di halaman Input tersimpan di **browser** (localStorage). Artinya: kategori tambahan tidak ikut pindah kalau Anda buka dari HP/komputer lain.

---

## 📁 Struktur File

```
catatan-keuangan-deni/
├── index.html          → halaman pembuka (otomatis ke Dashboard)
├── dashboard.html      → KPI + chart
├── input.html          → form input transaksi
├── data.html           → tabel + filter + edit/hapus
├── budget.html         → atur budget bulanan
├── css/
│   └── style.css       → semua gaya (mobile-first, responsif)
├── js/
│   ├── app.js          → utilitas bersama (kategori, format Rp, navigasi, modal, toast)
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

Ada 3 bagian: **(1)** Google Sheets + Apps Script, **(2)** isi URL di `api.js`, **(3)** upload ke Vercel.

### Bagian 1 — Google Sheets & Apps Script

1. Buat Google Sheet baru (lewat [sheets.new](https://sheets.new)).
2. Buat **2 sheet** (tab di bawah): satu bernama **`Transaksi`**, satu bernama **`Budget`**.
3. Isi **baris pertama (header)** persis seperti ini dan **jangan ubah urutan kolom**:

   **Sheet `Transaksi`** (5 kolom):
   ```
   Tanggal   | Kategori | Deskripsi | Nominal | Tipe
   ```
   - `Tanggal` diisi format `2025-01-05`
   - `Nominal` angka biasa (mis. `50000` — tanpa "Rp" dan tanpa titik)
   - `Tipe` isinya `Pemasukan` atau `Pengeluaran`

   **Sheet `Budget`** (3 kolom):
   ```
   Bulan     | Kategori | Anggaran
   ```
   - `Bulan` format `2025-01`

   > Baris 2 dan seterusnya boleh kosong dulu — nanti diisi otomatis oleh aplikasi. (Kalau header belum ada, backend juga akan membuatkannya otomatis.)

4. Di Google Sheet: menu **Ekstensi → Apps Script**.
5. **Hapus semua kode** di editor, lalu **tempel seluruh isi file `apps-script/Code.gs`** dari repo ini.
6. Klik **💾 Simpan**, lalu klik **Deploy → New deployment**.
7. Pilih jenis **Web app**, lalu atur:
   - **Execute as:** `Me` (akun Anda)
   - **Who has access:** `Anyone`
8. Klik **Deploy**, ikuti proses izin (pilih akun → **Allow**).
9. Salin **URL Web app** yang muncul (diakhiri `/exec`). Contoh:
   `https://script.google.com/macros/s/XXXXXX/exec`

### Bagian 2 — Isi URL di api.js

Buka **`js/api.js`**, pastikan baris ini memakai URL `/exec` Anda:

```js
const API_URL = 'https://script.google.com/macros/s/XXXXXX/exec';
```

> File sudah diisi URL Anda. Ganti **hanya jika** URL berubah saat Anda deploy ulang.
>
> 💡 **Tes cepat:** buka URL `/exec` di browser → harus muncul teks
> *"Catatan Keuangan API aktif. Kirim permintaan dengan metode POST."*

### Bagian 3 — Upload ke Vercel

1. Buat repository baru di [github.com/new](https://github.com/new) (boleh **Private**).
2. Upload **semua isi folder** `catatan-keuangan-deni/` ke repo (file `index.html` harus **di root repo**, bukan di sub-folder).
3. Buka [vercel.com/new](https://vercel.com/new), **import** repository tersebut.
4. Vercel mendeteksi situs statis otomatis (tidak perlu isi Build Command).
5. Klik **Deploy**. Selesai! 🎉 Website bisa dibuka dari HP melalui URL Vercel Anda.

> Setelah menambahkan aplikasi ke Home Screen di HP, rasanya seperti aplikasi biasa.

---

## 🧪 Cara Mencoba / Tes

Setelah semua terpasang:

1. Buka website Anda.
2. Halaman **Input** → pilih tipe **Pengeluaran**, kategori **Makan**, nominal **50000**, klik **Simpan Transaksi**.
3. Ulangi beberapa kali dengan kategori lain dan satu **Pemasukan** (mis. Gaji).
4. Buka **Dashboard** → KPI, pie chart, dan line chart terisi.
5. Buka **Budget** → set anggaran kecil (mis. Makan = 30000) lalu simpan; kalau pengeluaran Makan sudah melewati 70% muncul peringatan kuning, ≥100% jadi merah.

> ⏳ Catatan: panggilan pertama ke Apps Script kadang butuh **20–40 detik** (server "tidur"). Kalau pertama kali muncul error, cukup **muat ulang halaman** — berikutnya akan cepat.

---

## ❓ Pertanyaan yang Sering Muncul

**Data tidak muncul / ada error merah di halaman?**
1. Pastikan URL di `js/api.js` persis URL `/exec` milik Anda.
2. Buka URL tersebut di browser — kalau tidak muncul teks "API aktif", berarti deployment belum benar (periksa: *Execute as: Me*, *Who has access: Anyone*).
3. Setelah mengubah kode Apps Script, buka **Deploy → Manage deployments → Edit ✏️ → Version: New version → Deploy**, supaya versi terbaru yang aktif.
4. Tunggu beberapa detik lalu muat ulang halaman website.

**Header sheet saya sudah terisi sebelumnya, tapi format kolom beda?**
Urutan kolom **wajib** sesuai tabel di atas (Tanggal/Kategori/Deskripsi/Nominal/Tipe). Isi header bisa disesuaikan teksnya, yang penting urutannya sama.

**Edit/hapus salah baris?**
Setiap baris transaksi punya nomor baris asli di spreadsheet; aplikasi memakai nomor itu. Jangan menyisipkan/menghapus baris manual di spreadsheet saat aplikasi sedang dipakai.

**Kategori tambahan hilang saat buka dari perangkat lain?**
Ya — kategori tambahan tersimpan di browser (tanpa login memang begitu). Cukup tambahkan lagi sekali di perangkat tersebut, atau gunakan kategori bawaan.

**Apakah ada batasan?**
Google Apps Script gratis punya kuota harian (umumnya ribuan panggilan/hari) — sangat cukup untuk catatan pribadi.

---

Dibuat dengan 💚 — semoga keuangannya makin sehat!
