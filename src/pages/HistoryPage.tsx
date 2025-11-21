import React, { useState, useEffect } from "react";
import { Search, CalendarIcon, Eye, ArrowDownUp } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { formatCurrency, formatDate } from "../utils/formatter";
import Modal, { useModal } from "../components/UI/Modal";
import Receipt from "../components/POS/Receipt";

const HistoryPage: React.FC = () => {
  const { transactions, reloadTransactions } = useCart();
  const { isOpen, openModal, closeModal } = useModal();

  // Load transactions when page opens (optional but useful)
  useEffect(() => {
    reloadTransactions();
  }, []);

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState("");

  // Fix: Receipt number based on transaction date
  const formatReceiptNumber = (id: string, dateString: string): string => {
    const d = new Date(dateString);
    const year = d.getFullYear().toString().substring(2);
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");

    return `INV/${year}${month}${day}/${id.substring(0, 4).toUpperCase()}`;
  };

  // Filter + Sort
  const filteredTransactions = transactions
    .filter((transaction) => {
      const searchLower = searchTerm.toLowerCase();

      if (searchTerm && !transaction.id.toLowerCase().includes(searchLower)) {
        return false;
      }

      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        const trxDate = new Date(transaction.date);
        if (
          filterDate.getFullYear() !== trxDate.getFullYear() ||
          filterDate.getMonth() !== trxDate.getMonth() ||
          filterDate.getDate() !== trxDate.getDate()
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortField === "date") {
        return sortDirection === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortField === "total") {
        return sortDirection === "asc" ? a.total - b.total : b.total - a.total;
      }
      if (sortField === "items") {
        return sortDirection === "asc"
          ? a.items.length - b.items.length
          : b.items.length - a.items.length;
      }
      return 0;
    });

  const viewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    openModal();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Riwayat Transaksi</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari transaksi..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <CalendarIcon size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {filteredTransactions.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    ID Transaksi
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => setSortField("date")}
                  >
                    <div className="flex items-center">Tanggal <ArrowDownUp size={14} className="ml-1" /></div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => setSortField("items")}
                  >
                    <div className="flex items-center">Item <ArrowDownUp size={14} className="ml-1" /></div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => setSortField("total")}
                  >
                    <div className="flex items-center">Total <ArrowDownUp size={14} className="ml-1" /></div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Pembayaran
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3">
                      {formatReceiptNumber(trx.id, trx.date)}
                    </td>
                    <td className="px-4 py-3">{formatDate(trx.date)}</td>
                    <td className="px-4 py-3">{trx.items.length}</td>
                    <td className="px-4 py-3">{formatCurrency(trx.total)}</td>
                    <td className="px-4 py-3">{trx.paymentMethod === "cash" ? "Tunai" : "QRIS"}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600" onClick={() => viewTransaction(trx)}>
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">Tidak ada transaksi</div>
      )}

      {selectedTransaction && (
        <Modal isOpen={isOpen} onClose={closeModal} title="Detail Transaksi">
          <Receipt {...selectedTransaction} />
        </Modal>
      )}
    </div>
  );
};

export default HistoryPage;
