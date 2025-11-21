import dotenv from ".env";
dotenv.config();

import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();

// ✅ safer CORS (allow env override)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
  })
);

app.use(express.json());

// ---------------------------------------------
// DAILY SEQUENTIAL ID HELPER
// Format: YYYYMMDDXXX (001, 002, 003 per day)
// ---------------------------------------------
function formatYYYYMMDD(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

async function generateDailyId(pool, dateISO) {
  const d = dateISO ? new Date(dateISO) : new Date();
  const yyyymmdd = formatYYYYMMDD(d);

  const [rows] = await pool.query(
    "SELECT MAX(id) AS maxId FROM transactions WHERE id LIKE ?",
    [`${yyyymmdd}%`]
  );

  const maxId = rows?.[0]?.maxId;
  let nextSeq = 1;

  if (maxId) {
    const last3 = parseInt(String(maxId).slice(-3), 10);
    if (!Number.isNaN(last3)) nextSeq = last3 + 1;
  }

  return `${yyyymmdd}${String(nextSeq).padStart(3, "0")}`;
}

// ---------------------------------------------
// DATABASE CONNECTION POOL (MariaDB / MySQL)
// ---------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "securekasir",
  waitForConnections: true,
  connectionLimit: 10,
});

// ---------------------------------------------
// AUTH HELPERS
// ---------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid/expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}

// --------------------------------------------------------
// AUTO CREATE TABLES (Runs at Startup)
// --------------------------------------------------------
async function initDatabase() {
  console.log("🔄 Checking database tables...");

  // Products master
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price INT NOT NULL,
      image VARCHAR(255) DEFAULT '',
      category VARCHAR(100) DEFAULT '',
      stock INT NOT NULL DEFAULT -1, -- ✅ unlimited by default
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // Transactions header
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id VARCHAR(20) PRIMARY KEY,
      subtotal INT NOT NULL,
      discount INT NOT NULL,
      total INT NOT NULL,
      date DATETIME NOT NULL,
      payment_method VARCHAR(20) NOT NULL,
      cash_received INT,
      change_amount INT,
      customer_name VARCHAR(100),
      note TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS'
    );
  `);

  // Transaction detail items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id VARCHAR(50),
      product_id INT, -- ✅ keep numeric (matches products.id)
      name VARCHAR(255),
      price INT NOT NULL,
      quantity INT NOT NULL,
      subtotal INT NOT NULL,
      FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE CASCADE
    );
  `);

  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100),
      role ENUM('admin','cashier') NOT NULL DEFAULT 'cashier',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin if table empty
  const [userRows] = await pool.query(`SELECT COUNT(*) AS c FROM users;`);
  if (userRows[0].c === 0) {
    const adminUsername = process.env.ADMIN_USERNAME || "admin";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";
    const adminFullname = process.env.ADMIN_FULLNAME || "Administrator";
    const hash = await bcrypt.hash(adminPassword, 10);

    await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES (?, ?, ?, 'admin')`,
      [adminUsername, hash, adminFullname]
    );

    console.log("✅ Seeded default admin user:", adminUsername);
  }

  console.log("✅ Database ready (tables exist)");
}

// --------------------------------------------------------
// AUTH API
// --------------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "username & password required" });

    const [rows] = await pool.query(
      `SELECT * FROM users WHERE username=? AND is_active=1 LIMIT 1`,
      [username]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, username, full_name, role FROM users WHERE id=? LIMIT 1`,
    [req.user.id]
  );
  res.json(rows[0]);
});

// --------------------------------------------------------
// USERS API (ADMIN ONLY)
// --------------------------------------------------------
app.get("/api/users", authMiddleware, requireRole("admin"), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, username, full_name, role, is_active, created_at
     FROM users ORDER BY id DESC`
  );
  res.json(rows);
});

// ✅ return created user row (frontend expects this)
app.post("/api/users", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const { username, password, full_name, role } = req.body;
    if (!username || !password || !role)
      return res
        .status(400)
        .json({ message: "username, password, role required" });

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES (?, ?, ?, ?)`,
      [username, hash, full_name || null, role]
    );

    const insertId = result.insertId;

    const [rows] = await pool.query(
      `SELECT id, username, full_name, role, created_at
       FROM users WHERE id=? LIMIT 1`,
      [insertId]
    );

    res.json(rows[0]);
  } catch (err) {
    if (String(err).includes("Duplicate")) {
      return res.status(409).json({ message: "Username already exists" });
    }
    console.error("Create user error:", err);
    res.status(500).json({ message: "Create user failed" });
  }
});

// ✅ return updated user row (frontend expects this)
app.put(
  "/api/users/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, full_name, role, is_active } = req.body;

      // If changing password, hash it
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
          `UPDATE users
           SET username=COALESCE(?, username),
               password_hash=?,
               full_name=?,
               role=?,
               is_active=?
           WHERE id=?`,
          [
            username || null,
            hash,
            full_name || null,
            role || "cashier",
            is_active ?? 1,
            id,
          ]
        );
      } else {
        await pool.query(
          `UPDATE users
           SET username=COALESCE(?, username),
               full_name=?,
               role=?,
               is_active=?
           WHERE id=?`,
          [
            username || null,
            full_name || null,
            role || "cashier",
            is_active ?? 1,
            id,
          ]
        );
      }

      const [rows] = await pool.query(
        `SELECT id, username, full_name, role, created_at
         FROM users WHERE id=? LIMIT 1`,
        [id]
      );

      res.json(rows[0]);
    } catch (err) {
      console.error("Update user error:", err);
      res.status(500).json({ message: "Update user failed" });
    }
  }
);

