import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(username, password);
      nav("/"); // go to home
    } catch {
      setErr("Username / password wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form
        onSubmit={onSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow w-full max-w-sm"
      >
        <h1 className="text-xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">
          SecureKasir Login
        </h1>

        {err && <div className="mb-3 text-sm text-red-500">{err}</div>}

        <label className="text-sm text-gray-600 dark:text-gray-300">
          Username
        </label>
        <input
          className="w-full mt-1 mb-3 px-3 py-2 rounded border dark:bg-gray-700 dark:border-gray-600"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="text-sm text-gray-600 dark:text-gray-300">
          Password
        </label>
        <input
          type="password"
          className="w-full mt-1 mb-4 px-3 py-2 rounded border dark:bg-gray-700 dark:border-gray-600"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Login
        </button>
      </form>
    </div>
  );
}
