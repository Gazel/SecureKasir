import React, { createContext, useContext, useState, useEffect } from "react";
import type { Product } from "../types";
import {
  fetchProductsOnline,
  createProductOnline,
  updateProductOnline,
  deleteProductOnline,
} from "../services/apiBackend";
import { useAuth } from "./AuthContext";

interface ProductContextProps {
  products: Product[];
  categories: string[];
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, product: Omit<Product, "id">) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  reloadProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextProps | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth(); // ✅ get token from auth
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const recalcCategories = (list: Product[]) => {
    const cats = Array.from(
      new Set(
        list
          .map((p) => p.category)
          .filter((c): c is string => !!c && c.trim() !== "")
      )
    ).sort();
    setCategories(cats);
  };

  const reloadProducts = async () => {
    if (!token) return; // ✅ wait until logged in
    try {
      const data = await fetchProductsOnline(token);
      setProducts(data);
      recalcCategories(data);
    } catch (err) {
      console.error("Failed to reload products", err);
    }
  };

  // reload when token is ready (after login)
  useEffect(() => {
    reloadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const addProduct = async (product: Omit<Product, "id">) => {
    if (!token) return;
    const saved = await createProductOnline(product, token);
    const updated = [...products, saved];
    setProducts(updated);
    recalcCategories(updated);
  };

  const updateProduct = async (id: string, product: Omit<Product, "id">) => {
    if (!token) return;
    const saved = await updateProductOnline(id, product, token);
    const updated = products.map((p) => (p.id === id ? saved : p));
    setProducts(updated);
    recalcCategories(updated);
  };

  const deleteProduct = async (id: string) => {
    if (!token) return;
    await deleteProductOnline(id, token);
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    recalcCategories(updated);
  };

  const getProductById = (id: string) => products.find((p) => p.id === id);

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductById,
        reloadProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProducts must be used within a ProductProvider");
  return ctx;
};
