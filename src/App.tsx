// App.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import Login from "./Login";
import Register from "./Register";
// Impor fungsi DB
import {
  getTransactionsFromDB,
  saveTransactionsToDB,
  putTransactionInDB,
  deleteTransactionFromDB,
} from "./db"; // Path ke db.ts

// Definisikan ulang interface Transaction agar konsisten dan menyertakan user_id
export interface Transaction {
  // Ekspor agar bisa diimpor db.ts
  id: number;
  user_id: number; // WAJIB ADA untuk indexing di IndexedDB
  type: "income" | "expense";
  amount: number;
  title?: string | null;
  description?: string | null;
  tags?: string | null;
  created_at?: string;
  // Tambahkan flag untuk transaksi yang dibuat/dimodifikasi offline dan belum disinkronkan
  // Ini penting untuk implementasi sinkronisasi penuh (tidak dicakup detail di sini)
  // isOffline?: boolean;
  // tempId?: string; // Untuk ID sementara jika dibuat offline
}

// Definisi tipe data (assuming these are the same as the original, or adapt as needed)
type Theme = "light" | "dark";

interface ApiBaseResponse {
  status: "success" | "error";
  message?: string;
}

interface ApiTransactionSuccessResponse extends ApiBaseResponse {
  status: "success";
  transaction: Omit<Transaction, "user_id">; // API might not return user_id in transaction object
}

interface ApiUpdateUnchangedSuccessResponse extends ApiBaseResponse {
  status: "success";
  message: "Transaction data unchanged";
}

interface ApiLoginSuccessResponse extends ApiBaseResponse {
  status: "success";
  user_id: number;
}

interface ApiSimpleSuccessResponse extends ApiBaseResponse {
  status: "success";
  message: string;
}

type AddUpdateApiResponse =
  | ApiTransactionSuccessResponse
  | ApiUpdateUnchangedSuccessResponse
  | ApiBaseResponse;

type LoginApiResponse = ApiLoginSuccessResponse | ApiBaseResponse;
type SimpleApiResponse = ApiSimpleSuccessResponse | ApiBaseResponse;

const THEME_KEY = "themePreference";
const API_URL = "https://tekizaki.my.id/z_uas_pmt/api.php";
const MESSAGE_TIMEOUT_MS = 5000;

