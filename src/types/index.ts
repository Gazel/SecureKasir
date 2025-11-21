export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;     // still here for backward compat, even if UI hides it
  category: string;
  stock: number | null; // null = unlimited
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export type PaymentMethod = "cash" | "qris" | "cancelled";
export type TransactionStatus = "SUCCESS" | "CANCELLED";

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  date: string;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  change: number;
  customerName?: string;
  note?: string;
  status?: TransactionStatus; // optional on client send, backend will default
}
