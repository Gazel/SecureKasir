import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(undefined);

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved session
  useEffect(() => {
    const savedToken = localStorage.getItem("sk_token");
    const savedUser = localStorage.getItem("sk_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("sk_user");
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => null))?.message;
      throw new Error(msg || "Login failed");
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);

    localStorage.setItem("sk_token", data.token);
    localStorage.setItem("sk_user", JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("sk_token");
    localStorage.removeItem("sk_user");
  };

  // helper for checking roles in UI
  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
