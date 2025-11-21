import React, { useEffect, useState } from "react";
import {
  BarChart,
  PieChart,
  ArrowUp,
  Wallet,
  ShoppingBag,
  Calendar,
} from "lucide-react";
import { useProducts } from "../contexts/ProductContext";
import { useCart } from "../contexts/CartContext";
import { formatCurrency } from "../utils/formatter";

// Time range helper
function filterByRange(transactions: any[], range: string) {
  const now = new Date();
  const start = new Date();

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (range === "year") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return transactions.filter((t) => new Date(t.date) >= start);
}

const Dashboard: React.FC = () => {
  const { products } = useProducts();
  const { transactions } = useCart();

  const [range, setRange] = useState("today");
  const [filtered, setFiltered] = useState<any[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<any>({});

  const [totalSales, setTotalSales] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Filtering transactions by selected time range
    const t = filterByRange(transactions, range);
    setFiltered(t);

    // Total Sales
    const sum = t.reduce((acc, tx) => acc + tx.total, 0);
    setTotalSales(sum);

    // Total Transactions
    setTotalTransactions(t.length);

    // Penjualan berdasarkan produk
    const map: any = {};
    t.forEach((tx) => {
      tx.items.forEach((item: any) => {
        if (!map[item.name]) map[item.name] = 0;
        map[item.name] += item.subtotal;
      });
    });
    setSalesByProduct(map);

    // Recent Transactions
    const recent = [...t]
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 5);
    setRecentTransactions(recent);
  }, [transactions, range]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header + Range Filter */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <select
            className="
              px-3 py-2 rounded-md border border-gray-300 
              dark:border-gray-700 bg-white dark:bg-gray-800
            "
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="today">Hari Ini</option>
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Penjualan
              </p>
              <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300">
              <BarChart size={24} />
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Transaksi
              </p>
              <p className="text-2xl font-bold">{totalTransactions}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 dark:text-green-300">
              <ShoppingBag size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Sales by Product + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Product */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Penjualan Berdasarkan Produk</h2>

          {Object.keys(salesByProduct).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(salesByProduct).map(([name, amount]) => (
                <div key={name} className="flex items-center">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mr-2">
                    <div
                      className="bg-blue-600 h-4 rounded-full"
                      style={{
                        width: `${(amount / totalSales) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm whitespace-nowrap">
                    {name} ({formatCurrency(amount)})
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Tidak ada penjualan
            </p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">
            Transaksi Terbaru
          </h2>

          {recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="py-2 px-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                      ID
                    </th>
                    <th className="py-2 px-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                      Tanggal
                    </th>
                    <th className="py-2 px-3 text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                      Item
                    </th>
                    <th className="py-2 px-3 text-right text-xs text-gray-500 dark:text-gray-400 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b dark:border-gray-700"
                    >
                      <td className="py-2 px-3 text-sm">
                        {formatReceiptNumber(transaction.id)}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {new Date(transaction.date).toLocaleDateString(
                          "id-ID"
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {transaction.items.length} item
                      </td>
                      <td className="py-2 px-3 text-sm text-right">
                        {formatCurrency(transaction.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Belum ada transaksi
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// Helper ID formatter
function formatReceiptNumber(id: string): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `INV/${y}${m}${d}/${id.slice(0, 4).toUpperCase()}`;
}
