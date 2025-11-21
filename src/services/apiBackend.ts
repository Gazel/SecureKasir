// src/services/apiBackend.ts
import type { Transaction, Product } from "../types";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// helper to attach token
function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/* ============ TRANSACTIONS ============ */

export async function fetchTransactionsOnline(
  token: string
): Promise<Transaction[]> {
  const res = await fetch(`${API_URL}/api/transactions`, {
    headers: authHeader(token),
  });

  if (!res.ok) {
    console.error("Failed fetching transactions", res.status);
    return [];
  }

  const data = await res.json();

  // normalize minimal (optional but safe)
  return (data as any[]).map((t) => ({
    ...t,
    id: String(t.id),
    subtotal: Number(t.subtotal ?? 0),
    discount: Number(t.discount ?? 0),
    total: Number(t.total ?? 0),
    status: t.status || "SUCCESS",
    items: (t.items || []).map((it: any) => ({
      ...it,
      productId: String(it.productId ?? ""),
      price: Number(it.price ?? 0),
      quantity: Number(it.quantity ?? 0),
      subtotal: Number(it.subtotal ?? 0),
    })),
  })) as Transaction[];
}

export async function saveTransactionOnline(
  transaction: Omit<Transaction, "id">, // backend generates ID
  token: string
): Promise<{ success: boolean; id: string }> {
  const res = await fetch(`${API_URL}/api/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
    body: JSON.stringify(transaction),
  });

  if (!res.ok) {
    throw new Error("Failed saving transaction");
  }

  return await res.json(); // { success, id }
}

/* ============ PRODUCTS ============ */

export async function fetchProductsOnline(
  token: string
): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products`, {
    headers: authHeader(token),
  });

  if (!res.ok) {
    console.error("Failed fetching products", res.status);
    return [];
  }

  const data = await res.json();

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
  product: Omit<Product, "id">,
  token: string
): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
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
  product: Omit<Product, "id">,
  token: string
): Promise<Product> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(token),
    },
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

export async function deleteProductOnline(
  id: string,
  token: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/products/${id}`, {
    method: "DELETE",
    headers: authHeader(token),
  });

  if (!res.ok) {
    throw new Error("Failed deleting product");
  }
}
