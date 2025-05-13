// Register.tsx - Komponen untuk halaman registrasi (Diperbaiki)

import React, { useState } from "react";

interface RegisterProps {
  onRegister: (username: string, password: string) => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  /**
   * Handler untuk event submit form.
   * Mencegah perilaku default form dan memanggil fungsi onRegister.
   * @param e Event form
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister(username, password);
  };

  return (
    <div className="auth">
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <button type="submit">Register</button>
      </form>
      <p>
        Sudah punya akun?{" "}
        {/* Tombol switch sekarang hanya menggunakan class dari App.css */}
        <button type="button" onClick={onSwitchToLogin}>
          Login di sini
        </button>
      </p>
    </div>
  );
};

export default Register;
