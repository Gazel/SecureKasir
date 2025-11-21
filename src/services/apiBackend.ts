// src/services/apiBackend.ts
import type { Transaction, Product } from "../types";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

/* ============ TRANSACTIONS ============ */

export async function fetchTransactionsOnline(): Promise<Transaction[]> {
  const res = await fetch(`${API_URL}/api/transactions`);
  if (!res.ok) {
    console.error("Failed fetching transactions", res.status);
    return [];
  }
  return await res.json();
}

export async function saveTransactionOnline(
  transaction: Transaction
): Promise<{ success: boolean }> {
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

/* ============ PRODUCTS ============ */

export async function fetchProductsOnline(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products`);

  if (!res.ok) {
    console.error("Failed fetching products", res.status);
    return [];
  }

  const data = await res.json();

  // Normalise ID to string & numeric fields
  return (data as any[]).map((p) => ({
    id: String(p.id),
    name: p.name,
    price: Number(p.price),
    image: p.image ?? "",
    category: p.category ?? "",
    stock: Number(p.stock ?? 0),
  }));
}

export async function createProductOnline(
  product: Omit<Product, "id">
): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
    throw new Error("Failed creating product");
  }

  const data = await res.json();
  return {
    id: String(data.id),
    name: data.name,
    price: Number(data.price),
    image: data.image ?? "",
    category: data.category ?? "",
    stock: Number(data.stock ?? 0),
  };
}

export async function updateProductOnline(
  id: string,
  product: Omit<Product, "id">
): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
    throw new Error("Failed updating product");
  }

  const data = await res.json();
  return {
    id: String(data.id),
    name: data.name,
    price: Number(data.price),
    image: data.image ?? "",
    category: data.category ?? "",
    stock: Number(data.stock ?? 0),
  };
}

export async function deleteProductOnline(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed deleting product");
  }
}
