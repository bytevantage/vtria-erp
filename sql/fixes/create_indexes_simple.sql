-- Performance optimization indexes for VTRIA ERP database
-- Create indexes on frequently queried columns to improve performance

-- Indexes for products table
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_name ON products(name);

-- Indexes for clients table  
CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_city_state ON clients(city, state);

-- Indexes for employees table
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_hire_date ON employees(hire_date);

-- Indexes for sales_enquiries table
CREATE INDEX idx_sales_enquiries_enquiry_id ON sales_enquiries(enquiry_id);
CREATE INDEX idx_sales_enquiries_client_id ON sales_enquiries(client_id);
CREATE INDEX idx_sales_enquiries_status ON sales_enquiries(status);
CREATE INDEX idx_sales_enquiries_date ON sales_enquiries(date);
CREATE INDEX idx_sales_enquiries_enquiry_by ON sales_enquiries(enquiry_by);

-- Indexes for stock_movements table
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_transaction_date ON stock_movements(transaction_date);
CREATE INDEX idx_stock_movements_transaction_type ON stock_movements(transaction_type);

-- Composite indexes for common query patterns
CREATE INDEX idx_sales_enquiries_client_status ON sales_enquiries(client_id, status);
CREATE INDEX idx_employees_dept_status ON employees(department, status);

-- Show created indexes
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'vtria_erp' 
    AND INDEX_NAME != 'PRIMARY'
    AND TABLE_NAME IN ('products', 'clients', 'employees', 'sales_enquiries', 'stock_movements')
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;