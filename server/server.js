import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(cors());
app.use(express.json());

// ⚡ Database Connection Pool (works for MySQL & MariaDB)
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
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
      id VARCHAR(50) PRIMARY KEY,
      subtotal INT NOT NULL,
      discount INT NOT NULL,
      total INT NOT NULL,
      date DATETIME NOT NULL,
      payment_method VARCHAR(20) NOT NULL,
      cash_received INT,
      change_amount INT,
      customer_name VARCHAR(100),
      note TEXT
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

    const trxList = trxRows as any[];
    const items = itemRows as any[];

    // Shape data to match frontend Transaction & CartItem types
    const result = trxList.map((trx) => ({
      id: String(trx.id),
      subtotal: Number(trx.subtotal),
      discount: Number(trx.discount),
      total: Number(trx.total),
      date: trx.date, // will be stringified by JSON
      paymentMethod: trx.payment_method,
      cashReceived: trx.cash_received ?? 0,
      change: trx.change_amount ?? 0,
      customerName: trx.customer_name ?? undefined,
      note: trx.note ?? undefined,
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
    note,
  } = req.body;

  try {
    // Save header
    await pool.query(
      `
      INSERT INTO transactions
        (id, subtotal, discount, total, date, payment_method,
         cash_received, change_amount, customer_name, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        subtotal,
        discount,
        total,
        // "2025-11-21T13:45:00.000Z" -> "2025-11-21 13:45:00"
        String(date).replace("T", " ").slice(0, 19),
        paymentMethod,
        cashReceived,
        change,
        customerName || null,
        note || null,
      ]
    );

    // Save detail items
    for (const item of items || []) {
      await pool.query(
        `
        INSERT INTO transaction_items
          (transaction_id, product_id, name, price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          item.productId,
          item.name,
          item.price,
          item.quantity,
          item.subtotal,
        ]
      );
    }

    res.json({ success: true });
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
    // Normalize to match frontend Product type (id as string)
    const data = (rows as any[]).map((row) => ({
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

    const insertId =
      (result as any).insertId ?? (result as any).insertID ?? null;

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
