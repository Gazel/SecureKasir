import React, { useState, useEffect, useMemo } from "react";
import { Search, CalendarIcon, Eye, ArrowDownUp } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { formatCurrency, formatDate } from "../utils/formatter";
import Modal, { useModal } from "../components/UI/Modal";
import Receipt from "../components/POS/Receipt";

type SortField = "date" | "total" | "items";

const HistoryPage: React.FC = () => {
  const { transactions, reloadTransactions } = useCart();
  const { token } = useAuth(); // ✅ wait for token
  const { isOpen, openModal, closeModal } = useModal();

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState("");

  // ✅ reload when token is ready / changes
  useEffect(() => {
    if (!token) return;
    reloadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction: any) => {
        const searchLower = searchTerm.toLowerCase();

        if (
          searchTerm &&
          !String(transaction.id).toLowerCase().includes(searchLower)
        ) {
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
      .sort((a: any, b: any) => {
        let val = 0;

        if (sortField === "date") {
          val = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === "total") {
          val = (a.total || 0) - (b.total || 0);
        } else if (sortField === "items") {
          val = (a.items?.length || 0) - (b.items?.length || 0);
        }

        return sortDirection === "asc" ? val : -val;
      });
  }, [transactions, searchTerm, dateFilter, sortField, sortDirection]);

  const viewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    openModal();
  };

  const renderPaymentLabel = (trx: any) => {
    if (trx.status === "CANCELLED" || trx.paymentMethod === "cancelled") {
      return "Cancelled";
    }
    if (trx.paymentMethod === "cash") return "Tunai";
    if (trx.paymentMethod === "qris") return "QRIS";
    return trx.paymentMethod || "-";
  };

  const renderStatusBadge = (status?: string) => {
    const s = status || "SUCCESS";
    const isCancelled = s === "CANCELLED";

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold
          ${
            isCancelled
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          }`}
      >
        {s}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Riwayat Transaksi</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari transaksi (ID)..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <CalendarIcon
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
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
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center">
                      Tanggal
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>

                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => handleSort("items")}
                  >
                    <div className="flex items-center">
                      Item
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>

                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => handleSort("total")}
                  >
                    <div className="flex items-center">
                      Total
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Pembayaran
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map((trx: any) => {
                  const isCancelled =
                    trx.status === "CANCELLED" ||
                    trx.paymentMethod === "cancelled";

                  return (
                    <tr
                      key={trx.id}
                      className={`
                        hover:bg-gray-50 dark:hover:bg-gray-900
                        ${isCancelled ? "bg-red-50/50 dark:bg-red-950/20" : ""}
                      `}
                    >
                      <td className="px-4 py-3 font-mono text-sm">{trx.id}</td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(trx.date)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {trx.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatCurrency(trx.total || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {renderPaymentLabel(trx)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {renderStatusBadge(trx.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-blue-600 dark:text-blue-400"
                          onClick={() => viewTransaction(trx)}
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          Tidak ada transaksi
        </div>
      )}

      {/* Modal */}
      {selectedTransaction && (
        <Modal isOpen={isOpen} onClose={closeModal} title="Detail Transaksi">
          <Receipt {...selectedTransaction} />
        </Modal>
      )}
    </div>
  );
};

export default HistoryPage;
