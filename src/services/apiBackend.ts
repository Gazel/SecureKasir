const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://149.28.12.181:4000";

export async function saveTransactionOnline(transaction: any) {
  return fetch(`${API_BASE}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction),
  });
}

export async function fetchTransactionsOnline() {
  const res = await fetch(`${API_BASE}/api/transactions`);
  return res.json();
}
