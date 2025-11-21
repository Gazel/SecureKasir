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
