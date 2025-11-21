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

  // Put "Semua" as first chip
  const chips = ["", ...categories];

  return (
    <div className="h-full flex flex-col">
      {/* Sticky Search + Category Chips */}
      <div
        className="
          sticky top-0 z-10
          bg-white/95 dark:bg-gray-800/95 backdrop-blur
          p-2 rounded-lg shadow-sm mb-2
        "
      >
        {/* Search row */}
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

        {/* Chips row (horizontal scroll) */}
        <div className="mt-2 -mx-2 px-2 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {chips.map((cat) => {
              const isActive = selectedCategory === cat;
              const label = cat === "" ? "Semua" : cat;

              return (
                <button
                  key={label}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium
                    border transition
                    ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700"
                    }
                    active:scale-[0.98]
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

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
      {/* No image — simple colored dot */}
      <div className="h-4 w-4 rounded-full bg-blue-400 dark:bg-blue-600 flex-shrink-0"></div>

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
