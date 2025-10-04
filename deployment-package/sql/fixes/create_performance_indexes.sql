-- Performance optimization indexes for VTRIA ERP database
-- Create indexes on frequently queried columns to improve performance

-- Indexes for products table
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Indexes for clients table
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_city_state ON clients(city, state);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Indexes for employees table
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);

-- Indexes for sales_enquiries table
CREATE INDEX IF NOT EXISTS idx_sales_enquiries_enquiry_id ON sales_enquiries(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_sales_enquiries_client_id ON sales_enquiries(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_enquiries_status ON sales_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_sales_enquiries_date ON sales_enquiries(date);
CREATE INDEX IF NOT EXISTS idx_sales_enquiries_enquiry_by ON sales_enquiries(enquiry_by);

-- Indexes for cases table (if exists)
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);

-- Indexes for invoices table (if exists)
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Indexes for payments table (if exists)
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);

-- Indexes for purchase_orders table (if exists)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);

-- Indexes for stock_movements table
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_transaction_date ON stock_movements(transaction_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_transaction_type ON stock_movements(transaction_type);

-- Indexes for quotations table (if exists)
CREATE INDEX IF NOT EXISTS idx_quotations_quotation_number ON quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_enquiry_id ON quotations(enquiry_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sales_enquiries_client_status ON sales_enquiries(client_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_dept_status ON employees(department, status);
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category, status);

-- Full-text search indexes for text fields
CREATE FULLTEXT INDEX IF NOT EXISTS idx_products_fulltext ON products(name, description);
CREATE FULLTEXT INDEX IF NOT EXISTS idx_clients_fulltext ON clients(company_name, contact_person);

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