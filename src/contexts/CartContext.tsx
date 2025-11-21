import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Transaction } from '../types';
import { generateId } from '../utils/formatter';
import { saveTransactionOnline, fetchTransactionsOnline } from '../services/apiBackend';

interface CartContextProps {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'subtotal'>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  discount: number;
  setDiscount: (discount: number) => void;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  reloadTransactions: () => Promise<void>;
  calculateTotal: () => { subtotal: number; total: number };
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  // CART items stay local (not stored on server)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);

  // FULL ONLINE transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load all transactions once from server
  const reloadTransactions = async () => {
    try {
      const data = await fetchTransactionsOnline();
      setTransactions(data);
    } catch (err) {
      console.error("Failed to load transactions from server:", err);
    }
  };

  // Load transactions on first load
  useEffect(() => {
    reloadTransactions();
  }, []);

  // Add item to cart
  const addToCart = (item: Omit<CartItem, 'subtotal'>) => {
    const existingItem = cart.find(cartItem => cartItem.productId === item.productId);
    
    if (existingItem) {
      updateQuantity(item.productId, existingItem.quantity + item.quantity);
    } else {
      const newItem = {
        ...item,
        subtotal: item.price * item.quantity
      };
      setCart(prev => [...prev, newItem]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity, subtotal: item.price * quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
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

  // 💥 FULL ONLINE: Add transaction via API, not localStorage
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
    };

    try {
      await saveTransactionOnline(newTransaction);   // SAVE TO SERVER
      await reloadTransactions();                    // REFRESH LIST FROM SERVER
    } catch (err) {
      console.error("Failed to save transaction online:", err);
    }

    clearCart();
  };

  const value = {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    discount,
    setDiscount,
    transactions,
    addTransaction,
    reloadTransactions,
    calculateTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
