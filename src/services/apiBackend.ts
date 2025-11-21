// src/services/apiBackend.ts
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function fetchTransactionsOnline() {
  const res = await fetch(`${API_URL}/api/transactions`);
  if (!res.ok) {
    console.error("Failed fetching transactions", res.status);
    return [];
  }
  return await res.json();
}

export async function saveTransactionOnline(transaction: any) {
  const res = await fetch(`${API_URL}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });

  if (!res.ok) {
    throw new Error("Failed saving transaction");
  }

  return await res.json();
}
