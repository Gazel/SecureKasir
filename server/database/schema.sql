CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(64) PRIMARY KEY,
  items JSON NOT NULL,
  subtotal INT NOT NULL,
  discount INT NOT NULL,
  total INT NOT NULL,
  date DATETIME NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  cash_received INT,
  change_amount INT,
  customer_name VARCHAR(255),
  note TEXT
);
