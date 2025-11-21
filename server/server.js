// server/server.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let transactions = [];

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Get all transactions
app.get("/api/transactions", (req, res) => {
  res.json(transactions);
});

// Create new transaction
app.post("/api/transactions", (req, res) => {
  const payload = req.body;

  if (!payload) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  const newTransaction = {
    id: payload.id,
    items: payload.items,
    subtotal: payload.subtotal,
    discount: payload.discount,
    total: payload.total,
    paymentMethod: payload.paymentMethod,
    cashReceived: payload.cashReceived,
    change: payload.change,
    date: payload.date,
  };

  transactions.push(newTransaction);
  res.json({ success: true, transaction: newTransaction });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API Server Running on port ${PORT}`);
});