// Utility functions (assuming these are the same or adapt as needed)
function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "";
  const numStr = Number(num).toString();
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseFormattedNumber(str: string): number {
  if (!str) return 0;
  return Number(str.replace(/\./g, ""));
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [type, setType] = useState<"income" | "expense">("income");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [theme, setTheme] = useState<Theme>("light");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [showRegister, setShowRegister] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<
    number | null
  >(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null
  );
  const [isSyncing] = useState(false); // Untuk status sinkronisasi (opsional)

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (error || successMessage) {
      timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, MESSAGE_TIMEOUT_MS);
    }
    return () => clearTimeout(timer);
  }, [error, successMessage]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const callApi = useCallback(
    async <T extends ApiBaseResponse>(
      endpoint: string,
      method: string,
      body?: any
    ): Promise<T> => {
      setIsLoading(true);
      clearMessages();
      try {
        const options: RequestInit = {
          method,
          headers: { "Content-Type": "application/json" },
        };
        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(endpoint, options);
        let responseData: T;

        try {
          responseData = await response.json();
        } catch (jsonError) {
          if (!response.ok) {
            throw new Error(
              `HTTP error ${response.status}: ${response.statusText}. Non-JSON response.`
            );
          }
          responseData = {
            status: "error",
            message: "Invalid JSON response from server",
          } as T;
        }

        if (!response.ok || responseData.status === "error") {
          throw new Error(
            responseData?.message ||
              `Request failed with status ${response.status}`
          );
        }
        return responseData;
      } catch (err: any) {
        console.error(`API call error (${method} ${endpoint}):`, err);
        const errorMessage =
          err.message || "An unexpected network error occurred.";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchTransactionsDirectly = useCallback(
    async (currentUserId: number): Promise<Transaction[]> => {
      setIsLoading(true);
      clearMessages();
      const endpoint = `${API_URL}?user_id=${currentUserId}`;
      try {
        const response = await fetch(endpoint, { method: "GET" });
        let responseData: any;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          if (!response.ok) {
            throw new Error(
              `HTTP error ${response.status}: ${response.statusText}. Non-JSON response.`
            );
          }
          throw new Error(
            "Invalid JSON response received from server despite OK status."
          );
        }

        if (!response.ok) {
          const errorMessage =
            responseData?.message ||
            response.statusText ||
            `Request failed with status ${response.status}`;
          throw new Error(errorMessage);
        }

        if (!Array.isArray(responseData)) {
          console.error(
            "Received non-array data for transactions:",
            responseData
          );
          throw new Error(
            "Failed to load transactions: Invalid data format received."
          );
        }

        const formattedTransactions = responseData.map((tx: any) => ({
          id: Number(tx.id),
          user_id: currentUserId, // Ensure user_id is part of the transaction object
          type: tx.type,
          amount: Number(tx.amount),
          title: tx.title ?? null,
          description: tx.description ?? null,
          tags: tx.tags ?? null,
          created_at: tx.created_at,
        }));
        return formattedTransactions as Transaction[];
      } catch (err: any) {
        console.error(`API call error (GET ${endpoint}):`, err);
        setError(err.message || "Failed to fetch transactions.");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchTransactions = useCallback(
    async (currentUserId: number) => {
      if (!currentUserId) return;
      clearMessages();

      if (isOnline) {
        try {
          setIsLoading(true);
          const onlineTransactions = await fetchTransactionsDirectly(
            currentUserId
          );
          setTransactions(onlineTransactions);
          await saveTransactionsToDB(onlineTransactions, currentUserId);
          console.log("Transactions fetched from API and saved to DB.");
        } catch (err: any) {
          setError(
            `Failed to fetch from server: ${err.message}. Trying local data...`
          );
          try {
            const localTransactions = await getTransactionsFromDB(
              currentUserId
            );
            if (localTransactions.length > 0) {
              setTransactions(localTransactions);
              setSuccessMessage("Displaying locally cached transactions.");
            } else {
              setError(
                `Failed to fetch from server and no local data for user ${currentUserId}.`
              );
              setTransactions([]);
            }
          } catch (dbError: any) {
            setError(`Failed to fetch from server and DB: ${dbError.message}`);
            setTransactions([]);
          }
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(true);
        setError("You are offline. Displaying locally stored data.");
        try {
          const localTransactions = await getTransactionsFromDB(currentUserId);
          setTransactions(localTransactions);
          if (localTransactions.length === 0) {
            setSuccessMessage(
              "No local transactions found for offline display."
            );
          }
        } catch (dbError: any) {
          setError(`Error fetching local data: ${dbError.message}`);
          setTransactions([]);
        } finally {
          setIsLoading(false);
        }
      }
    },
    [
      isOnline,
      fetchTransactionsDirectly,
      saveTransactionsToDB,
      getTransactionsFromDB,
    ] // Added DB functions to deps
  );

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    let parsedUserIdFromStorage: number | null = null;

    if (storedUserId) {
      const parsed = parseInt(storedUserId, 10);
      if (!isNaN(parsed)) {
        parsedUserIdFromStorage = parsed;
        setIsLoggedIn(true);
        setUserId(parsed);
      } else {
        localStorage.removeItem("userId");
      }
    }

    if ("serviceWorker" in navigator) {
      const swUrl = `${import.meta.env.BASE_URL || "/"}service-worker.js`;
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register(swUrl)
          .then((registration) =>
            console.log("SW registered:", registration.scope)
          )
          .catch((error) => console.error("SW registration failed:", error));
      });
    }

    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);

    const handleOnlineStatus = () => {
      setIsOnline(true);
      setSuccessMessage("You are back online!");
      if (userId) {
        // Use component's userId state which should be set
        fetchTransactions(userId);
      }
    };
    const handleOfflineStatus = () => {
      setIsOnline(false);
      setError("You are currently offline. Some features might be limited.");
    };

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOfflineStatus);

    // Initial fetch if user ID was loaded from storage
    if (parsedUserIdFromStorage) {
      fetchTransactions(parsedUserIdFromStorage);
    }

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOfflineStatus);
    };
  }, [fetchTransactions]); // userId is managed by state, fetchTransactions is the key dependency

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, "");
    if (rawValue === "" || /^[0-9]+$/.test(rawValue)) {
      const numValue = Number(rawValue);
      setAmount(rawValue === "" ? "" : formatNumber(numValue));
    }
  };

  const clearForm = useCallback(() => {
    setAmount("");
    setType("income");
    setTitle("");
    setDescription("");
    setTags("");
    setEditingTransactionId(null);
  }, []);

  const handleAddOrUpdateTransaction = async () => {
    if (!userId) {
      setError("Cannot save transaction: User not logged in.");
      return;
    }
    const parsedAmount = parseFormattedNumber(amount);
    if (amount === "" || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid, positive amount for the transaction.");
      return;
    }
    clearMessages();

    // Base transaction data, ID and created_at will be set later
    const baseTransactionData = {
      user_id: userId,
      type: type,
      amount: parsedAmount,
      title: title.trim() || null,
      description: description.trim() || null,
      tags:
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .join(",") || null,
    };

    if (isOnline) {
      try {
        setIsLoading(true);
        let resultData: AddUpdateApiResponse;
        if (editingTransactionId !== null) {
          // Updating existing transaction online
          resultData = await callApi<AddUpdateApiResponse>(API_URL, "PUT", {
            ...baseTransactionData,
            transaction_id: editingTransactionId,
          });
          if (resultData.status === "success") {
            if ("transaction" in resultData && resultData.transaction) {
              const updatedTxApi: Transaction = {
                ...resultData.transaction, // API response
                id: Number(resultData.transaction.id), // Ensure ID is number
                amount: Number(resultData.transaction.amount), // Ensure amount is number
                user_id: userId, // Ensure user_id is present
              };
              setTransactions((prev) =>
                prev.map((tx) =>
                  tx.id === editingTransactionId ? updatedTxApi : tx
                )
              );
              await putTransactionInDB(updatedTxApi);
              setSuccessMessage("Transaction updated successfully!");
            } else if (resultData.message === "Transaction data unchanged") {
              setSuccessMessage("Transaction data was unchanged.");
            } else {
              setSuccessMessage(resultData.message || "Transaction updated.");
            }
            clearForm();
          }
        } else {
          // Adding new transaction online
          resultData = await callApi<AddUpdateApiResponse>(API_URL, "POST", {
            action: "add_transaction",
            ...baseTransactionData,
          });
          if (
            resultData.status === "success" &&
            "transaction" in resultData &&
            resultData.transaction
          ) {
            const newTxApi: Transaction = {
              ...resultData.transaction,
              id: Number(resultData.transaction.id),
              amount: Number(resultData.transaction.amount),
              user_id: userId,
            };
            setTransactions((prev) => [newTxApi, ...prev]);
            await putTransactionInDB(newTxApi);
            setSuccessMessage("Transaction added successfully!");
            clearForm();
          }
        }
      } catch (err: any) {
        //setError(`Operation failed online: ${err.message}. Data not saved.`); // callApi already sets error
      } finally {
        setIsLoading(false);
      }
    } else {
      // OFFLINE
      setError(
        "You are offline. This action will be processed locally and synced when online."
      );
      setIsLoading(true); // Simulate loading for local op
      try {
        if (editingTransactionId !== null) {
          const optimisticUpdate: Transaction = {
            ...baseTransactionData,
            id: editingTransactionId, // Keep existing ID
            created_at:
              transactions.find((tx) => tx.id === editingTransactionId)
                ?.created_at || new Date().toISOString(), // Keep original created_at or new if not found
            // isOffline: true, // Flag for sync mechanism
          };
          setTransactions((prev) =>
            prev.map((tx) =>
              tx.id === editingTransactionId ? optimisticUpdate : tx
            )
          );
          await putTransactionInDB(optimisticUpdate);
          setSuccessMessage("Transaction updated locally (offline).");
        } else {
          const tempId = Date.now(); // Temporary ID for offline creation
          const optimisticNew: Transaction = {
            ...baseTransactionData,
            id: tempId, // Use temporary ID
            created_at: new Date().toISOString(),
            // isOffline: true, // Flag for sync mechanism
            // tempId: `offline_${tempId}` // Store tempId for sync resolution
          };
          setTransactions((prev) => [optimisticNew, ...prev]);
          await putTransactionInDB(optimisticNew); // This will use tempId as primary key in DB
          setSuccessMessage("Transaction added locally (offline).");
        }
        clearForm();
      } catch (dbError: any) {
        setError(`Failed to save locally: ${dbError.message}`);
      } finally {
        setIsLoading(false);
      }
      // PENTING: Requires a robust sync mechanism to handle tempId resolution
      // and push changes to server when back online.
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setAmount(formatNumber(transaction.amount));
    setType(transaction.type);
    setTitle(transaction.title || "");
    setDescription(transaction.description || "");
    setTags(transaction.tags || "");
    clearMessages();
    const formElement = document.querySelector(".form-container");
    formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!userId) {
      setError("Cannot delete: User not logged in.");
      return;
    }
    clearMessages();

    if (
      window.confirm(
        `Are you sure you want to permanently delete transaction ID ${transactionId}?`
      )
    ) {
      if (isOnline) {
        setIsLoading(true);
        try {
          const result = await callApi<SimpleApiResponse>(
            `${API_URL}?user_id=${userId}&transaction_id=${transactionId}`,
            "DELETE"
          );
          if (result.status === "success") {
            setTransactions((prev) =>
              prev.filter((tx) => tx.id !== transactionId)
            );
            await deleteTransactionFromDB(transactionId);
            setSuccessMessage(
              result.message || "Transaction deleted successfully!"
            );
            if (editingTransactionId === transactionId) clearForm();
          }
        } catch (err: any) {
          // setError handled by callApi
        } finally {
          setIsLoading(false);
        }
      } else {
        // OFFLINE
        setError(
          "You are offline. Transaction will be deleted locally and synced when online."
        );
        setIsLoading(true);
        try {
          setTransactions((prev) =>
            prev.filter((tx) => tx.id !== transactionId)
          );
          await deleteTransactionFromDB(transactionId); // This assumes transactionId is the correct ID in DB
          setSuccessMessage("Transaction deleted locally (offline).");
          if (editingTransactionId === transactionId) clearForm();
          // PENTING: Requires sync mechanism to tell server about this deletion.
        } catch (dbError: any) {
          setError(`Failed to delete locally: ${dbError.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const toggleTheme = () => {
    const newTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  const handleLogin = async (username: string, password: string) => {
    clearMessages();
    try {
      const data = await callApi<LoginApiResponse>(API_URL, "POST", {
        action: "login",
        username,
        password,
      });

      if (data.status === "success" && "user_id" in data) {
        setIsLoggedIn(true);
        const newUserId = data.user_id;
        setUserId(newUserId);
        localStorage.setItem("userId", newUserId.toString());
        fetchTransactions(newUserId); // Fetch transactions for the logged-in user
        setShowRegister(false);
        clearForm();
        setSelectedTagFilter(null);
        // setSuccessMessage("Login successful!"); // Optional
      } else {
        // setError(data.message || "Login failed: Invalid response from server."); // Handled by callApi
      }
    } catch (err) {
      // Error already set by callApi
    }
  };

  const handleRegister = async (username: string, password: string) => {
    clearMessages();
    try {
      const data = await callApi<SimpleApiResponse>(API_URL, "POST", {
        action: "register",
        username,
        password,
      });

      if (data.status === "success") {
        setSuccessMessage(
          data.message || "Registration successful! Please login."
        );
        setShowRegister(false);
      } else {
        // setError(data.message || "Registration failed: Invalid response."); // Handled by callApi
      }
    } catch (err) {
      // Error already set by callApi
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    setUserId(null);
    setTransactions([]);
    clearForm();
    clearMessages();
    setSelectedTagFilter(null);
    // setSuccessMessage("Logged out successfully."); // Optional
  };

  const uniqueTags = useMemo(() => {
    const allTags = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.tags) {
        tx.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .forEach((tag) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!selectedTagFilter) return transactions;
    return transactions.filter(
      (tx) =>
        tx.tags &&
        tx.tags
          .split(",")
          .map((t) => t.trim())
          .includes(selectedTagFilter)
    );
  }, [transactions, selectedTagFilter]);

  const { totalIncome, totalExpenses, totalBalance } = useMemo(() => {
    const income = transactions.reduce(
      (acc, curr) => acc + (curr.type === "income" ? curr.amount : 0),
      0
    );
    const expenses = transactions.reduce(
      (acc, curr) => acc + (curr.type === "expense" ? curr.amount : 0),
      0
    );
    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalBalance: income - expenses,
    };
  }, [transactions]);

  const filteredSummary = useMemo(() => {
    if (!selectedTagFilter) return { income: 0, expenses: 0 }; // Default to 0 if no filter
    const income = filteredTransactions.reduce(
      (acc, curr) => acc + (curr.type === "income" ? curr.amount : 0),
      0
    );
    const expenses = filteredTransactions.reduce(
      (acc, curr) => acc + (curr.type === "expense" ? curr.amount : 0),
      0
    );
    return { income, expenses };
  }, [selectedTagFilter, filteredTransactions]);

  const handleTagFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTagFilter(e.target.value || null);
  };

  const renderMessages = () => (
    <>
      {error && (
        <p className="error-message app-error" aria-live="assertive">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="success-message app-success" aria-live="assertive">
          {successMessage}
        </p>
      )}
    </>
  );

  return (
    <div className="app">
      {!isLoggedIn ? (
        <div className="auth-container">
          {renderMessages()}
          {isLoading && <p className="loading-indicator">Loading...</p>}
          {showRegister ? (
            <Register
              onRegister={handleRegister}
              onSwitchToLogin={() => {
                setShowRegister(false);
                clearMessages();
              }}
            />
          ) : (
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => {
                setShowRegister(true);
                clearMessages();
              }}
            />
          )}
        </div>
      ) : (
        <>
          <header className="header">
            <h1>Personalized Money Tracker</h1>
            <div className="controls">
              <div
                className={`connection-status ${
                  isOnline ? "online" : "offline"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
                {isSyncing && isOnline && " (Syncing...)"}
              </div>
              <button
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${
                  theme === "light" ? "dark" : "light"
                } mode`}
              >
                {theme === "light" ? "🌙 Dark" : "☀️ Light"}
              </button>
              <button
                className="logout-button"
                onClick={handleLogout}
                disabled={isLoading}
              >
                Logout
              </button>
            </div>
          </header>
          {renderMessages()}
          <main className="main-content">
            <section className="form-container">
              <h2 id="form-title">
                {editingTransactionId
                  ? "Edit Transaction"
                  : "Add New Transaction"}
              </h2>
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddOrUpdateTransaction();
                }}
                aria-labelledby="form-title"
              >
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="type">Type:</label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) =>
                        setType(e.target.value as "income" | "expense")
                      }
                      disabled={isLoading}
                      required
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="amount">Amount:</label>
                    <input
                      id="amount"
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="e.g., 50.000"
                      disabled={isLoading}
                      required
                      aria-required="true"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="title">Title (Optional):</label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Salary, Groceries"
                      maxLength={100}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="description">Description (Optional):</label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Monthly pay, Weekly shop"
                      rows={3}
                      disabled={isLoading}
                    ></textarea>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="tags">
                      Tags (Optional, comma-separated):
                    </label>
                    <input
                      id="tags"
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., work, food, bills"
                      maxLength={255}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="button"
                    disabled={isLoading} // Button is enabled offline, logic handles behavior
                  >
                    {isLoading
                      ? "Saving..."
                      : editingTransactionId
                      ? "Update Transaction"
                      : "Add Transaction"}
                  </button>
                  {editingTransactionId && (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={clearForm}
                      disabled={isLoading}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section
              className="summary-container"
              aria-label="Overall Financial Summary"
            >
              <h3 className="summary-heading">Overall Summary</h3>
              <p>
                <strong>Income:</strong>{" "}
                <span>Rp{formatNumber(totalIncome)}</span>
              </p>
              <p>
                <strong>Expenses:</strong>{" "}
                <span>Rp{formatNumber(totalExpenses)}</span>
              </p>
              <p>
                <strong>Balance:</strong>{" "}
                <span>Rp{formatNumber(totalBalance)}</span>
              </p>
            </section>

            <section className="transactions">
              <h2>History</h2>
              {uniqueTags.length > 0 && (
                <div className="tag-filter-container">
                  <label htmlFor="tag-filter">Filter by Tag:</label>
                  <select
                    id="tag-filter"
                    value={selectedTagFilter ?? ""}
                    onChange={handleTagFilterChange}
                    disabled={isLoading}
                  >
                    <option value="">All Tags</option>
                    {uniqueTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {selectedTagFilter && (
                <div className="filtered-summary" aria-live="polite">
                  <h3>Summary for Tag: "{selectedTagFilter}"</h3>
                  <div className="filtered-summary-details">
                    <p>
                      <strong>Income:</strong> Rp
                      {formatNumber(filteredSummary.income)}
                    </p>
                    <p>
                      <strong>Expenses:</strong> Rp
                      {formatNumber(filteredSummary.expenses)}
                    </p>
                  </div>
                </div>
              )}
              {isLoading && transactions.length === 0 && (
                <p className="loading-indicator">Loading history...</p>
              )}
              {!isLoading && filteredTransactions.length === 0 && (
                <p className="transaction-item empty">
                  {selectedTagFilter
                    ? `No transactions found with the tag "${selectedTagFilter}".`
                    : transactions.length === 0
                    ? "No transactions recorded yet."
                    : "No transactions match the current filter."}
                </p>
              )}
              {filteredTransactions.length > 0 && (
                <ul
                  aria-label={`Transaction History List${
                    selectedTagFilter
                      ? ` (filtered by tag: ${selectedTagFilter})`
                      : ""
                  }`}
                >
                  {filteredTransactions.map((transaction) => (
                    <li
                      key={transaction.id} // Offline IDs might be temporary (e.g. timestamp)
                      className={`transaction-item ${transaction.type}`}
                    >
                      <div className="transaction-details">
                        <span className="transaction-title">
                          <span>
                            {transaction.title ||
                              transaction.type.charAt(0).toUpperCase() +
                                transaction.type.slice(1)}
                          </span>
                          <span className="transaction-amount">
                            {transaction.type === "income" ? "+" : "-"}Rp
                            {formatNumber(transaction.amount)}
                          </span>
                        </span>
                        {transaction.description && (
                          <p className="transaction-description">
                            {transaction.description}
                          </p>
                        )}
                        {transaction.tags && (
                          <div className="transaction-tags" aria-label="Tags">
                            {transaction.tags
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                              .map((tag, index) => (
                                <span key={index} className="tag">
                                  {tag}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="transaction-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditTransaction(transaction)}
                          disabled={
                            isLoading || editingTransactionId === transaction.id
                          }
                          aria-label={`Edit transaction: ${
                            transaction.title || transaction.type
                          } for Rp${formatNumber(transaction.amount)}`}
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDeleteTransaction(transaction.id)
                          }
                          disabled={isLoading}
                          aria-label={`Delete transaction: ${
                            transaction.title || transaction.type
                          } for Rp${formatNumber(transaction.amount)}`}
                        >
                          🗑️
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

export default App;
