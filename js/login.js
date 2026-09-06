/* =========================================================
   login.js — Logika halaman login
   (kredensial diambil dari KONFIG_LOGIN di app.js)
   ========================================================= */
'use strict';

function initLogin() {
  const form = $('#form-login');
  const pesan = $('#pesan-login');

  function tampilPesan(teks) {
    pesan.textContent = teks;
    pesan.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const user = $('#username-login').value.trim();
    const pass = $('#password-login').value;

    if (!user || !pass) {
      tampilPesan('Username dan password wajib diisi.');
      return;
    }

    if (user === KONFIG_LOGIN.username && pass === KONFIG_LOGIN.password) {
      pesan.hidden = true;
      const tombol = $('#tombol-masuk');
      tombol.disabled = true;
      tombol.textContent = 'Memeriksa…';
      buatSesi();
      toast('Selamat datang! 👋');
      setTimeout(function () { location.replace('dashboard.html'); }, 400);
    } else {
      tampilPesan('Username atau password salah. Coba lagi.');
      $('#password-login').value = '';
      $('#password-login').focus();
    }
  });
}

initLogin();
