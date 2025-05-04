import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./App.css";
import Login from "./Login";
import Register from "./Register";

interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  title?: string | null;
  description?: string | null;
  tags?: string | null;
  created_at?: string;
}

type Theme = "light" | "dark";

interface ApiBaseResponse {
  status: "success" | "error";
  message?: string;
}

interface ApiTransactionSuccessResponse extends ApiBaseResponse {
  status: "success";
  transaction: Transaction;
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
  | ApiUpdateUnchangedSuccessResponse;
type LoginApiResponse = ApiLoginSuccessResponse | ApiBaseResponse;
type SimpleApiResponse = ApiSimpleSuccessResponse | ApiBaseResponse;

const THEME_KEY = "themePreference";
const API_URL = "https://tekizaki.my.id/z_uas_pmt/api.php";

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
  const headingClassName =
    theme === "dark"
      ? "summary-heading dark-mode"
      : "summary-heading light-mode";
  const [editingTransactionId, setEditingTransactionId] = useState<
    number | null
  >(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(
    null
  );

  const callApi = useCallback(
    async <T = ApiBaseResponse,>(
      endpoint: string,
      method: string,
      body?: any
    ): Promise<T> => {
      setIsLoading(true);
      setError(null);
      try {
        const options: RequestInit = {
          method,
          headers: {
            "Content-Type": "application/json",
          },
        };
        if (body) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(endpoint, options);

        let responseData: any;
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
          };
        }

        if (!response.ok) {
          throw new Error(
            responseData?.message ||
              `Request failed with status ${response.status}`
          );
        }

        return responseData as T;
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

  const fetchTransactions = useCallback(
    async (currentUserId: number) => {
      if (!currentUserId) return;
      try {
        const data = await callApi<Transaction[]>(
          `${API_URL}?user_id=${currentUserId}`,
          "GET"
        );

        if (Array.isArray(data)) {
          const formattedTransactions = data.map((tx) => ({
            ...tx,
            id: Number(tx.id),
            amount: Number(tx.amount),
            title: tx.title ?? null,
            description: tx.description ?? null,
            tags: tx.tags ?? null,
          }));
          setTransactions(formattedTransactions);
        } else {
          console.error("Received non-array data for transactions:", data);
          setTransactions([]);
          setError(
            "Failed to load transactions: Invalid data format received."
          );
        }
      } catch (err) {
        setTransactions([]);
      }
    },
    [callApi]
  );

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      const parsedUserId = parseInt(storedUserId, 10);
      if (!isNaN(parsedUserId)) {
        setIsLoggedIn(true);
        setUserId(parsedUserId);
        fetchTransactions(parsedUserId);
      } else {
        localStorage.removeItem("userId");
        setIsLoggedIn(false);
        setUserId(null);
      }
    } else {
      setIsLoggedIn(false);
      setUserId(null);
    }

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/service-worker.js").then(
          (registration) => console.log("SW registered:", registration.scope),
          (error) => console.error("SW registration failed:", error)
        );
      });
    }

    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const initialTheme =
      savedTheme ||
      (window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchTransactions]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, "");
    if (rawValue === "" || /^[0-9]+$/.test(rawValue)) {
      const numValue = Number(rawValue);
      setAmount(rawValue === "" ? "" : formatNumber(numValue));
    }
  };

  const clearForm = () => {
    setAmount("");
    setType("income");
    setTitle("");
    setDescription("");
    setTags("");
    setEditingTransactionId(null);
  };

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
    setError(null);

    const transactionPayload = {
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

    try {
      let resultData: AddUpdateApiResponse;

      if (editingTransactionId !== null) {
        resultData = await callApi<AddUpdateApiResponse>(API_URL, "PUT", {
          ...transactionPayload,
          transaction_id: editingTransactionId,
        });

        if (resultData.status === "success") {
          if ("transaction" in resultData) {
            const updatedTx = {
              ...resultData.transaction,
              id: Number(resultData.transaction.id),
              amount: Number(resultData.transaction.amount),
            };
            setTransactions((prev) =>
              prev.map((tx) =>
                tx.id === editingTransactionId ? updatedTx : tx
              )
            );
            console.log("Transaction updated successfully:", updatedTx.id);
          } else if (resultData.message === "Transaction data unchanged") {
            console.log("Transaction data was unchanged.");
          }
          clearForm();
        }
      } else {
        resultData = await callApi<ApiTransactionSuccessResponse>(
          API_URL,
          "POST",
          { action: "add_transaction", ...transactionPayload }
        );

        if (resultData.status === "success" && resultData.transaction) {
          const newTransaction = {
            ...resultData.transaction,
            id: Number(resultData.transaction.id),
            amount: Number(resultData.transaction.amount),
          };
          setTransactions((prev) => [newTransaction, ...prev]);
          console.log("Transaction added successfully:", newTransaction.id);
          clearForm();
        }
      }
    } catch (err) {
      alert(
        `Operation failed: ${
          error || "Please check the details and try again."
        }`
      );
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id);
    setAmount(formatNumber(transaction.amount));
    setType(transaction.type);
    setTitle(transaction.title || "");
    setDescription(transaction.description || "");
    setTags(transaction.tags || "");
    setError(null);
    const formElement = document.querySelector(".form-container");
    formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!userId) {
      setError("Cannot delete: User not logged in.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to permanently delete transaction ID ${transactionId}?`
      )
    ) {
      try {
        await callApi<ApiSimpleSuccessResponse>(
          `${API_URL}?user_id=${userId}&transaction_id=${transactionId}`,
          "DELETE"
        );

        setTransactions(transactions.filter((tx) => tx.id !== transactionId));
        console.log("Transaction deleted successfully:", transactionId);

        if (editingTransactionId === transactionId) {
          clearForm();
        }
      } catch (err) {
        alert(
          `Failed to delete transaction: ${
            error || "An unknown error occurred."
          }`
        );
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
    try {
      const data = await callApi<LoginApiResponse>(API_URL, "POST", {
        action: "login",
        username,
        password,
      });

      if (data.status === "success" && "user_id" in data) {
        setIsLoggedIn(true);
        setUserId(data.user_id);
        localStorage.setItem("userId", data.user_id.toString());
        fetchTransactions(data.user_id);
        setShowRegister(false);
        clearForm();
        setError(null);
        setSelectedTagFilter(null);
      } else {
        throw new Error(
          data.message || "Login failed: Invalid response from server."
        );
      }
    } catch (err: any) {
      alert(`Login failed: ${error || "Please check credentials."}`);
    }
  };
  const handleRegister = async (username: string, password: string) => {
    try {
      const data = await callApi<SimpleApiResponse>(API_URL, "POST", {
        action: "register",
        username,
        password,
      });

      if (data.status === "success") {
        alert(data.message || "Registration successful! Please login.");
        setShowRegister(false);
        setError(null);
      } else {
        throw new Error(
          data.message || "Registration failed: Invalid response."
        );
      }
    } catch (err: any) {
      alert(`Registration failed: ${error || "Username might be taken."}`);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    setUserId(null);
    setTransactions([]);
    clearForm();
    setError(null);
    setSelectedTagFilter(null);
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
    if (!selectedTagFilter) {
      return transactions;
    }
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
    if (!selectedTagFilter) {
      return { income: 0, expenses: 0 };
    }
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

  return (
    <div className="app">
      {!isLoggedIn ? (
        <div className="auth-container">
          {error && <p className="error-message auth-error">{error}</p>}
          {isLoading && <p className="loading-indicator">Loading...</p>}
          {showRegister ? (
            <Register
              onRegister={handleRegister}
              onSwitchToLogin={() => {
                setShowRegister(false);
                setError(null);
              }}
            />
          ) : (
            <Login
              onLogin={handleLogin}
              onSwitchToRegister={() => {
                setShowRegister(true);
                setError(null);
              }}
            />
          )}
        </div>
      ) : (
        <>
          <header className="header">
            <h1>Money Tracker</h1>
            <div className="controls">
              <div
                className={`connection-status ${
                  isOnline ? "online" : "offline"
                }`}
              >
                {isOnline ? "Online" : "Offline"}
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
          {error && <p className="error-message app-error">{error}</p>}
          <main className="main-content">
            <section className="form-container">
              <h2>
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
                    disabled={isLoading || !isOnline}
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
              <h3 className={headingClassName}>Overall Summary</h3>
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
                      key={transaction.id}
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
