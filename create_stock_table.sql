-- VTRIA ERP Stock Table Creation Script for MySQL
-- This script creates the missing stock table

-- Stock Table (renamed to stock from stocks in the previous script)
CREATE TABLE IF NOT EXISTS stock (
  id VARCHAR(36) PRIMARY KEY,
  location_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  batch_id VARCHAR(36),
  quantity INT NOT NULL,
  min_quantity INT DEFAULT 0,
  last_updated_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE(location_id, product_id, batch_id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (last_updated_by) REFERENCES users(id)
);

-- Insert initial stock data
INSERT INTO stock (id, location_id, product_id, quantity, min_quantity, last_updated_by)
SELECT 
  UUID(), 
  l.id, 
  p.id, 
  CASE l.name
    WHEN 'Mangalore Office' THEN 10
    WHEN 'Bangalore Office' THEN 5
    WHEN 'Pune Office' THEN 3
  END,
  2,
  (SELECT id FROM users WHERE email = 'admin@vtria.com')
FROM 
  locations l, 
  products p
LIMIT 5;
