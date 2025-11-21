import React, { useState, useEffect } from "react";
import { useProducts } from "../contexts/ProductContext";
import { useAuth } from "../contexts/AuthContext";

import { Plus, Edit2, Trash2, Save, Users } from "lucide-react";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import Modal, { useModal } from "../components/UI/Modal";
import { formatCurrency } from "../utils/formatter";

import {
  fetchUsersOnline,
  createUserOnline,
  updateUserOnline,
  deleteUserOnline,
  type UserRow,
  type UserRole,
} from "../services/apiBackend";

const SettingsPage: React.FC = () => {
  // -------- PRODUCTS (your existing logic) --------
  const { products, categories, addProduct, updateProduct, deleteProduct } =
    useProducts();
  const { isOpen: isModalOpen, openModal, closeModal } = useModal();

  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image: "",
    category: "",
    stock: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isModalOpen) {
      setEditingProduct(null);
      setFormData({
        name: "",
        price: "",
        image: "",
        category: "",
        stock: "",
      });
      setNewCategory("");
      setErrors({});
    }
  }, [isModalOpen]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      price: "",
      image: "",
      category: "",
      stock: "",
    });
    setNewCategory("");
    setErrors({});
    openModal();
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      image: product.image,
      category: product.category,
      stock: product.stock === -1 ? "" : (product.stock?.toString() ?? ""),
    });
    setNewCategory("");
    setErrors({});
    openModal();
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) newErrors.name = "Nama produk tidak boleh kosong";

    if (!formData.price.trim()) {
      newErrors.price = "Harga tidak boleh kosong";
    } else if (
      isNaN(parseFloat(formData.price)) ||
      parseFloat(formData.price) <= 0
    ) {
      newErrors.price = "Harga harus berupa angka positif";
    }

    const finalCategory = newCategory.trim()
      ? newCategory.trim()
      : formData.category;
    if (!finalCategory.trim())
      newErrors.category = "Kategori harus dipilih atau dibuat";

    if (formData.stock.trim()) {
      const stockNum = parseInt(formData.stock);
      if (isNaN(stockNum) || stockNum < 0) {
        newErrors.stock = "Stok harus berupa angka 0 atau lebih";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const finalCategory = newCategory.trim()
      ? newCategory.trim()
      : formData.category;

    const stockValue = formData.stock.trim()
      ? parseInt(formData.stock)
      : -1;

    const productData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      image: formData.image,
      category: finalCategory,
      stock: stockValue,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productData);
    } else {
      addProduct(productData);
    }

    closeModal();
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm("Anda yakin ingin menghapus produk ini?")) {
      deleteProduct(productId);
    }
  };

  // -------- USERS (new) --------
  const { token } = useAuth();
  const {
    isOpen: isUserModalOpen,
    openModal: openUserModal,
    closeModal: closeUserModal,
  } = useModal();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [userErrors, setUserErrors] = useState<{ [k: string]: string }>({});
  const [userForm, setUserForm] = useState({
    username: "",
    full_name: "",
    password: "",
    role: "cashier" as UserRole,
  });

  const loadUsers = async () => {
    if (!token) return;
    try {
      const data = await fetchUsersOnline(token);
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openAddUserModal = () => {
    setEditingUser(null);
    setUserForm({
      username: "",
      full_name: "",
      password: "",
      role: "cashier",
    });
    setUserErrors({});
    openUserModal();
  };

  const openEditUserModal = (u: UserRow) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      full_name: u.full_name || "",
      password: "", // empty => keep old password
      role: u.role,
    });
    setUserErrors({});
    openUserModal();
  };

  const handleUserInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setUserForm((p) => ({ ...p, [name]: value }));
    if (userErrors[name]) {
      setUserErrors((p) => {
        const n = { ...p };
        delete n[name];
        return n;
      });
    }
  };

  const validateUserForm = () => {
    const e: any = {};
    if (!userForm.username.trim()) e.username = "Username wajib diisi";
    if (!editingUser && !userForm.password.trim())
      e.password = "Password wajib diisi untuk user baru";
    setUserErrors(e);
    return Object.keys(e).length === 0;
  };

  const submitUser = async () => {
    if (!token) return;
    if (!validateUserForm()) return;

    try {
      if (editingUser) {
        const payload: any = {
          username: userForm.username.trim(),
          full_name: userForm.full_name.trim(),
          role: userForm.role,
        };
        if (userForm.password.trim()) payload.password = userForm.password;

        await updateUserOnline(editingUser.id, payload, token);
      } else {
        await createUserOnline(
          {
            username: userForm.username.trim(),
            full_name: userForm.full_name.trim(),
            password: userForm.password,
            role: userForm.role,
          },
          token
        );
      }

      closeUserModal();
      await loadUsers();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan user. Coba lagi.");
    }
  };

  const removeUser = async (u: UserRow) => {
    if (!token) return;
    if (!window.confirm(`Hapus user "${u.username}"?`)) return;

    try {
      await deleteUserOnline(u.id, token);
      await loadUsers();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus user.");
    }
  };

  // ---------- RENDER ----------
  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      {/* ================= PRODUCTS ================= */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Pengaturan Produk</h1>
          <Button variant="primary" onClick={openAddModal}>
            <Plus size={16} className="mr-1" />
            Tambah Produk
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Harga
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {product.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {product.stock === -1 ? "Unlimited" : product.stock}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      Belum ada produk
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingProduct ? "Edit Produk" : "Tambah Produk"}
          footer={
            <>
              <Button variant="secondary" onClick={closeModal}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                <Save size={16} className="mr-1" />
                Simpan
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              id="name"
              name="name"
              label="Nama Produk"
              value={formData.name}
              onChange={handleInputChange}
              error={errors.name}
              required
            />

            <Input
              id="price"
              name="price"
              label="Harga"
              type="number"
              value={formData.price}
              onChange={handleInputChange}
              error={errors.price}
              required
            />

            {/* Category select + new category */}
            <div className="mb-4">
              <label
                htmlFor="category"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Kategori<span className="text-red-500 ml-1">*</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${
                    errors.category
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  } rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500`}
                  disabled={!!newCategory}
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <Input
                  id="newCategory"
                  name="newCategory"
                  label="Atau Buat Kategori Baru"
                  placeholder="Kategori baru..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="mb-0"
                />
              </div>

              {errors.category && (
                <p className="mt-1 text-sm text-red-500">{errors.category}</p>
              )}
            </div>

            <Input
              id="stock"
              name="stock"
              label="Stok (Opsional, kosong = Unlimited)"
              type="number"
              value={formData.stock}
              onChange={handleInputChange}
              error={errors.stock}
              placeholder="Kosongkan untuk stok unlimited"
            />
          </div>
        </Modal>
      </section>

      {/* ================= USERS ================= */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users size={20} />
            Manajemen User
          </h2>

          <Button variant="primary" onClick={openAddUserModal}>
            <Plus size={16} className="mr-1" />
            Tambah User
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {u.username}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {u.full_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === "admin"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <button
                        onClick={() => openEditUserModal(u)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                      Belum ada user
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Modal */}
        <Modal
          isOpen={isUserModalOpen}
          onClose={closeUserModal}
          title={editingUser ? "Edit User" : "Tambah User"}
          footer={
            <>
              <Button variant="secondary" onClick={closeUserModal}>
                Batal
              </Button>
              <Button variant="primary" onClick={submitUser}>
                <Save size={16} className="mr-1" />
                Simpan
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              id="username"
              name="username"
              label="Username"
              value={userForm.username}
              onChange={handleUserInput}
              error={userErrors.username}
              required
            />

            <Input
              id="full_name"
              name="full_name"
              label="Nama Lengkap (Opsional)"
              value={userForm.full_name}
              onChange={handleUserInput}
            />

            <Input
              id="password"
              name="password"
              type="password"
              label={
                editingUser
                  ? "Password (Kosongkan jika tidak diganti)"
                  : "Password"
              }
              value={userForm.password}
              onChange={handleUserInput}
              error={userErrors.password}
              required={!editingUser}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                name="role"
                value={userForm.role}
                onChange={handleUserInput}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              >
                <option value="cashier">cashier</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>
        </Modal>
      </section>
    </div>
  );
};

export default SettingsPage;
