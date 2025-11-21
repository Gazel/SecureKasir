import React, { createContext, useContext, useEffect, useState } from "react";

export type UserRole = "admin" | "cashier";

export interface AuthUser {
  id: string;
  username: string;
  full_name?: string;
  role: UserRole;
}

interface AuthContextProps {
  token: string | null;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // load from localStorage on boot
  useEffect(() => {
    const savedToken = localStorage.getItem("sk_token");
    const savedUser = localStorage.getItem("sk_user");

    if (savedToken) setToken(savedToken);
    if (savedUser) setUser(JSON.parse(savedUser));
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error("Invalid credentials");
    }

    const data = await res.json(); // { token, user }

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

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
