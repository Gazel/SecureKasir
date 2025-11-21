// server/server.js
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const PORT = process.env.PORT || 4000;

// Basic DB config (bisa di-override pakai ENV di VPS)
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true
};

let pool;

// Auto create DB + tables
async function initDb() {
  const connection = await mysql.createConnection(dbConfig);

  // 1) Create database
  await connection.query(`
    CREATE DATABASE IF NOT EXISTS securekasir
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_unicode_ci
  `);

  // 2) Use DB
  await connection.query(`USE securekasir`);

  // 3) Transactions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(64) PRIMARY KEY,
      items JSON NOT NULL,
      subtotal INT NOT NULL,
      discount INT NOT NULL,
      total INT NOT NULL,
      date DATETIME NOT NULL,
      payment_method VARCHAR(10) NOT NULL,
      cash_received INT NOT NULL,
      change_amount INT NOT NULL,
      customer_name VARCHAR(255),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4) Products table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price INT NOT NULL,
      category VARCHAR(100),
      image TEXT,
      stock INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.end();

  // 5) Create pooled connection for app
  pool = mysql.createPool({
    ...dbConfig,
    database: "securekasir",
    connectionLimit: 10
  });

  console.log("✅ Database & tables ready");
}

const app = express();
app.use(cors());
app.use(express.json());

// Simple logger
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* =========================
   TRANSACTIONS ENDPOINTS
   ========================= */

app.get("/api/transactions", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM transactions ORDER BY date DESC"
    );

    const data = rows.map((row) => ({
      id: row.id,
      items: JSON.parse(row.items),
      subtotal: row.subtotal,
      discount: row.discount,
      total: row.total,
      date: row.date instanceof Date ? row.date.toISOString() : row.date,
      paymentMethod: row.payment_method,
      cashReceived: row.cash_received,
      change: row.change_amount,
      customerName: row.customer_name || "",
      note: row.note || ""
    }));

    res.json(data);
  } catch (err) {
    console.error("Error fetching transactions", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const {
      id,
      items,
      subtotal,
      discount,
      total,
      date,
      paymentMethod,
      cashReceived,
      change,
      customerName,
      note
    } = req.body;

    if (!id || !Array.isArray(items)) {
      return res
        .status(400)
        .json({ error: "Invalid transaction payload (id/items missing)" });
    }

    await pool.query(
      `
      INSERT INTO transactions
        (id, items, subtotal, discount, total, date, payment_method,
         cash_received, change_amount, customer_name, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        JSON.stringify(items),
        subtotal ?? 0,
        discount ?? 0,
        total ?? 0,
        new Date(date),
        paymentMethod || "cash",
        cashReceived ?? 0,
        change ?? 0,
        customerName || null,
        note || null
      ]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Error saving transaction", err);
    res.status(500).json({ error: "Failed to save transaction" });
  }
});

/* =====================
   PRODUCTS ENDPOINTS
   ===================== */

// GET all products
app.get("/api/products", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products ORDER BY name ASC");

    const data = rows.map((row) => ({
      id: String(row.id),
      name: row.name,
      price: row.price,
      category: row.category || "",
      image: row.image || "",
      stock: row.stock ?? 0
    }));

    res.json(data);
  } catch (err) {
    console.error("Error fetching products", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// CREATE product
app.post("/api/products", async (req, res) => {
  try {
    const { name, price, category, image, stock } = req.body;

    if (!name || price == null) {
      return res
        .status(400)
        .json({ error: "Name and price are required for product" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO products (name, price, category, image, stock)
      VALUES (?, ?, ?, ?, ?)
    `,
      [name, price, category || null, image || null, stock ?? 0]
    );

    res.status(201).json({
      id: String(result.insertId),
      name,
      price,
      category: category || "",
      image: image || "",
      stock: stock ?? 0
    });
  } catch (err) {
    console.error("Error creating product", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// UPDATE product
app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, image, stock } = req.body;

    if (!name || price == null) {
      return res
        .status(400)
        .json({ error: "Name and price are required for product" });
    }

    await pool.query(
      `
      UPDATE products
      SET name = ?, price = ?, category = ?, image = ?, stock = ?
      WHERE id = ?
    `,
      [name, price, category || null, image || null, stock ?? 0, id]
    );

    res.json({
      id,
      name,
      price,
      category: category || "",
      image: image || "",
      stock: stock ?? 0
    });
  } catch (err) {
    console.error("Error updating product", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE product
app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting product", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Start
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API Server Running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to init DB", err);
    process.exit(1);
  });
