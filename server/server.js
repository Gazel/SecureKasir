// server/server.js - MySQL-backed API
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(cors());
app.use(express.json());

// ---------- MySQL CONNECTION ----------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "securekasir",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "securekasir",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ---------- DB INIT (TABLES) ----------
async function initDb() {
  const conn = await pool.getConnection();
  try {
    // Tabel transaksi
    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        subtotal INT NOT NULL,
        discount INT NOT NULL DEFAULT 0,
        total INT NOT NULL,
        payment_method VARCHAR(20) NOT NULL,
        cash_received INT NOT NULL DEFAULT 0,
        \`change\` INT NOT NULL DEFAULT 0,
        date DATETIME NOT NULL,
        customer_name VARCHAR(255) NULL,
        note TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel item transaksi
    await conn.query(`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        transaction_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NULL,
        name VARCHAR(255) NOT NULL,
        price INT NOT NULL,
        quantity INT NOT NULL,
        subtotal INT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )
    `);
  } finally {
    conn.release();
  }
}

// ---------- HELPERS ----------
function mapTransactionRow(row, items) {
  return {
    id: row.id,
    items,
    subtotal: row.subtotal,
    discount: row.discount,
    total: row.total,
    date: row.date.toISOString(), // frontend pakai string ISO
    paymentMethod: row.payment_method,
    cashReceived: row.cash_received,
    change: row.change,
    customerName: row.customer_name || "",
    note: row.note || "",
  };
}

// ---------- ROUTES ----------

// Health check + cek koneksi DB
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      db: "connected",
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check DB error:", err);
    res.status(500).json({
      status: "error",
      db: "failed",
      error: err.message,
    });
  }
});

// Get all transactions (dengan items)
app.get("/api/transactions", async (req, res) => {
  try {
    const [trxRows] = await pool.query(
      "SELECT * FROM transactions ORDER BY date DESC"
    );
    const [itemRows] = await pool.query(
      "SELECT * FROM transaction_items ORDER BY id ASC"
    );

    const itemsByTrx = {};
    for (const item of itemRows) {
      if (!itemsByTrx[item.transaction_id]) {
        itemsByTrx[item.transaction_id] = [];
      }
      itemsByTrx[item.transaction_id].push({
        productId: item.product_id || "",
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });
    }

    const result = trxRows.map((row) =>
      mapTransactionRow(row, itemsByTrx[row.id] || [])
    );

    res.json(result);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Create transaction
app.post("/api/transactions", async (req, res) => {
  const payload = req.body;

  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return res.status(400).json({ error: "Invalid transaction payload" });
  }

  if (!payload.id) {
    return res.status(400).json({ error: "Transaction id is required" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insert ke tabel transactions
    await conn.query(
      `
      INSERT INTO transactions (
        id, subtotal, discount, total,
        payment_method, cash_received, \`change\`, date,
        customer_name, note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.id,
        payload.subtotal,
        payload.discount || 0,
        payload.total,
        payload.paymentMethod,
        payload.cashReceived || 0,
        payload.change || 0,
        new Date(payload.date),
        payload.customerName || null,
        payload.note || null,
      ]
    );

    // Insert item-item transaksi
    const itemValues = payload.items.map((item) => [
      payload.id,
      item.productId || null,
      item.name,
      item.price,
      item.quantity,
      item.subtotal,
    ]);

    await conn.query(
      `
      INSERT INTO transaction_items (
        transaction_id, product_id, name, price, quantity, subtotal
      )
      VALUES ?
      `,
      [itemValues]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("Error saving transaction:", err);
    res.status(500).json({ error: "Failed to save transaction" });
  } finally {
    conn.release();
  }
});

// ---------- SERVER START ----------
const PORT = process.env.PORT || 4000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API Server Running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to init DB:", err);
    process.exit(1);
  });
