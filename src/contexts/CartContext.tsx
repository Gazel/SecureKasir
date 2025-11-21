import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Transaction } from "../types";

import {
  fetchTransactionsOnline,
  saveTransactionOnline,
} from "../services/apiBackend";

import { useAuth } from "./AuthContext"; // ✅ get JWT

interface CartContextProps {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "subtotal">) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  discount: number;
  setDiscount: (discount: number) => void;
  transactions: Transaction[];
  reloadTransactions: () => Promise<void>;

  // UPDATED: addTransaction now receives token automatically
  addTransaction: (transaction: Omit<Transaction, "id">, token?: string) => Promise<void>;

  calculateTotal: () => { subtotal: number; total: number };
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { token } = useAuth(); // ✅ auth token

  const reloadTransactions = async () => {
    const data = await fetchTransactionsOnline();
    setTransactions(data);
  };

  useEffect(() => {
    reloadTransactions();
  }, []);

  const addToCart = (item: Omit<CartItem, "subtotal">) => {
    const existingItem = cart.find((i) => i.productId === item.productId);

    if (existingItem) {
      updateQuantity(item.productId, existingItem.quantity + item.quantity);
    } else {
      const newItem: CartItem = {
        ...item,
        subtotal: item.price * item.quantity,
      };
      setCart((prev) => [...prev, newItem]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity, subtotal: item.price * quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
    const total = subtotal - discount;
    return { subtotal, total: total < 0 ? 0 : total };
  };

  /**
   * IMPORTANT UPDATE:
   * - Now we send JWT token to backend
   * - Works for both:
   *   addTransaction(trx)
   *   addTransaction(trx, token)
   */
  const addTransaction = async (transaction: Omit<Transaction, "id">, customToken?: string) => {
    const authToken = customToken || token;

    if (!authToken) {
      alert("Session login habis / belum login. Silakan login dulu.");
      throw new Error("Missing token");
    }

    await saveTransactionOnline(transaction, authToken); // ✅ token sent
    await reloadTransactions();
    clearCart();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        discount,
        setDiscount,
        transactions,
        reloadTransactions,
        addTransaction,
        calculateTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