app.delete(
  "/api/users/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;
    await pool.query(`UPDATE users SET is_active=0 WHERE id=?`, [id]);
    res.json({ message: "User disabled" });
  }
);

// --------------------------------------------------------
// TRANSACTIONS API (ADMIN + CASHIER)
// --------------------------------------------------------

// Get all transactions (with items)
app.get(
  "/api/transactions",
  authMiddleware,
  requireRole("admin", "cashier"),
  async (req, res) => {
    try {
      const [trxRows] = await pool.query(
        "SELECT * FROM transactions ORDER BY date DESC"
      );

      const [itemRows] = await pool.query("SELECT * FROM transaction_items");

      const result = trxRows.map((trx) => ({
        id: String(trx.id),
        subtotal: Number(trx.subtotal),
        discount: Number(trx.discount),
        total: Number(trx.total),
        date: trx.date,
        paymentMethod: trx.payment_method,
        cashReceived: trx.cash_received ?? 0,
        change: trx.change_amount ?? 0,
        customerName: trx.customer_name ?? undefined,
        note: trx.note ?? undefined,
        status: trx.status || "SUCCESS",
        items: itemRows
          .filter((item) => item.transaction_id === trx.id)
          .map((item) => ({
            productId: item.product_id ? String(item.product_id) : "",
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity),
            subtotal: Number(item.subtotal),
          })),
      }));

      res.json(result);
    } catch (error) {
      console.error("Error loading transactions:", error);
      res.status(500).json({ error: "Failed to load transactions" });
    }
  }
);

// Save transaction + items
app.post(
  "/api/transactions",
  authMiddleware,
  requireRole("admin", "cashier"),
  async (req, res) => {
    const {
      items,
      subtotal,
      discount,
      total,
      date,
      paymentMethod,
      cashReceived,
      change,
      customerName,
      note,
      status,
    } = req.body;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const newId = await generateDailyId(conn, date);

      await conn.query(
        `
        INSERT INTO transactions
          (id, subtotal, discount, total, date, payment_method,
           cash_received, change_amount, customer_name, note, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          newId,
          subtotal,
          discount ?? 0,
          total,
          String(date).replace("T", " ").slice(0, 19),
          paymentMethod,
          cashReceived ?? 0,
          change ?? 0,
          customerName || null,
          note || null,
          status || "SUCCESS",
        ]
      );

      for (const item of items || []) {
        const productId = item.productId ? Number(item.productId) : null;

        await conn.query(
          `
          INSERT INTO transaction_items
            (transaction_id, product_id, name, price, quantity, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [
            newId,
            productId,
            item.name,
            item.price,
            item.quantity,
            item.subtotal,
          ]
        );
      }

      await conn.commit();
      res.json({ success: true, id: newId });
    } catch (error) {
      await conn.rollback();
      console.error("Error saving transaction", error);
      res.status(500).json({ error: "Failed to save transaction" });
    } finally {
      conn.release();
    }
  }
);

// --------------------------------------------------------
// PRODUCTS API
// - GET: admin + cashier (POS needs this)
// - POST/PUT/DELETE: admin only
// --------------------------------------------------------

// Get all products
app.get(
  "/api/products",
  authMiddleware,
  requireRole("admin", "cashier"), // ✅ cashier can read products
  async (req, res) => {
    try {
      const [rows] = await pool.query("SELECT * FROM products ORDER BY id ASC");

      const data = rows.map((row) => ({
        id: String(row.id),
        name: row.name,
        price: Number(row.price),
        image: row.image ?? "",
        category: row.category ?? "",
        stock: Number(row.stock ?? 0),
      }));

      res.json(data);
    } catch (error) {
      console.error("Error fetching products", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }
);

// Create product (admin)
app.post(
  "/api/products",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const { name, price, image, category, stock } = req.body;
    try {
      const [result] = await pool.query(
        `
        INSERT INTO products
          (name, price, image, category, stock)
        VALUES (?, ?, ?, ?, ?)
      `,
        [name, price, image || "", category || "", stock ?? -1]
      );

      const insertId = result.insertId || result.insertID || null;

      res.json({
        id: String(insertId),
        name,
        price: Number(price),
        image: image || "",
        category: category || "",
        stock: stock ?? -1,
      });
    } catch (error) {
      console.error("Error creating product", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  }
);

// Update product (admin)
app.put(
  "/api/products/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;
    const { name, price, image, category, stock } = req.body;

    try {
      await pool.query(
        `
        UPDATE products
           SET name = ?,
               price = ?,
               image = ?,
               category = ?,
               stock = ?
         WHERE id = ?
      `,
        [name, price, image || "", category || "", stock ?? -1, id]
      );

      res.json({
        id,
        name,
        price: Number(price),
        image: image || "",
        category: category || "",
        stock: stock ?? -1,
      });
    } catch (error) {
      console.error("Error updating product", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  }
);

// Delete product (admin)
app.delete(
  "/api/products/:id",
  authMiddleware,
  requireRole("admin"),
  async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM products WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  }
);

// --------------------------------------------------------
// START SERVER
// --------------------------------------------------------
const PORT = process.env.PORT || 4000;

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API Server Running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  });
