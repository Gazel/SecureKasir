// src/services/apiBackend.ts
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// ========= TRANSACTIONS =========
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

// ========= PRODUCTS =========
export async function fetchProductsOnline() {
  const res = await fetch(`${API_URL}/api/products`);
  if (!res.ok) {
    console.error("Failed fetching products", res.status);
    return [];
  }
  return await res.json();
}

export async function createProductOnline(product: any) {
  const res = await fetch(`${API_URL}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
    throw new Error("Failed creating product");
  }

  return await res.json();
}

export async function updateProductOnline(product: any) {
  const res = await fetch(`${API_URL}/api/products/${product.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
    throw new Error("Failed updating product");
  }

  return await res.json();
}

export async function deleteProductOnline(id: string) {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed deleting product");
  }

  return await res.json();
}
