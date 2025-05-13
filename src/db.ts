// src/db.ts
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Transaction } from "./App"; // Asumsi Transaction didefinisikan di App.tsx atau file types terpisah

const DB_NAME = "pmt-db";
const DB_VERSION = 1;
const TRANSACTIONS_STORE_NAME = "transactions";

interface PmtDB extends DBSchema {
  [TRANSACTIONS_STORE_NAME]: {
    key: number; // id
    value: Transaction;
    indexes: { "by-userId": number }; // Index berdasarkan userId
  };
  // Anda bisa menambahkan store lain di sini jika perlu (misal, untuk antrian request)
}

let dbPromise: Promise<IDBPDatabase<PmtDB>> | null = null;

const getDb = (): Promise<IDBPDatabase<PmtDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<PmtDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Upgrading DB from ${oldVersion} to ${newVersion}`);
        if (!db.objectStoreNames.contains(TRANSACTIONS_STORE_NAME)) {
          const store = db.createObjectStore(TRANSACTIONS_STORE_NAME, {
            keyPath: "id",
            // autoIncrement: true, // Tidak perlu jika ID dari server
          });
          // Buat index berdasarkan userId untuk mempermudah query per pengguna
          store.createIndex("by-userId", "user_id"); // Nama field di Transaction harus 'user_id'
        }
        // Handle upgrade skema lain di sini jika versi bertambah
      },
    });
  }
  return dbPromise;
};

export async function getTransactionsFromDB(
  userId: number
): Promise<Transaction[]> {
  const db = await getDb();
  // Pastikan object store ada dan index 'by-userId' ada
  if (!db.objectStoreNames.contains(TRANSACTIONS_STORE_NAME)) {
    console.warn("Transactions store not found in DB");
    return [];
  }
  const tx = db.transaction(TRANSACTIONS_STORE_NAME, "readonly");
  const store = tx.objectStore(TRANSACTIONS_STORE_NAME);

  // Cek apakah index ada sebelum menggunakannya
  if (Array.from(store.indexNames).includes("by-userId")) {
    const index = store.index("by-userId");
    return index.getAll(userId);
  } else {
    console.warn(
      "Index by-userId not found, fetching all and filtering client-side."
    );
    // Fallback: Ambil semua dan filter di client (kurang efisien)
    const allTransactions = await store.getAll();
    // @ts-ignore // user_id mungkin tidak secara eksplisit di Transaction, tambahkan jika perlu
    return allTransactions.filter((t) => t.user_id === userId);
  }
}

export async function saveTransactionsToDB(
  transactions: Transaction[],
  userIdToClear?: number
) {
  const db = await getDb();
  const tx = db.transaction(TRANSACTIONS_STORE_NAME, "readwrite");
  const store = tx.objectStore(TRANSACTIONS_STORE_NAME);

  if (userIdToClear) {
    // Hapus transaksi lama milik pengguna ini sebelum menyimpan yang baru
    // Ini penting untuk sinkronisasi agar tidak ada duplikat atau data basi
    const index = store.index("by-userId");
    let cursor = await index.openCursor(userIdToClear);
    while (cursor) {
      await store.delete(cursor.primaryKey); // Hapus dengan primary key (id transaksi)
      cursor = await cursor.continue();
    }
  }

  // Tambahkan transaksi baru
  // Gunakan Promise.all untuk efisiensi
  await Promise.all(transactions.map((transaction) => store.put(transaction)));
  return tx.done; // Pastikan transaksi selesai
}

// Fungsi untuk menambah/update satu transaksi di DB
export async function putTransactionInDB(transaction: Transaction) {
  const db = await getDb();
  return db.put(TRANSACTIONS_STORE_NAME, transaction);
}

// Fungsi untuk menghapus satu transaksi dari DB
export async function deleteTransactionFromDB(transactionId: number) {
  const db = await getDb();
  return db.delete(TRANSACTIONS_STORE_NAME, transactionId);
}

// Pastikan untuk memodifikasi interface Transaction di App.tsx (atau file types)
// agar menyertakan 'user_id' jika belum ada, karena index 'by-userId' membutuhkannya.
// interface Transaction {
//   id: number;
//   user_id: number; // <--- TAMBAHKAN INI JIKA BELUM ADA
//   type: "income" | "expense";
//   // ... sisa field
// }
