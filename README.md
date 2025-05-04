# Money Tracker React App

A simple web application built with React and TypeScript to track personal income and expenses.

## Deskripsi

Aplikasi ini memungkinkan pengguna untuk mencatat transaksi keuangan mereka, baik pemasukan maupun pengeluaran. Pengguna dapat mendaftar, login, menambah, mengedit, dan menghapus transaksi. Aplikasi ini juga menyediakan ringkasan keuangan, kemampuan untuk memfilter transaksi berdasarkan tag, dan fitur peralihan tema (terang/gelap).

## Fitur Utama

- **Autentikasi Pengguna:** Sistem pendaftaran dan login pengguna. Sesi pengguna disimpan di `localStorage`.
- **Manajemen Transaksi:**
  - Menambah transaksi baru (pemasukan atau pengeluaran).
  - Mengedit transaksi yang sudah ada.
  - Menghapus transaksi.
  - Input meliputi: Jenis (Pemasukan/Pengeluaran), Jumlah, Judul (opsional), Deskripsi (opsional), Tag (opsional, dipisahkan koma).
- **Ringkasan Keuangan:** Menampilkan total pemasukan, total pengeluaran, dan saldo keseluruhan.
- **Filter Berdasarkan Tag:** Memfilter daftar riwayat transaksi berdasarkan tag yang dipilih. Menampilkan ringkasan khusus untuk tag yang difilter.
- **Peralihan Tema:** Mengganti antara tema terang (light mode) dan gelap (dark mode). Preferensi tema disimpan di `localStorage`.
- **Indikator Status Koneksi:** Menampilkan status koneksi internet (Online/Offline). Tombol aksi dinonaktifkan saat offline.
- **Format Angka Otomatis:** Input jumlah diformat dengan pemisah ribuan saat diketik.
- **Desain Responsif (Dasar):** Tata letak dasar yang berfungsi di berbagai ukuran layar (perlu penyesuaian CSS lebih lanjut untuk optimalisasi).
- **PWA Ready (Dasar):** Termasuk registrasi Service Worker dasar (fungsionalitas offline lebih lanjut dapat ditambahkan).

## Tumpukan Teknologi

- **Frontend:** React, TypeScript
- **Styling:** CSS (dengan variabel CSS untuk tema)
- **API:** Menggunakan endpoint eksternal (`https://tekizaki.my.id/z_uas_pmt/api.php`) untuk operasi backend (CRUD transaksi, autentikasi).

## API Backend

Aplikasi ini berkomunikasi dengan API eksternal untuk semua operasi data. Endpoint utama yang digunakan adalah:

`https://tekizaki.my.id/z_uas_pmt/api.php`

Metode HTTP yang digunakan:

- `GET`: Untuk mengambil transaksi pengguna (`?user_id=...`).
- `POST`: Untuk menambah transaksi (`action=add_transaction`), login (`action=login`), dan registrasi (`action=register`).
- `PUT`: Untuk mengupdate transaksi (memerlukan `transaction_id` dalam body).
- `DELETE`: Untuk menghapus transaksi (`?user_id=...&transaction_id=...`).

## Penyiapan dan Menjalankan Lokal

1.  **Prasyarat:** Pastikan Node.js dan npm (atau yarn) terinstal di sistem Anda.
2.  **Klon Repositori:**
    ```bash
    git clone <url-repositori-anda>
    cd <nama-direktori-proyek>
    ```
3.  **Instal Dependensi:**
    ```bash
    npm install
    # atau
    yarn install
    ```
4.  **Jalankan Aplikasi:**
    ```bash
    npm start
    # atau
    yarn start
    ```
    Aplikasi akan berjalan secara default di `http://localhost:3000` (atau port lain jika 3000 sudah digunakan).

## Detail Fungsionalitas

- **Autentikasi:** Pengguna disambut dengan form login. Mereka dapat beralih ke form registrasi jika belum memiliki akun. Setelah login berhasil, `userId` disimpan di `localStorage` dan aplikasi menampilkan dasbor utama. Logout menghapus `userId` dari `localStorage` dan mengembalikan pengguna ke layar login.
- **Form Transaksi:** Form memungkinkan input jenis, jumlah, judul, deskripsi, dan tag. Tombol "Add Transaction" atau "Update Transaction" mengirim data ke API. Tombol "Cancel Edit" muncul saat mengedit untuk membatalkan perubahan dan membersihkan form.
- **Riwayat Transaksi:** Menampilkan daftar transaksi yang diurutkan (biasanya terbaru di atas, tergantung implementasi API). Setiap item menampilkan detail dan tombol Edit/Delete.
- **Filter Tag:** Dropdown memungkinkan pemilihan tag. Memilih tag akan memfilter daftar riwayat dan menampilkan ringkasan pendapatan/pengeluaran khusus untuk tag tersebut. Memilih "All Tags" akan menampilkan semua transaksi.
- **Tema:** Tombol di header memungkinkan peralihan antara mode terang dan gelap. Perubahan diterapkan secara global menggunakan atribut `data-theme` pada elemen `<html>` dan preferensi disimpan.

## Struktur Kode (Ringkasan)

- `src/App.tsx`: Komponen utama yang mengelola state aplikasi, logika bisnis, pemanggilan API, dan merender UI utama atau komponen autentikasi.
- `src/Login.tsx`: Komponen untuk form login.
- `src/Register.tsx`: Komponen untuk form registrasi.
- `src/App.css`: File CSS utama untuk styling aplikasi, termasuk variabel tema.
- `public/service-worker.js`: (Jika ada) Service worker dasar untuk fungsionalitas PWA.

## Kemungkinan Peningkatan

- Validasi input yang lebih robust di sisi klien dan server.
- Penanganan error yang lebih baik dengan pesan yang lebih informatif kepada pengguna.
- Implementasi fungsionalitas offline yang lebih canggih menggunakan Service Worker dan IndexedDB/localStorage.
- Menambahkan fitur visualisasi data (misalnya, grafik pai atau batang).
- Unit testing dan integration testing.
- Pemisahan state management yang lebih kompleks (misalnya, menggunakan Context API atau Redux/Zustand) jika aplikasi berkembang.
- Optimasi performa, terutama untuk daftar transaksi yang sangat panjang.
- Fitur pencarian transaksi.
- Pengkategorian transaksi yang lebih terstruktur selain tag.
