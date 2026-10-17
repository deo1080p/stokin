# StokIn — Manajemen Stok Barang

Aplikasi web inventaris berbasis HTML, CSS, JavaScript, dan localStorage.

## Fitur
- Dashboard ringkasan inventaris
- CRUD data barang
- Pencarian dan filter kategori/status
- Status tersedia, menipis, dan habis
- Transaksi barang masuk/keluar
- Riwayat transaksi
- Ekspor data barang dan riwayat ke CSV
- Tampilan responsif untuk HP dan desktop

## Menjalankan secara lokal
1. Ekstrak ZIP.
2. Buka folder `stokin`.
3. Buka `index.html` di browser, atau gunakan Live Server di VS Code.

## Deploy ke GitHub Pages
1. Buat repository GitHub baru, misalnya `stokin`.
2. Unggah `index.html`, `style.css`, dan `script.js` ke root repository.
3. Buka **Settings → Pages**.
4. Di bagian **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`, lalu tekan **Save**.
6. Tunggu beberapa menit. URL biasanya berbentuk `https://USERNAME.github.io/stokin/`.

## Catatan penting
- Data disimpan di localStorage browser/perangkat yang digunakan. Data tidak tersinkron ke perangkat lain.
- Jangan menghapus data browser jika ingin mempertahankan data lokal. Ekspor CSV secara berkala sebagai cadangan.
- Aplikasi ini tidak memiliki login, server, atau database bersama.
