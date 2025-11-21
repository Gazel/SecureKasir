import React, { useState, useEffect, useMemo } from "react";
import { Search, CalendarIcon, Eye, ArrowDownUp } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { formatCurrency, formatDate } from "../utils/formatter";
import Modal, { useModal } from "../components/UI/Modal";
import Receipt from "../components/POS/Receipt";

type SortField = "date" | "total" | "items";
type SortDirection = "asc" | "desc";

const HistoryPage: React.FC = () => {
  const { transactions, reloadTransactions } = useCart();
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    reloadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("desc");
  const [dateFilter, setDateFilter] = useState("");

  // Legacy receipt formatting (for old IDs only)
  const formatLegacyReceiptNumber = (id: string, dateString: string): string => {
    const d = new Date(dateString);
    const year = d.getFullYear().toString().substring(2);
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `INV/${year}${month}${day}/${id.substring(0, 4).toUpperCase()}`;
  };

  // If ID already in YYYYMMDDXXX (all digits, length 11), show as-is.
  const displayTransactionId = (trx: any) => {
    const id = String(trx.id || "");
    const isNewFormat = /^\d{11}$/.test(id);
    return isNewFormat ? id : formatLegacyReceiptNumber(id, trx.date);
  };

  const toggleSort = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection("desc"); // default when switching field
      return;
    }
    setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
  };

  const filteredTransactions = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    return transactions
      .filter((trx) => {
        // search by id or customer name (optional improvement)
        if (searchTerm) {
          const idMatch = String(trx.id || "")
            .toLowerCase()
            .includes(searchLower);

          const customerMatch = String(trx.customerName || "")
            .toLowerCase()
            .includes(searchLower);

          if (!idMatch && !customerMatch) return false;
        }

        // date filter exact day match
        if (dateFilter) {
          const filterDate = new Date(dateFilter);
          const trxDate = new Date(trx.date);

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
        let val = 0;
        if (sortField === "date") {
          val =
            new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === "total") {
          val = (a.total || 0) - (b.total || 0);
        } else if (sortField === "items") {
          val = (a.items?.length || 0) - (b.items?.length || 0);
        }

        return sortDirection === "asc" ? val : -val;
      });
  }, [transactions, searchTerm, dateFilter, sortField, sortDirection]);

  const viewTransaction = (trx: any) => {
    setSelectedTransaction(trx);
    openModal();
  };

  const renderPaymentLabel = (trx: any) => {
    if (trx.paymentMethod === "cash") return "Tunai";
    if (trx.paymentMethod === "qris") return "QRIS";
    return "Cancelled";
  };

  const renderStatusBadge = (trx: any) => {
    const status = (trx.status || "SUCCESS").toUpperCase();
    const isCancelled = status === "CANCELLED";

    return (
      <span
        className={
          isCancelled
            ? "inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"
            : "inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
        }
      >
        {isCancelled ? "CANCELLED" : "SUCCESS"}
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Cari transaksi / nama pelanggan..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <CalendarIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
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
                    onClick={() => toggleSort("date")}
                  >
                    <div className="flex items-center">
                      Tanggal
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>

                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => toggleSort("items")}
                  >
                    <div className="flex items-center">
                      Item
                      <ArrowDownUp size={14} className="ml-1" />
                    </div>
                  </th>

                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer"
                    onClick={() => toggleSort("total")}
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
                {filteredTransactions.map((trx) => (
                  <tr
                    key={trx.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="px-4 py-3 font-medium">
                      {displayTransactionId(trx)}
                    </td>

                    <td className="px-4 py-3">{formatDate(trx.date)}</td>

                    <td className="px-4 py-3">
                      {trx.items?.length || 0}
                    </td>

                    <td className="px-4 py-3">
                      {formatCurrency(trx.total || 0)}
                    </td>

                    <td className="px-4 py-3">
                      {renderPaymentLabel(trx)}
                    </td>

                    <td className="px-4 py-3">
                      {renderStatusBadge(trx)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-blue-600"
                        onClick={() => viewTransaction(trx)}
                        title="Lihat detail"
                      >
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
        <div className="p-8 text-center text-gray-500">
          Tidak ada transaksi
        </div>
      )}

      {selectedTransaction && (
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          title="Detail Transaksi"
        >
          <Receipt {...selectedTransaction} />
        </Modal>
      )}
    </div>
  );
};

export default HistoryPage;
