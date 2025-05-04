// App.tsx - Komponen utama aplikasi

// Impor dependensi yang diperlukan dari React dan file CSS/komponen lokal
import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import Login from "./Login"; // Komponen untuk halaman login
import Register from "./Register"; // Komponen untuk halaman registrasi

// Definisi tipe data untuk objek transaksi
interface Transaction {
  id: number; // ID unik transaksi
  type: "income" | "expense"; // Jenis transaksi: pemasukan atau pengeluaran
  amount: number; // Jumlah transaksi
  title?: string | null; // Judul transaksi (opsional)
  description?: string | null; // Deskripsi transaksi (opsional)
  tags?: string | null; // Tag transaksi (opsional, dipisahkan koma)
  created_at?: string; // Timestamp pembuatan (opsional, dari API)
}

// Definisi tipe data untuk tema aplikasi
type Theme = "light" | "dark"; // Tema terang atau gelap

// Definisi tipe dasar untuk respons API
interface ApiBaseResponse {
  status: "success" | "error"; // Status respons: sukses atau error
  message?: string; // Pesan tambahan (opsional)
}

// Definisi tipe untuk respons sukses API saat menambah/mengedit transaksi
interface ApiTransactionSuccessResponse extends ApiBaseResponse {
  status: "success";
  transaction: Transaction; // Data transaksi yang baru ditambahkan/diedit
}

// Definisi tipe untuk respons sukses API saat data tidak berubah (update)
interface ApiUpdateUnchangedSuccessResponse extends ApiBaseResponse {
  status: "success";
  message: "Transaction data unchanged"; // Pesan spesifik jika data tidak berubah
}

// Definisi tipe untuk respons sukses API saat login
interface ApiLoginSuccessResponse extends ApiBaseResponse {
  status: "success";
  user_id: number; // ID pengguna yang berhasil login
}

// Definisi tipe untuk respons sukses API sederhana (misal: delete, register)
interface ApiSimpleSuccessResponse extends ApiBaseResponse {
  status: "success";
  message: string; // Pesan sukses
}

// Tipe gabungan untuk respons API tambah/update
type AddUpdateApiResponse =
  | ApiTransactionSuccessResponse
  | ApiUpdateUnchangedSuccessResponse;
// Tipe gabungan untuk respons API login
type LoginApiResponse = ApiLoginSuccessResponse | ApiBaseResponse;
// Tipe gabungan untuk respons API sederhana
type SimpleApiResponse = ApiSimpleSuccessResponse | ApiBaseResponse;

// Konstanta kunci untuk menyimpan preferensi tema di localStorage
const THEME_KEY = "themePreference";
// Konstanta URL endpoint API
const API_URL = "https://tekizaki.my.id/z_uas_pmt/api.php";

/**
 * Fungsi helper untuk memformat angka menjadi string dengan pemisah ribuan (titik).
 * @param num Angka yang akan diformat.
 * @returns String angka yang sudah diformat, atau string kosong jika input tidak valid.
 */
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return ""; // Kembalikan string kosong jika null, undefined, atau NaN
  const numStr = Number(num).toString(); // Konversi ke string
  // Tambahkan titik sebagai pemisah ribuan
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Fungsi helper untuk mengurai string angka yang diformat (dengan titik) menjadi angka.
 * @param str String angka yang diformat.
 * @returns Angka hasil parse, atau 0 jika string kosong.
 */
function parseFormattedNumber(str: string): number {
  if (!str) return 0; // Kembalikan 0 jika string kosong
  // Hapus semua titik pemisah ribuan dan konversi ke angka
  return Number(str.replace(/\./g, ""));
}

