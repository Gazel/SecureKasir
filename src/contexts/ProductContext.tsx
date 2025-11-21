import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Product } from "../types";
import { generateId } from "../utils/formatter";
import {
  fetchProductsOnline,
  createProductOnline,
  updateProductOnline,
  deleteProductOnline,
} from "../services/apiBackend";

interface ProductContextProps {
  products: Product[];
  categories: string[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  reloadProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextProps | undefined>(undefined);

// optional: default seeding pertama kali kalau backend masih kosong
const defaultProducts: Omit<Product, "id">[] = [
  {
    name: "Ayam Katsu Original",
    price: 20000,
    image: "https://via.placeholder.com/300x150?text=Katsu+Original",
    category: "Makanan",
    stock: 99,
  },
  {
    name: "Ayam Katsu Spicy",
    price: 22000,
    image: "https://via.placeholder.com/300x150?text=Katsu+Spicy",
    category: "Makanan",
    stock: 99,
  },
];

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const reloadProducts = async () => {
    try {
      let data = await fetchProductsOnline();

      // kalau kosong total, seed defaultProducts sekali
      if (!data || data.length === 0) {
        const seeded: Product[] = [];
        for (const base of defaultProducts) {
          const newProduct: Product = { ...base, id: generateId() };
          await createProductOnline(newProduct);
          seeded.push(newProduct);
        }
        data = seeded;
      }

      setProducts(data);
    } catch (err) {
      console.error("Failed to reload products", err);
    }
  };

  useEffect(() => {
    reloadProducts();
  }, []);

  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...product,
      id: generateId(),
    };

    // optimistik: update UI dulu
    setProducts((prev) => [...prev, newProduct]);

    (async () => {
      try {
        await createProductOnline(newProduct);
      } catch (err) {
        console.error("Failed to save product online", err);
      }
    })();
  };

  const updateProduct = (product: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
    );

    (async () => {
      try {
        await updateProductOnline(product);
      } catch (err) {
        console.error("Failed to update product online", err);
      }
    })();
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    (async () => {
      try {
        await deleteProductOnline(productId);
      } catch (err) {
        console.error("Failed to delete product online", err);
      }
    })();
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        addProduct,
        updateProduct,
        deleteProduct,
        reloadProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
};
