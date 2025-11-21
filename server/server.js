// server/server.js
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

// ====== MIDDLEWARE ======
app.use(cors());
app.use(express.json());

// ====== DATABASE SETUP ======
const dbFile = path.join(__dirname, "securekasir.db");
const db = new Database(dbFile);

// Tabel transaksi sederhana: simpan JSON mentah + beberapa kolom penting
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    total_amount REAL NOT NULL,
    payment_method TEXT,
    raw_json TEXT NOT NULL
  );
`);

// Helper: generate ID kalau frontend tidak kirim
function generateId() {
  return "tx_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

// ====== ROUTES ======

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Simpan 1 transaksi
app.post("/api/transactions", (req, res) => {
  try {
    const body = req.body || {};

    const id = body.id || generateId();
    const createdAt = body.createdAt || body.date || new Date().toISOString();
    const total =
      body.total ||
      body.totalAmount ||
      body.grandTotal ||
      0;
    const paymentMethod =
      body.paymentMethod ||
      body.metodePembayaran ||
      null;

    if (!total) {
      return res.status(400).json({ error: "Total transaksi tidak boleh 0" });
    }

    const raw = JSON.stringify(body);

    const stmt = db.prepare(
      `
      INSERT OR REPLACE INTO transactions (id, created_at, total_amount, payment_method, raw_json)
      VALUES (@id, @createdAt, @total, @paymentMethod, @raw)
    `
    );

    stmt.run({ id, createdAt, total, paymentMethod, raw });

    res.json({ ok: true, id, createdAt, total, paymentMethod });
  } catch (err) {
    console.error("Error /api/transactions POST:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Ambil semua transaksi (optional: nanti bisa ditambah filter tanggal)
app.get("/api/transactions", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
        SELECT id, created_at, total_amount, payment_method, raw_json
        FROM transactions
        ORDER BY created_at DESC
      `
      )
      .all();

    const data = rows.map((row) => {
      let parsed = {};
      try {
        parsed = JSON.parse(row.raw_json);
      } catch (e) {
        parsed = {};
      }

      return {
        id: row.id,
        createdAt: row.created_at,
        totalAmount: row.total_amount,
        paymentMethod: row.payment_method,
        ...parsed, // merge original fields
      };
    });

    res.json(data);
  } catch (err) {
    console.error("Error /api/transactions GET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`SecureKasir API running on port ${PORT}`);
});
