import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

const app = express();
app.use(cors());
app.use(express.json());

// ⚡ Database Connection Pool
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
// 📌 GET ALL TRANSACTIONS
// --------------------------------------------------------
app.get("/api/transactions", async (req, res) => {
  try {
    const [trxRows] = await pool.query("SELECT * FROM transactions ORDER BY date DESC");

    const [itemRows] = await pool.query("SELECT * FROM transaction_items");

    // Assemble into nested structure
    const result = trxRows.map((trx) => ({
      ...trx,
      items: itemRows.filter((item) => item.transaction_id === trx.id),
    }));

    res.json(result);
  } catch (error) {
    console.error("Error loading transactions:", error);
    res.status(500).json({ error: "Failed to load transactions" });
  }
});

// --------------------------------------------------------
// 📌 SAVE TRANSACTION (TRANSACTION + ITEMS)
// --------------------------------------------------------
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
    // Save transaction
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
        date.replace("T", " ").slice(0, 19),
        paymentMethod,
        cashReceived,
        change,
        customerName || null,
        note || null,
      ]
    );

    // Save all items
    for (const item of items) {
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