// Komponen utama aplikasi
function App() {
  // State untuk menyimpan daftar transaksi
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // State untuk input jumlah (sebagai string untuk format)
  const [amount, setAmount] = useState<string>("");
  // State untuk jenis transaksi (pemasukan/pengeluaran)
  const [type, setType] = useState<"income" | "expense">("income");
  // State untuk input judul transaksi
  const [title, setTitle] = useState<string>("");
  // State untuk input deskripsi transaksi
  const [description, setDescription] = useState<string>("");
  // State untuk input tag transaksi
  const [tags, setTags] = useState<string>("");
  // State untuk tema aplikasi (light/dark)
  const [theme, setTheme] = useState<Theme>("light");
  // State untuk status koneksi internet
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  // State untuk status login pengguna
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // State untuk menyimpan ID pengguna yang login
  const [userId, setUserId] = useState<number | null>(null);
  // State untuk menampilkan form registrasi atau login
  const [showRegister, setShowRegister] = useState<boolean>(false);
  // State untuk status loading (misal saat memanggil API)
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // State untuk menyimpan pesan error
  const [error, setError] = useState<string | null>(null);
  // State untuk menyimpan ID transaksi yang sedang diedit
  const [editingTransactionId, setEditingTransactionId] = useState<
    number | null
  >(null);
  // State untuk filter tag yang dipilih
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null
  );

  // Menentukan kelas CSS untuk heading ringkasan berdasarkan tema
  const headingClassName =
    theme === "dark"
      ? "summary-heading dark-mode"
      : "summary-heading light-mode";

  /**
   * Fungsi generik yang di-memoize untuk melakukan panggilan API.
   * Mengelola state loading dan error secara otomatis.
   * @param endpoint URL endpoint API.
   * @param method Metode HTTP (GET, POST, PUT, DELETE).
   * @param body Data yang dikirim dalam body request (opsional).
   * @returns Promise yang resolve dengan data respons API.
   */
  const callApi = useCallback(
    async <T = ApiBaseResponse,>(
      endpoint: string,
      method: string,
      body?: any
    ): Promise<T> => {
      setIsLoading(true); // Mulai loading
      setError(null); // Hapus error sebelumnya
      try {
        const options: RequestInit = {
          method,
          headers: {
            "Content-Type": "application/json", // Set header content type
          },
        };
        if (body) {
          options.body = JSON.stringify(body); // Tambahkan body jika ada
        }

        const response = await fetch(endpoint, options); // Lakukan fetch

        let responseData: any;
        try {
          responseData = await response.json(); // Coba parse respons sebagai JSON
        } catch (jsonError) {
          // Jika gagal parse JSON dan status tidak OK, lempar error HTTP
          if (!response.ok) {
            throw new Error(
              `HTTP error ${response.status}: ${response.statusText}. Non-JSON response.`
            );
          }
          // Jika status OK tapi JSON tidak valid (jarang terjadi), anggap error
          responseData = {
            status: "error",
            message: "Invalid JSON response from server",
          };
        }

        // Jika respons tidak OK (status code bukan 2xx), lempar error
        if (!response.ok) {
          throw new Error(
            responseData?.message || // Gunakan pesan error dari API jika ada
              `Request failed with status ${response.status}` // Pesan default
          );
        }

        return responseData as T; // Kembalikan data respons
      } catch (err: any) {
        console.error(`API call error (${method} ${endpoint}):`, err); // Log error ke console
        const errorMessage =
          err.message || "An unexpected network error occurred."; // Tentukan pesan error
        setError(errorMessage); // Set state error
        throw err; // Lempar kembali error untuk ditangani di pemanggil
      } finally {
        setIsLoading(false); // Selesai loading, baik sukses maupun gagal
      }
    },
    [] // Dependency array kosong agar fungsi callApi tidak dibuat ulang setiap render
  );

  /**
   * Fungsi yang di-memoize untuk mengambil data transaksi dari API berdasarkan user ID.
   * @param currentUserId ID pengguna yang transaksinya akan diambil.
   */
  const fetchTransactions = useCallback(
    async (currentUserId: number) => {
      if (!currentUserId) return; // Jangan lakukan fetch jika user ID tidak ada
      try {
        // Panggil API untuk mendapatkan transaksi
        const data = await callApi<Transaction[]>(
          `${API_URL}?user_id=${currentUserId}`, // Endpoint GET transaksi
          "GET"
        );

        // Pastikan data yang diterima adalah array
        if (Array.isArray(data)) {
          // Format data transaksi (konversi ID dan amount ke number, handle nullish values)
          const formattedTransactions = data.map((tx) => ({
            ...tx,
            id: Number(tx.id),
            amount: Number(tx.amount),
            title: tx.title ?? null, // Gunakan null jika title tidak ada
            description: tx.description ?? null, // Gunakan null jika description tidak ada
            tags: tx.tags ?? null, // Gunakan null jika tags tidak ada
          }));
          setTransactions(formattedTransactions); // Update state transaksi
        } else {
          // Jika data bukan array, log error dan set transaksi ke array kosong
          console.error("Received non-array data for transactions:", data);
          setTransactions([]);
          setError(
            "Failed to load transactions: Invalid data format received."
          );
        }
      } catch (err) {
        // Jika terjadi error saat fetch, set transaksi ke array kosong
        setTransactions([]);
        // Error sudah di-set oleh callApi
      }
    },
    [callApi] // Bergantung pada fungsi callApi
  );

  // Efek samping yang dijalankan saat komponen pertama kali dimuat dan saat fetchTransactions berubah
  useEffect(() => {
    // 1. Cek status login dari localStorage
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      const parsedUserId = parseInt(storedUserId, 10);
      if (!isNaN(parsedUserId)) {
        // Jika ada user ID valid di localStorage
        setIsLoggedIn(true); // Set status login
        setUserId(parsedUserId); // Set user ID
        fetchTransactions(parsedUserId); // Ambil data transaksi pengguna
      } else {
        // Jika user ID tidak valid, hapus dari localStorage
        localStorage.removeItem("userId");
        setIsLoggedIn(false);
        setUserId(null);
      }
    } else {
      // Jika tidak ada user ID di localStorage
      setIsLoggedIn(false);
      setUserId(null);
    }

    // 2. Registrasi Service Worker (jika didukung browser)
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").then(
          (registration) => console.log("SW registered:", registration.scope),
          (error) => console.error("SW registration failed:", error)
        );
      });
    }

    // 3. Muat preferensi tema dari localStorage atau deteksi preferensi sistem
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const initialTheme =
      savedTheme || // Gunakan tema tersimpan jika ada
      (window.matchMedia("(prefers-color-scheme: light)").matches // Cek preferensi sistem
        ? "light"
        : "dark");
    setTheme(initialTheme); // Set state tema
    document.documentElement.setAttribute("data-theme", initialTheme); // Set atribut data-theme di HTML

    // 4. Setup listener untuk status online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 5. Cleanup function: hapus listener saat komponen di-unmount
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchTransactions]); // Bergantung pada fetchTransactions

  /**
   * Handler untuk perubahan input amount.
   * Memformat input secara otomatis dengan pemisah ribuan.
   * @param e Event perubahan dari input element.
   */
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, ""); // Hapus titik pemisah
    // Hanya izinkan angka atau string kosong
    if (rawValue === "" || /^[0-9]+$/.test(rawValue)) {
      const numValue = Number(rawValue); // Konversi ke angka
      // Set state amount dengan nilai yang diformat, atau string kosong
      setAmount(rawValue === "" ? "" : formatNumber(numValue));
    }
  };

  /**
   * Fungsi untuk membersihkan form input transaksi.
   * Mengembalikan state form ke nilai default dan menghapus ID edit.
   */
  const clearForm = () => {
    setAmount("");
    setType("income");
    setTitle("");
    setDescription("");
    setTags("");
    setEditingTransactionId(null); // Hapus status edit
  };

  /**
   * Handler untuk menambah atau mengupdate transaksi.
   * Mengirim data ke API menggunakan metode POST (tambah) atau PUT (update).
   */
  const handleAddOrUpdateTransaction = async () => {
    // Validasi: Pastikan pengguna sudah login
    if (!userId) {
      setError("Cannot save transaction: User not logged in.");
      return;
    }
    // Validasi: Pastikan amount valid
    const parsedAmount = parseFormattedNumber(amount);
    if (amount === "" || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid, positive amount for the transaction.");
      return;
    }
    setError(null); // Hapus error jika validasi lolos

    // Siapkan payload data transaksi untuk dikirim ke API
    const transactionPayload = {
      user_id: userId,
      type: type,
      amount: parsedAmount,
      title: title.trim() || null, // Kirim null jika kosong setelah trim
      description: description.trim() || null, // Kirim null jika kosong setelah trim
      tags:
        tags
          .split(",") // Pisahkan tag berdasarkan koma
          .map((t) => t.trim()) // Hapus spasi di awal/akhir tiap tag
          .filter(Boolean) // Hapus tag kosong
          .join(",") || null, // Gabungkan kembali dengan koma, kirim null jika tidak ada tag
    };

    try {
      let resultData: AddUpdateApiResponse;

      // Jika sedang dalam mode edit (editingTransactionId tidak null)
      if (editingTransactionId !== null) {
        // Panggil API dengan metode PUT untuk update
        resultData = await callApi<AddUpdateApiResponse>(API_URL, "PUT", {
          ...transactionPayload,
          transaction_id: editingTransactionId, // Sertakan ID transaksi yang diedit
        });

        if (resultData.status === "success") {
          // Jika update berhasil dan API mengembalikan data transaksi baru
          if ("transaction" in resultData) {
            const updatedTx = {
              ...resultData.transaction,
              id: Number(resultData.transaction.id), // Pastikan ID adalah number
              amount: Number(resultData.transaction.amount), // Pastikan amount adalah number
            };
            // Update state transactions: ganti transaksi lama dengan yang baru
            setTransactions((prev) =>
              prev.map((tx) =>
                tx.id === editingTransactionId ? updatedTx : tx
              )
            );
            console.log("Transaction updated successfully:", updatedTx.id);
          } else if (resultData.message === "Transaction data unchanged") {
            // Jika data tidak berubah, cukup log pesan
            console.log("Transaction data was unchanged.");
          }
          clearForm(); // Bersihkan form setelah berhasil update
        }
        // Jika resultData.status === 'error', error sudah ditangani oleh callApi
      } else {
        // Jika bukan mode edit (menambah transaksi baru)
        // Panggil API dengan metode POST untuk menambah
        resultData = await callApi<ApiTransactionSuccessResponse>(
          API_URL,
          "POST",
          { action: "add_transaction", ...transactionPayload } // Sertakan action 'add_transaction'
        );

        // Jika penambahan berhasil dan API mengembalikan data transaksi baru
        if (resultData.status === "success" && resultData.transaction) {
          const newTransaction = {
            ...resultData.transaction,
            id: Number(resultData.transaction.id), // Pastikan ID adalah number
            amount: Number(resultData.transaction.amount), // Pastikan amount adalah number
          };
          // Tambahkan transaksi baru ke awal state transactions
          setTransactions((prev) => [newTransaction, ...prev]);
          console.log("Transaction added successfully:", newTransaction.id);
          clearForm(); // Bersihkan form setelah berhasil menambah
        }
        // Jika resultData.status === 'error', error sudah ditangani oleh callApi
      }
    } catch (err) {
      // Tangani error yang mungkin dilempar oleh callApi atau validasi sebelumnya
      // Tampilkan alert dengan pesan error yang sudah di-set oleh callApi atau pesan default
      alert(
        `Operation failed: ${
          error || "Please check the details and try again."
        }`
      );
    }
  };

  /**
   * Handler untuk memulai mode edit transaksi.
   * Mengisi form dengan data transaksi yang dipilih dan scroll ke form.
   * @param transaction Objek transaksi yang akan diedit.
   */
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id); // Set ID transaksi yang diedit
    // Isi state form dengan data dari transaksi yang dipilih
    setAmount(formatNumber(transaction.amount));
    setType(transaction.type);
    setTitle(transaction.title || "");
    setDescription(transaction.description || "");
    setTags(transaction.tags || "");
    setError(null); // Hapus pesan error sebelumnya
    // Scroll ke elemen form agar terlihat
    const formElement = document.querySelector(".form-container");
    formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * Handler untuk menghapus transaksi.
   * Meminta konfirmasi pengguna sebelum menghapus.
   * @param transactionId ID transaksi yang akan dihapus.
   */
  const handleDeleteTransaction = async (transactionId: number) => {
    // Validasi: Pastikan pengguna sudah login
    if (!userId) {
      setError("Cannot delete: User not logged in.");
      return;
    }

    // Minta konfirmasi pengguna
    if (
      window.confirm(
        `Are you sure you want to permanently delete transaction ID ${transactionId}?`
      )
    ) {
      try {
        // Panggil API dengan metode DELETE
        await callApi<ApiSimpleSuccessResponse>(
          `${API_URL}?user_id=${userId}&transaction_id=${transactionId}`, // Endpoint DELETE
          "DELETE"
        );

        // Hapus transaksi dari state transactions
        setTransactions(transactions.filter((tx) => tx.id !== transactionId));
        console.log("Transaction deleted successfully:", transactionId);

        // Jika transaksi yang dihapus adalah yang sedang diedit, bersihkan form
        if (editingTransactionId === transactionId) {
          clearForm();
        }
      } catch (err) {
        // Tangani error dari callApi
        alert(
          `Failed to delete transaction: ${
            error || "An unknown error occurred."
          }`
        );
      }
    }
  };

  /**
   * Handler untuk mengganti tema aplikasi (light/dark).
   * Menyimpan preferensi tema ke localStorage.
   */
  const toggleTheme = () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light"; // Tentukan tema baru
    setTheme(newTheme); // Update state tema
    document.documentElement.setAttribute("data-theme", newTheme); // Update atribut di HTML
    localStorage.setItem(THEME_KEY, newTheme); // Simpan preferensi ke localStorage
  };

  /**
   * Handler untuk proses login pengguna.
   * @param username Username pengguna.
   * @param password Password pengguna.
   */
  const handleLogin = async (username: string, password: string) => {
    try {
      // Panggil API untuk login
      const data = await callApi<LoginApiResponse>(API_URL, "POST", {
        action: "login", // Sertakan action 'login'
        username,
        password,
      });

      // Jika login sukses dan API mengembalikan user_id
      if (data.status === "success" && "user_id" in data) {
        setIsLoggedIn(true); // Set status login
        setUserId(data.user_id); // Set user ID
        localStorage.setItem("userId", data.user_id.toString()); // Simpan user ID ke localStorage
        fetchTransactions(data.user_id); // Ambil data transaksi pengguna
        setShowRegister(false); // Sembunyikan form registrasi (jika terbuka)
        clearForm(); // Bersihkan form transaksi
        setError(null); // Hapus pesan error
        setSelectedTagFilter(null); // Reset filter tag
      } else {
        // Jika status bukan success atau tidak ada user_id
        throw new Error(
          data.message || "Login failed: Invalid response from server."
        );
      }
    } catch (err: any) {
      // Tangani error dari callApi atau validasi respons
      // Tampilkan alert dengan pesan error yang sudah di-set oleh callApi atau pesan default
      alert(`Login failed: ${error || "Please check credentials."}`);
    }
  };

  /**
   * Handler untuk proses registrasi pengguna baru.
   * @param username Username baru.
   * @param password Password baru.
   */
  const handleRegister = async (username: string, password: string) => {
    try {
      // Panggil API untuk registrasi
      const data = await callApi<SimpleApiResponse>(API_URL, "POST", {
        action: "register", // Sertakan action 'register'
        username,
        password,
      });

      // Jika registrasi sukses
      if (data.status === "success") {
        alert(data.message || "Registration successful! Please login."); // Tampilkan pesan sukses
        setShowRegister(false); // Kembali ke tampilan login
        setError(null); // Hapus pesan error
      } else {
        // Jika status bukan success
        throw new Error(
          data.message || "Registration failed: Invalid response."
        );
      }
    } catch (err: any) {
      // Tangani error dari callApi atau validasi respons
      // Tampilkan alert dengan pesan error yang sudah di-set oleh callApi atau pesan default
      alert(`Registration failed: ${error || "Username might be taken."}`);
    }
  };

  /**
   * Handler untuk proses logout pengguna.
   * Menghapus data sesi dari localStorage dan mereset state aplikasi.
   */
  const handleLogout = () => {
    localStorage.removeItem("userId"); // Hapus user ID dari localStorage
    // Reset state ke kondisi awal (belum login)
    setIsLoggedIn(false);
    setUserId(null);
    setTransactions([]);
    clearForm();
    setError(null);
    setSelectedTagFilter(null);
  };

  // Memoized value: Daftar tag unik dari semua transaksi
  const uniqueTags = useMemo(() => {
    const allTags = new Set<string>(); // Gunakan Set untuk otomatis menangani duplikat
    transactions.forEach((tx) => {
      if (tx.tags) {
        tx.tags
          .split(",") // Pisahkan string tags
          .map((tag) => tag.trim()) // Trim spasi
          .filter(Boolean) // Hapus tag kosong
          .forEach((tag) => allTags.add(tag)); // Tambahkan ke Set
      }
    });
    return Array.from(allTags).sort(); // Konversi Set ke Array dan urutkan
  }, [transactions]); // Hitung ulang hanya jika transactions berubah

  // Memoized value: Daftar transaksi yang sudah difilter berdasarkan tag terpilih
  const filteredTransactions = useMemo(() => {
    if (!selectedTagFilter) {
      return transactions; // Jika tidak ada filter, kembalikan semua transaksi
    }
    // Filter transaksi yang memiliki tag yang cocok dengan selectedTagFilter
    return transactions.filter(
      (tx) =>
        tx.tags && // Pastikan transaksi punya tags
        tx.tags
          .split(",")
          .map((t) => t.trim()) // Proses tags seperti biasa
          .includes(selectedTagFilter) // Cek apakah tag yang dipilih ada di dalamnya
    );
  }, [transactions, selectedTagFilter]); // Hitung ulang jika transactions atau selectedTagFilter berubah

  // Memoized value: Total pemasukan, pengeluaran, dan saldo keseluruhan
  const { totalIncome, totalExpenses, totalBalance } = useMemo(() => {
    const income = transactions.reduce(
      (acc, curr) => acc + (curr.type === "income" ? curr.amount : 0), // Akumulasi amount jika type 'income'
      0
    );
    const expenses = transactions.reduce(
      (acc, curr) => acc + (curr.type === "expense" ? curr.amount : 0), // Akumulasi amount jika type 'expense'
      0
    );
    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalBalance: income - expenses, // Hitung saldo
    };
  }, [transactions]); // Hitung ulang hanya jika transactions berubah

  // Memoized value: Ringkasan pemasukan dan pengeluaran untuk transaksi yang difilter
  const filteredSummary = useMemo(() => {
    // Jika tidak ada filter, kembalikan nol (meskipun tidak ditampilkan)
    if (!selectedTagFilter) {
      return { income: 0, expenses: 0 };
    }
    // Hitung total income dari filteredTransactions
    const income = filteredTransactions.reduce(
      (acc, curr) => acc + (curr.type === "income" ? curr.amount : 0),
      0
    );
    // Hitung total expenses dari filteredTransactions
    const expenses = filteredTransactions.reduce(
      (acc, curr) => acc + (curr.type === "expense" ? curr.amount : 0),
      0
    );
    return { income, expenses };
  }, [selectedTagFilter, filteredTransactions]); // Hitung ulang jika filter atau daftar transaksi terfilter berubah

  /**
   * Handler untuk perubahan pilihan filter tag.
   * @param e Event perubahan dari select element.
   */
  const handleTagFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTagFilter(e.target.value || null); // Set state filter, gunakan null jika memilih "All Tags" (value="")
  };

  // Render JSX komponen
  return (
    <div className="app">
      {/* Tampilkan form Login/Register jika belum login */}
      {!isLoggedIn ? (
        <div className="auth-container">
          {/* Tampilkan pesan error jika ada */}
          {error && <p className="error-message auth-error">{error}</p>}
          {/* Tampilkan indikator loading jika sedang proses auth */}
          {isLoading && <p className="loading-indicator">Loading...</p>}
          {/* Tampilkan komponen Register atau Login berdasarkan state showRegister */}
          {showRegister ? (
            <Register
              onRegister={handleRegister} // Prop untuk fungsi register
              onSwitchToLogin={() => {
                // Prop untuk beralih ke login
                setShowRegister(false);
                setError(null); // Hapus error saat beralih form
              }}
            />
          ) : (
            <Login
              onLogin={handleLogin} // Prop untuk fungsi login
              onSwitchToRegister={() => {
                // Prop untuk beralih ke register
                setShowRegister(true);
                setError(null); // Hapus error saat beralih form
              }}
            />
          )}
        </div>
      ) : (
        // Tampilkan UI utama aplikasi jika sudah login
        <>
          <header className="header">
            <h1>Money Tracker</h1>
            <div className="controls">
              {/* Indikator status koneksi */}
              <div
                className={`connection-status ${
                  isOnline ? "online" : "offline"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
              </div>
              {/* Tombol ganti tema */}
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${
                  theme === "light" ? "dark" : "light"
                } mode`}
              >
                {theme === "light" ? "🌙 Dark" : "☀️ Light"}
              </button>
              {/* Tombol logout */}
              <button
                className="logout-button"
                onClick={handleLogout}
                disabled={isLoading} // Nonaktifkan jika sedang loading
              >
                Logout
              </button>
            </div>
          </header>
          {/* Tampilkan pesan error aplikasi jika ada */}
          {error && <p className="error-message app-error">{error}</p>}
          <main className="main-content">
            {/* Bagian Form Tambah/Edit Transaksi */}
            <section className="form-container">
              <h2 id="form-title">
                {/* Judul form dinamis berdasarkan mode edit */}
                {editingTransactionId
                  ? "Edit Transaction"
                  : "Add New Transaction"}
              </h2>
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault(); // Cegah submit default form
                  handleAddOrUpdateTransaction(); // Panggil fungsi tambah/update
                }}
                aria-labelledby="form-title" // Aksesibilitas: hubungkan form dengan judulnya
              >
                {/* Baris pertama form: Type dan Amount */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="type">Type:</label>
                    <select
                      id="type"
                      value={type}
                      onChange={
                        (e) => setType(e.target.value as "income" | "expense") // Update state type
                      }
                      disabled={isLoading} // Nonaktifkan jika loading
                      required // Wajib diisi
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="amount">Amount:</label>
                    <input
                      id="amount"
                      type="text" // Gunakan text agar bisa diformat
                      inputMode="numeric" // Hint keyboard numeric di mobile
                      value={amount}
                      onChange={handleAmountChange} // Gunakan handler khusus
                      placeholder="e.g., 50.000"
                      disabled={isLoading} // Nonaktifkan jika loading
                      required // Wajib diisi
                      aria-required="true" // Aksesibilitas
                    />
                  </div>
                </div>
                {/* Baris kedua form: Title */}
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="title">Title (Optional):</label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)} // Update state title
                      placeholder="e.g., Salary, Groceries"
                      maxLength={100} // Batas karakter
                      disabled={isLoading} // Nonaktifkan jika loading
                    />
                  </div>
                </div>
                {/* Baris ketiga form: Description */}
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="description">Description (Optional):</label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)} // Update state description
                      placeholder="e.g., Monthly pay, Weekly shop"
                      rows={3} // Tinggi textarea
                      disabled={isLoading} // Nonaktifkan jika loading
                    ></textarea>
                  </div>
                </div>
                {/* Baris keempat form: Tags */}
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="tags">
                      Tags (Optional, comma-separated):
                    </label>
                    <input
                      id="tags"
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)} // Update state tags
                      placeholder="e.g., work, food, bills"
                      maxLength={255} // Batas karakter
                      disabled={isLoading} // Nonaktifkan jika loading
                    />
                  </div>
                </div>
                {/* Tombol Aksi Form */}
                <div className="form-actions">
                  <button
                    type="submit"
                    className="button"
                    // Nonaktifkan jika loading atau offline
                    disabled={isLoading || !isOnline}
                  >
                    {/* Teks tombol dinamis */}
                    {isLoading
                      ? "Saving..."
                      : editingTransactionId
                      ? "Update Transaction"
                      : "Add Transaction"}
                  </button>
                  {/* Tampilkan tombol Cancel Edit hanya jika sedang mode edit */}
                  {editingTransactionId && (
                    <button
                      type="button" // Bukan submit
                      className="button secondary"
                      onClick={clearForm} // Panggil fungsi clear form
                      disabled={isLoading} // Nonaktifkan jika loading
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Bagian Ringkasan Keseluruhan */}
            <section
              className="summary-container"
              aria-label="Overall Financial Summary" // Aksesibilitas
            >
              <h3 className={headingClassName}>Overall Summary</h3>
              <p>
                <strong>Income:</strong>{" "}
                {/* Tampilkan total income yang diformat */}
                <span>Rp{formatNumber(totalIncome)}</span>
              </p>
              <p>
                <strong>Expenses:</strong>{" "}
                {/* Tampilkan total expenses yang diformat */}
                <span>Rp{formatNumber(totalExpenses)}</span>
              </p>
              <p>
                <strong>Balance:</strong>{" "}
                {/* Tampilkan total balance yang diformat */}
                <span>Rp{formatNumber(totalBalance)}</span>
              </p>
            </section>

            {/* Bagian Daftar Riwayat Transaksi */}
            <section className="transactions">
              <h2>History</h2>
              {/* Tampilkan filter tag jika ada tag unik */}
              {uniqueTags.length > 0 && (
                <div className="tag-filter-container">
                  <label htmlFor="tag-filter">Filter by Tag:</label>
                  <select
                    id="tag-filter"
                    value={selectedTagFilter ?? ""} // Gunakan string kosong jika filter null
                    onChange={handleTagFilterChange} // Handler perubahan filter
                    disabled={isLoading} // Nonaktifkan jika loading
                  >
                    <option value="">All Tags</option> {/* Opsi default */}
                    {/* Render opsi untuk setiap tag unik */}
                    {uniqueTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {/* Tampilkan ringkasan terfilter jika ada tag yang dipilih */}
              {selectedTagFilter && (
                <div className="filtered-summary" aria-live="polite">
                  {" "}
                  {/* Aksesibilitas: umumkan perubahan */}
                  <h3>Summary for Tag: "{selectedTagFilter}"</h3>
                  <div className="filtered-summary-details">
                    <p>
                      <strong>Income:</strong> Rp
                      {/* Tampilkan income terfilter */}
                      {formatNumber(filteredSummary.income)}
                    </p>
                    <p>
                      <strong>Expenses:</strong> Rp
                      {/* Tampilkan expenses terfilter */}
                      {formatNumber(filteredSummary.expenses)}
                    </p>
                  </div>
                </div>
              )}
              {/* Tampilkan indikator loading jika sedang memuat dan belum ada transaksi */}
              {isLoading && transactions.length === 0 && (
                <p className="loading-indicator">Loading history...</p>
              )}
              {/* Tampilkan pesan jika tidak ada transaksi (baik karena kosong atau filter) */}
              {!isLoading && filteredTransactions.length === 0 && (
                <p className="transaction-item empty">
                  {selectedTagFilter
                    ? `No transactions found with the tag "${selectedTagFilter}".` // Pesan jika filter aktif
                    : transactions.length === 0
                    ? "No transactions recorded yet." // Pesan jika memang belum ada data
                    : "No transactions match the current filter."}{" "}
                  {/* Pesan fallback jika filter aktif tapi data asli ada */}
                </p>
              )}
              {/* Render daftar transaksi jika ada transaksi terfilter */}
              {filteredTransactions.length > 0 && (
                <ul
                  aria-label={`Transaction History List${
                    // Label dinamis untuk aksesibilitas
                    selectedTagFilter
                      ? ` (filtered by tag: ${selectedTagFilter})`
                      : ""
                  }`}
                >
                  {/* Map setiap transaksi terfilter ke elemen list item */}
                  {filteredTransactions.map((transaction) => (
                    <li
                      key={transaction.id} // Kunci unik untuk list item
                      className={`transaction-item ${transaction.type}`} // Kelas CSS berdasarkan tipe
                    >
                      {/* Detail transaksi */}
                      <div className="transaction-details">
                        <span className="transaction-title">
                          <span>
                            {/* Tampilkan judul atau tipe jika judul kosong */}
                            {transaction.title ||
                              transaction.type.charAt(0).toUpperCase() +
                                transaction.type.slice(1)}
                          </span>
                          <span className="transaction-amount">
                            {/* Tanda + atau - berdasarkan tipe dan jumlah yang diformat */}
                            {transaction.type === "income" ? "+" : "-"}Rp
                            {formatNumber(transaction.amount)}
                          </span>
                        </span>
                        {/* Tampilkan deskripsi jika ada */}
                        {transaction.description && (
                          <p className="transaction-description">
                            {transaction.description}
                          </p>
                        )}
                        {/* Tampilkan tag jika ada */}
                        {transaction.tags && (
                          <div className="transaction-tags" aria-label="Tags">
                            {transaction.tags
                              .split(",")
                              .map((tag) => tag.trim()) // Proses tags
                              .filter(Boolean)
                              .map((tag, index) => (
                                <span key={index} className="tag">
                                  {" "}
                                  {/* Render setiap tag */}
                                  {tag}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      {/* Tombol aksi untuk setiap transaksi */}
                      <div className="transaction-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditTransaction(transaction)} // Panggil handler edit
                          // Nonaktifkan jika loading atau jika transaksi ini sedang diedit
                          disabled={
                            isLoading || editingTransactionId === transaction.id
                          }
                          // Label aksesibilitas yang deskriptif
                          aria-label={`Edit transaction: ${
                            transaction.title || transaction.type
                          } for Rp${formatNumber(transaction.amount)}`}
                        >
                          ✏️ {/* Ikon edit */}
                        </button>
                        <button
                          className="delete-btn"
                          onClick={
                            () => handleDeleteTransaction(transaction.id) // Panggil handler delete
                          }
                          disabled={isLoading} // Nonaktifkan jika loading
                          // Label aksesibilitas yang deskriptif
                          aria-label={`Delete transaction: ${
                            transaction.title || transaction.type
                          } for Rp${formatNumber(transaction.amount)}`}
                        >
                          🗑️ {/* Ikon delete */}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
        </>
      )}
    </div>
  );
}

// Ekspor komponen App sebagai default
export default App;
