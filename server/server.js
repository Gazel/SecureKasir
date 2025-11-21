// server/server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === DATA DIR & JSON FILES ===
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const TRANSACTIONS_FILE = path.join(dataDir, "transactions.json");
const PRODUCTS_FILE = path.join(dataDir, "products.json");

function loadJson(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}`, err);
    return defaultValue;
  }
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`Error writing ${filePath}`, err);
  }
}

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// === IN-MEMORY STATE + LOAD DARI FILE ===
let transactions = loadJson(TRANSACTIONS_FILE, []);
let products = loadJson(PRODUCTS_FILE, []);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// =================== TRANSACTIONS ===================

// GET all transactions
app.get("/api/transactions", (req, res) => {
  res.json(transactions);
});

// POST new transaction
app.post("/api/transactions", (req, res) => {
  const payload = req.body;

  if (!payload || !Array.isArray(payload.items)) {
    return res.status(400).json({ error: "Invalid transaction payload" });
  }

  const newTransaction = {
    id: payload.id,
    items: payload.items,
    subtotal: payload.subtotal,
    discount: payload.discount ?? 0,
    total: payload.total,
    paymentMethod: payload.paymentMethod || "cash",
    cashReceived: payload.cashReceived ?? 0,
    change: payload.change ?? 0,
    date: payload.date || new Date().toISOString(),
    // optional fields
    customerName: payload.customerName || "",
    note: payload.note || "",
  };

  transactions.push(newTransaction);
  saveJson(TRANSACTIONS_FILE, transactions);

  res.status(201).json({ success: true, transaction: newTransaction });
});

// =================== PRODUCTS ===================

// GET all products
app.get("/api/products", (req, res) => {
  res.json(products);
});

// POST new product
app.post("/api/products", (req, res) => {
  const payload = req.body;

  if (!payload || !payload.id || !payload.name) {
    return res.status(400).json({ error: "Invalid product payload" });
  }

  const newProduct = {
    id: payload.id,
    name: payload.name,
    price: payload.price ?? 0,
    image: payload.image || "",
    category: payload.category || "Umum",
    stock: payload.stock ?? 0,
  };

  products.push(newProduct);
  saveJson(PRODUCTS_FILE, products);

  res.status(201).json({ success: true, product: newProduct });
});

// PUT update product
app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }

  const updated = {
    ...products[index],
    ...payload,
    id, // jaga id tetap
  };

  products[index] = updated;
  saveJson(PRODUCTS_FILE, products);

  res.json({ success: true, product: updated });
});

// DELETE product
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const before = products.length;
  products = products.filter((p) => p.id !== id);

  if (products.length === before) {
    return res.status(404).json({ error: "Product not found" });
  }

  saveJson(PRODUCTS_FILE, products);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server Running on port ${PORT}`);
});
