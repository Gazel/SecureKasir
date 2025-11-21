import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(cors());
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
    const last3 = parseInt(maxId.slice(-3), 10);
    if (!Number.isNaN(last3)) nextSeq = last3 + 1;
  }

  return `${yyyymmdd}${String(nextSeq).padStart(3, "0")}`;
}

// ⚡ Database Connection Pool (MariaDB / MySQL)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "securekasir",
  waitForConnections: true,
  connectionLimit: 10,
});

// --------------------------------------------------------
// 📦 AUTO CREATE TABLES (Runs at Startup)
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
      stock INT NOT NULL DEFAULT 0,
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
      product_id VARCHAR(50),
      name VARCHAR(255),
      price INT NOT NULL,
      quantity INT NOT NULL,
      subtotal INT NOT NULL,
      FOREIGN KEY (transaction_id)
        REFERENCES transactions(id)
        ON DELETE CASCADE
    );
  `);

  console.log("✅ Database ready (tables exist)");
}

// --------------------------------------------------------
// 📌 TRANSACTIONS API
// --------------------------------------------------------

// Get all transactions (with items)
app.get("/api/transactions", async (req, res) => {
  try {
    const [trxRows] = await pool.query(
      "SELECT * FROM transactions ORDER BY date DESC"
    );

    const [itemRows] = await pool.query(
      "SELECT * FROM transaction_items"
    );

    const trxList = trxRows;
    const items = itemRows;

    const result = trxList.map((trx) => ({
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
      status: trx.status || "SUCCESS",   // <-- correct

      items: items
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
});

// Save transaction + items
app.post("/api/transactions", async (req, res) => {
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
    status, // ✅ NEW
  } = req.body;

  try {
    // ✅ generate backend ID: YYYYMMDDXXX
    const newId = await generateDailyId(pool, date);

    await pool.query(
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
        status || "SUCCESS", // ✅ default
      ]
    );

    for (const item of items || []) {
      await pool.query(
        `
        INSERT INTO transaction_items
          (transaction_id, product_id, name, price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          newId,
          item.productId,
          item.name,
          item.price,
          item.quantity,
          item.subtotal,
        ]
      );
    }

    res.json({ success: true, id: newId });
  } catch (error) {
    console.error("Error saving transaction", error);
    res.status(500).json({ error: "Failed to save transaction" });
  }
});

// --------------------------------------------------------
// 📌 PRODUCTS API
// --------------------------------------------------------

// Get all products
app.get("/api/products", async (req, res) => {
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
});

// Create product
app.post("/api/products", async (req, res) => {
  const { name, price, image, category, stock } = req.body;
  try {
    const [result] = await pool.query(
      `
      INSERT INTO products
        (name, price, image, category, stock)
      VALUES (?, ?, ?, ?, ?)
    `,
      [name, price, image || "", category || "", stock ?? 0]
    );

    const insertId = result.insertId || result.insertID || null;

    res.json({
      id: String(insertId),
      name,
      price,
      image: image || "",
      category: category || "",
      stock: stock ?? 0,
    });
  } catch (error) {
    console.error("Error creating product", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Update product
app.put("/api/products/:id", async (req, res) => {
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
      [name, price, image || "", category || "", stock ?? 0, id]
    );

    res.json({
      id,
      name,
      price,
      image: image || "",
      category: category || "",
      stock: stock ?? 0,
    });
  } catch (error) {
    console.error("Error updating product", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Delete product
app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM products WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// --------------------------------------------------------
// 🚀 START SERVER
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
