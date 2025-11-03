-- VTRIA ERP Production Database Schema
-- Complete schema with all required tables and relationships

USE vtria_erp;

-- Users table (already created in 01-init.sql)
-- Departments table (already created in 01-init.sql)
-- Employees table (already created in 01-init.sql)
-- Suppliers table (already created in 01-init.sql)
-- Expense categories table (already created in 01-init.sql)

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    stock_quantity INT DEFAULT 0,
    min_stock_level INT DEFAULT 0,
    max_stock_level INT DEFAULT 0,
    supplier_id INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    gst_number VARCHAR(50),
    contact_person VARCHAR(255),
    status ENUM('active', 'inactive') DEFAULT 'active',
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sales enquiries table
CREATE TABLE IF NOT EXISTS sales_enquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enquiry_id VARCHAR(50) UNIQUE NOT NULL,
    enquiry_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    project_name VARCHAR(255),
    description TEXT,
    status ENUM('open', 'closed', 'converted') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    expected_value DECIMAL(12,2),
    follow_up_date DATE,
    enquiry_date DATE,
    enquiry_by INT NOT NULL,
    assigned_to INT,
    case_id INT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (enquiry_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (case_id) REFERENCES cases(id)
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    enquiry_id INT,
    client_id INT NOT NULL,
    valid_until DATE,
    total_amount DECIMAL(12,2),
    status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired') DEFAULT 'draft',
    terms TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Quotation items table
CREATE TABLE IF NOT EXISTS quotation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    description TEXT,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Sales orders table
CREATE TABLE IF NOT EXISTS sales_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_id INT,
    client_id INT NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    total_amount DECIMAL(12,2),
    status ENUM('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Sales order items table
CREATE TABLE IF NOT EXISTS sales_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    total_amount DECIMAL(12,2),
    status ENUM('pending', 'approved', 'sent', 'received', 'cancelled') DEFAULT 'pending',
    created_by INT NOT NULL,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Purchase order items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_type ENUM('in', 'out') NOT NULL,
    quantity INT NOT NULL,
    reference_type ENUM('sales_order', 'purchase_order', 'adjustment') NOT NULL,
    reference_id INT NOT NULL,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    category_id INT NOT NULL,
    subcategory_id INT,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    department_id INT,
    employee_id INT,
    supplier_id INT,
    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    receipt_url VARCHAR(500),
    notes TEXT,
    created_by INT NOT NULL,
    approved_by INT,
    paid_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES expense_categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES expense_categories(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (paid_by) REFERENCES users(id)
);

-- Payroll table
CREATE TABLE IF NOT EXISTS payroll (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payroll_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id INT NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    allowances DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    overtime DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) NOT NULL,
    status ENUM('draft', 'calculated', 'approved', 'paid') DEFAULT 'draft',
    payment_date DATE,
    created_by INT NOT NULL,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Production orders table
CREATE TABLE IF NOT EXISTS production_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id INT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Timesheets table
CREATE TABLE IF NOT EXISTS timesheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    break_duration INT DEFAULT 0, -- in minutes
    total_hours DECIMAL(4,2),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    notes TEXT,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration INT DEFAULT 0, -- in minutes
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Shift assignments table
CREATE TABLE IF NOT EXISTS shift_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    shift_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Estimations table
CREATE TABLE IF NOT EXISTS estimations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id VARCHAR(50) UNIQUE NOT NULL,
    enquiry_id INT,
    case_id INT,
    date DATE,
    status ENUM('draft', 'sent', 'approved', 'rejected') DEFAULT 'draft',
    total_mrp DECIMAL(12,2) DEFAULT 0,
    total_discount DECIMAL(12,2) DEFAULT 0,
    total_final_price DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by INT NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enquiry_id) REFERENCES sales_enquiries(id),
    FOREIGN KEY (case_id) REFERENCES cases(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Estimation sections table
CREATE TABLE IF NOT EXISTS estimation_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id) ON DELETE CASCADE
);

-- Estimation subsections table
CREATE TABLE IF NOT EXISTS estimation_subsections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES estimation_sections(id) ON DELETE CASCADE
);

-- Estimation items table
CREATE TABLE IF NOT EXISTS estimation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id INT NOT NULL,
    section_id INT,
    subsection_id INT,
    product_id INT,
    description TEXT,
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2),
    total_price DECIMAL(12,2),
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES estimation_sections(id),
    FOREIGN KEY (subsection_id) REFERENCES estimation_subsections(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Purchase requisitions table
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requisition_number VARCHAR(50) UNIQUE NOT NULL,
    estimation_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total_amount DECIMAL(12,2),
    status ENUM('draft', 'submitted', 'approved', 'rejected', 'processed') DEFAULT 'draft',
    created_by INT NOT NULL,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

SELECT 'Production Database Schema Created Successfully!' as Status;
