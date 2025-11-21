import React, { createContext, useContext, useState } from "react";
import { CartItem, Transaction } from "../types";
import { generateId } from "../utils/formatter";
import {
  fetchTransactionsOnline,
  saveTransactionOnline,
} from "../services/apiBackend";

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
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  calculateTotal: () => { subtotal: number; total: number };
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const reloadTransactions = async () => {
    const data = await fetchTransactionsOnline();
    setTransactions(data);
  };

  const addToCart = (item: Omit<CartItem, "subtotal">) => {
    const existingItem = cart.find(
      (cartItem) => cartItem.productId === item.productId
    );

    if (existingItem) {
      updateQuantity(item.productId, existingItem.quantity + item.quantity);
    } else {
      const newItem = {
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
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal - discount;
    return { subtotal, total: total < 0 ? 0 : total };
  };

  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    const newTransaction = {
      ...transaction,
      id: generateId(),
    };

    await saveTransactionOnline(newTransaction);
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
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
};
