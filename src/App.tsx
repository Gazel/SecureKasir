import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { ProductProvider } from "./contexts/ProductContext";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Header from "./components/Layout/Header";
import Footer from "./components/Layout/Footer";

import Dashboard from "./pages/Dashboard";
import POSPage from "./pages/POSPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ProductProvider>
          <CartProvider>
            <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
              <Header />

              <main className="flex-1">
                <Routes>
                  {/* Public */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* Admin only */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin + Cashier */}
                  <Route
                    path="/pos"
                    element={
                      <ProtectedRoute roles={["admin", "cashier"]}>
                        <POSPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute roles={["admin", "cashier"]}>
                        <HistoryPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin only */}
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute roles={["admin"]}>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 */}
                  <Route path="/404" element={<NotFoundPage />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </main>

              <Footer />
            </div>
          </CartProvider>
        </ProductProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
