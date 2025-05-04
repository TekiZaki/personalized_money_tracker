// Register.tsx - Komponen untuk halaman registrasi

// Impor React dan hook useState
import React, { useState } from "react";

// Definisikan tipe properti (props) yang diterima oleh komponen Register
interface RegisterProps {
  onRegister: (username: string, password: string) => void; // Fungsi yang dipanggil saat registrasi berhasil
  onSwitchToLogin: () => void; // Fungsi yang dipanggil untuk beralih ke halaman login
}

// Definisikan komponen fungsional Register
const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  // State untuk menyimpan nilai input username
  const [username, setUsername] = useState<string>("");
  // State untuk menyimpan nilai input password
  const [password, setPassword] = useState<string>("");

  /**
   * Handler untuk event submit form.
   * Mencegah perilaku default form dan memanggil fungsi onRegister.
   * @param e Event form
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Mencegah halaman refresh saat form disubmit
    onRegister(username, password); // Panggil fungsi onRegister dengan username dan password saat ini
  };

  // Render JSX komponen
  return (
    // Kontainer utama untuk form registrasi
    <div className="auth">
      {/* Judul halaman */}
      <h1>Register</h1>
      {/* Form registrasi */}
      <form onSubmit={handleSubmit}>
        {/* Input untuk username */}
        <input
          type="text" // Tipe input teks
          placeholder="Username" // Teks placeholder
          value={username} // Nilai input dikontrol oleh state username
          onChange={(e) => setUsername(e.target.value)} // Update state username saat nilai berubah
          required // Input wajib diisi
          autoComplete="username" // Bantuan browser untuk auto-complete
        />
        {/* Input untuk password */}
        <input
          type="password" // Tipe input password (menyembunyikan karakter)
          placeholder="Password" // Teks placeholder
          value={password} // Nilai input dikontrol oleh state password
          onChange={(e) => setPassword(e.target.value)} // Update state password saat nilai berubah
          required // Input wajib diisi
          autoComplete="new-password" // Bantuan browser untuk auto-complete (menyarankan password baru)
        />
        {/* Tombol untuk submit form registrasi */}
        <button type="submit">Register</button>
      </form>
      {/* Teks dan tombol untuk beralih ke halaman login */}
      <p>
        Sudah punya akun? {/* Tombol untuk beralih ke login */}
        <button
          type="button" // Tipe tombol biasa (bukan submit)
          onClick={onSwitchToLogin} // Panggil fungsi onSwitchToLogin saat diklik
          // Catatan: Inline styles di bawah ini sebaiknya dipindahkan ke file CSS
          style={{
            backgroundColor: "#007bff", // Warna latar biru
            color: "white", // Warna teks putih
            padding: "8px 16px", // Padding agar terlihat seperti tombol
            border: "none", // Hapus border default
            borderRadius: "4px", // Sudut melengkung
            cursor: "pointer", // Kursor pointer saat hover
            transition: "background-color 0.3s ease", // Transisi halus untuk efek hover
          }}
          // Efek hover: ubah warna latar saat mouse masuk
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#0056b3")
          }
          // Efek hover: kembalikan warna latar saat mouse keluar
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#007bff")
          }
        >
          Login di sini
        </button>
      </p>
    </div>
  );
};

// Ekspor komponen Register sebagai default export
export default Register;
