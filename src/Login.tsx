// Login.tsx - Komponen untuk halaman login

// Impor React dan hook useState
import React, { useState } from "react";

// Definisikan tipe properti (props) yang diharapkan oleh komponen Login
interface LoginProps {
  onLogin: (username: string, password: string) => void; // Fungsi callback yang dipanggil saat login berhasil
  onSwitchToRegister: () => void; // Fungsi callback untuk beralih ke tampilan registrasi
}

// Definisikan komponen fungsional Login menggunakan React.FC (Functional Component)
// Menerima props onLogin dan onSwitchToRegister
const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  // State untuk menyimpan nilai input username
  const [username, setUsername] = useState<string>("");
  // State untuk menyimpan nilai input password
  const [password, setPassword] = useState<string>("");

  // Handler untuk event submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Mencegah perilaku default submit form (reload halaman)
    onLogin(username, password); // Panggil fungsi onLogin dari props dengan username dan password saat ini
  };

  // Render JSX komponen
  return (
    // Kontainer utama untuk komponen login
    <div className="auth">
      {/* Judul halaman login */}
      <h1>Login</h1>
      {/* Form login */}
      <form onSubmit={handleSubmit}>
        {" "}
        {/* Panggil handleSubmit saat form disubmit */}
        {/* Input field untuk username */}
        <input
          type="text" // Tipe input teks
          placeholder="Username" // Teks placeholder
          value={username} // Nilai input dikontrol oleh state username
          onChange={(e) => setUsername(e.target.value)} // Update state username saat nilai berubah
          required // Input wajib diisi
          autoComplete="username" // Membantu browser mengisi otomatis username
        />
        {/* Input field untuk password */}
        <input
          type="password" // Tipe input password (menyembunyikan karakter)
          placeholder="Password" // Teks placeholder
          value={password} // Nilai input dikontrol oleh state password
          onChange={(e) => setPassword(e.target.value)} // Update state password saat nilai berubah
          required // Input wajib diisi
          autoComplete="current-password" // Membantu browser mengisi otomatis password saat ini
        />
        {/* Tombol untuk submit form login */}
        <button type="submit">Login</button>
      </form>
      {/* Teks dan tombol untuk beralih ke halaman registrasi */}
      <p>
        Belum punya akun? {/* Tombol untuk beralih */}
        <button
          type="button" // Tipe tombol biasa (bukan submit)
          onClick={onSwitchToRegister} // Panggil fungsi onSwitchToRegister saat diklik
          // Styling inline (sebaiknya gunakan CSS terpisah untuk proyek lebih besar)
          style={{
            backgroundColor: "#007bff", // Warna latar biru
            color: "white", // Warna teks putih
            padding: "8px 16px", // Padding internal
            border: "none", // Tanpa border
            borderRadius: "4px", // Sudut melengkung
            cursor: "pointer", // Kursor pointer saat hover
            transition: "background-color 0.3s ease", // Transisi halus saat warna latar berubah
          }}
          // Handler untuk mengubah warna latar saat mouse masuk (hover)
          onMouseEnter={
            (e) => (e.currentTarget.style.backgroundColor = "#0056b3") // Warna biru lebih gelap
          }
          // Handler untuk mengembalikan warna latar saat mouse keluar
          onMouseLeave={
            (e) => (e.currentTarget.style.backgroundColor = "#007bff") // Kembali ke warna biru awal
          }
        >
          Daftar di sini
        </button>
      </p>
    </div>
  );
};

// Ekspor komponen Login sebagai default export
export default Login;
