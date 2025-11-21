import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useProducts } from "../../contexts/ProductContext";
import { useCart } from "../../contexts/CartContext";
import { formatCurrency } from "../../utils/formatter";

const ProductList: React.FC = () => {
  const { products, categories } = useProducts();
  const { addToCart } = useCart();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [filteredProducts, setFilteredProducts] = useState(products);

  useEffect(() => {
    let result = products;

    if (searchTerm) {
      result = result.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      result = result.filter((product) => product.category === selectedCategory);
    }

    setFilteredProducts(result);
  }, [products, searchTerm, selectedCategory]);

  const handleAddToCart = (product: any) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Search + Filter (compact for mobile) */}
      <div
        className="
          sticky top-0 z-10
          bg-white/95 dark:bg-gray-800/95 backdrop-blur
          p-2 rounded-lg shadow-sm mb-2
        "
      >
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari produk..."
              className="
                w-full pl-10 pr-3 py-1.5
                border border-gray-300 dark:border-gray-600 rounded-md
                bg-gray-50 dark:bg-gray-700
                text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-1 focus:ring-blue-500
              "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="
              w-full pl-3 pr-8 py-1.5
              border border-gray-300 dark:border-gray-600 rounded-md
              bg-gray-50 dark:bg-gray-700
              text-gray-900 dark:text-gray-100
              focus:outline-none focus:ring-1 focus:ring-blue-500
            "
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products List (mobile-first) */}
      <div className="flex-1 overflow-y-auto pb-24">
        {filteredProducts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>Tidak ada produk yang ditemukan</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onAdd={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ProductRow: React.FC<{
  product: any;
  onAdd: (p: any) => void;
}> = ({ product, onAdd }) => {
  return (
    <button
      onClick={() => onAdd(product)}
      className="
        w-full flex items-center gap-3
        rounded-xl border border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        px-3 py-3 shadow-sm
        active:scale-[0.99]
      "
    >
      {/* Thumbnail small */}
      <div className="h-14 w-14 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
            No Image
          </div>
        )}
      </div>

      {/* Name + category */}
      <div className="flex-1 text-left min-w-0">
        <div className="text-base font-semibold leading-tight truncate">
          {product.name}
        </div>

        {product.category && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {product.category}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="text-right">
        <div className="text-base font-bold text-gray-900 dark:text-gray-100">
          {formatCurrency(product.price)}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          Tap to add
        </div>
      </div>
    </button>
  );
};

export default ProductList;
