-- Migration: Complete Schema Fixes for VTRIA ERP
-- Date: 2025-11-04
-- Purpose: Add all missing columns required by the application
--          This fixes 500 errors on the frontend caused by missing database columns

-- =============================================
-- QUOTATIONS TABLE FIXES
-- =============================================

-- Add quotation_id for easier reference (in addition to quotation_number)
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS quotation_id VARCHAR(50) NULL AFTER id,
ADD UNIQUE INDEX IF NOT EXISTS idx_quotation_id (quotation_id);

-- Copy existing quotation_number to quotation_id if null
UPDATE quotations 
SET quotation_id = quotation_number 
WHERE quotation_id IS NULL;

-- Add estimation_id to link quotations with estimations
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS estimation_id INT NULL AFTER enquiry_id,
ADD INDEX IF NOT EXISTS idx_estimation_id (estimation_id);

-- Add case_id to link quotations with cases
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS case_id INT NULL AFTER estimation_id,
ADD INDEX IF NOT EXISTS idx_case_id (case_id);

-- Add approved_by for workflow approval tracking
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER created_by,
ADD INDEX IF NOT EXISTS idx_approved_by (approved_by);

-- Add deleted_at for soft deletes
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL AFTER updated_at;

-- Add missing financial columns to quotations table
ALTER TABLE quotations 
ADD COLUMN total_tax DECIMAL(15,2) DEFAULT '0.00' AFTER total_amount,
ADD COLUMN final_amount DECIMAL(15,2) DEFAULT '0.00' AFTER total_tax,
ADD COLUMN grand_total DECIMAL(15,2) DEFAULT '0.00' AFTER final_amount,
ADD COLUMN approved_at TIMESTAMP NULL DEFAULT NULL AFTER approved_by;

-- Update status enum to include all expected values
ALTER TABLE quotations 
MODIFY COLUMN status ENUM('draft','sent','approved','rejected','revised','accepted','pending') DEFAULT 'draft';

-- =============================================
-- EMPLOYEES TABLE FIXES
-- =============================================

-- Add reporting_manager_id for organizational hierarchy
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS reporting_manager_id INT NULL AFTER department_id,
ADD INDEX IF NOT EXISTS idx_reporting_manager (reporting_manager_id);

-- =============================================
-- DEPARTMENTS TABLE FIXES
-- =============================================

-- Add department_code for easy reference
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS department_code VARCHAR(20) NULL AFTER id;

-- Add department_name (may be duplicate of name, but required by queries)
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS department_name VARCHAR(255) NULL AFTER name;

-- Copy existing name to department_name if null
UPDATE departments 
SET department_name = name 
WHERE department_name IS NULL;

-- =============================================
-- USERS TABLE FIXES
-- =============================================

-- Add employee_id to link users with employees
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) NULL AFTER id,
ADD INDEX IF NOT EXISTS idx_employee_id (employee_id);

-- =============================================
-- SALES ORDERS TABLE FIXES
-- =============================================

-- Add approved_by for approval tracking (may already exist)
-- ALTER TABLE sales_orders ADD COLUMN approved_by INT NULL AFTER created_by;

-- Add deleted_at for soft deletes (may already exist)
-- ALTER TABLE sales_orders ADD COLUMN deleted_at TIMESTAMP NULL AFTER updated_at;

-- Add case_id to link with cases (may already exist)
-- ALTER TABLE sales_orders ADD COLUMN case_id INT NULL AFTER quotation_id;

-- Add tax_amount and grand_total (may already exist)
-- ALTER TABLE sales_orders ADD COLUMN tax_amount DECIMAL(12,2) DEFAULT 0.00 AFTER total_amount;
-- ALTER TABLE sales_orders ADD COLUMN grand_total DECIMAL(12,2) DEFAULT 0.00 AFTER tax_amount;

-- =============================================
-- MANUFACTURING CASES TABLE
-- =============================================

-- Create manufacturing_cases table for production tracking
CREATE TABLE IF NOT EXISTS manufacturing_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NULL,
    case_number VARCHAR(50),
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_case_id (case_id),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================
-- PURCHASE REQUISITIONS TABLE FIXES
-- =============================================

-- Create purchase_requisition_items table for detailed requisition line items
CREATE TABLE IF NOT EXISTS purchase_requisition_items (
  id INT NOT NULL AUTO_INCREMENT,
  pr_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  item_name VARCHAR(255) DEFAULT NULL,
  description TEXT,
  hsn_code VARCHAR(20) DEFAULT NULL,
  unit VARCHAR(20) DEFAULT 'Nos',
  quantity DECIMAL(10,2) NOT NULL,
  estimated_price DECIMAL(10,2) DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (pr_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add missing columns to purchase_requisitions table
ALTER TABLE purchase_requisitions 
ADD COLUMN pr_number VARCHAR(50) NULL AFTER id,
ADD COLUMN supplier_id INT DEFAULT NULL AFTER quotation_id,
ADD COLUMN pr_date DATE NULL AFTER supplier_id,
ADD COLUMN case_id INT DEFAULT NULL AFTER status,
ADD COLUMN rfq_id INT DEFAULT NULL AFTER updated_at,
ADD INDEX idx_supplier_id (supplier_id),
ADD INDEX idx_case_id (case_id),
ADD INDEX idx_rfq_id (rfq_id);

-- Update pr_number from requisition_number if null
UPDATE purchase_requisitions 
SET pr_number = requisition_number 
WHERE pr_number IS NULL;

-- Make pr_number unique
ALTER TABLE purchase_requisitions 
ADD UNIQUE KEY unique_pr_number (pr_number);

-- Update status enum to match expected values
ALTER TABLE purchase_requisitions 
MODIFY COLUMN status ENUM('draft','pending_approval','approved','rejected','closed','submitted','processed') DEFAULT 'draft';

-- =============================================
-- INVENTORY VENDORS TABLE
-- =============================================

-- Create inventory_vendors table for vendor management
CREATE TABLE IF NOT EXISTS inventory_vendors (
  id INT NOT NULL AUTO_INCREMENT,
  vendor_code VARCHAR(50) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  address TEXT,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  pincode VARCHAR(20) DEFAULT NULL,
  gstin VARCHAR(20) DEFAULT NULL,
  pan_number VARCHAR(20) DEFAULT NULL,
  payment_terms TEXT,
  credit_limit DECIMAL(15,2) DEFAULT '0.00',
  rating ENUM('A','B','C','D') DEFAULT 'B',
  tax_category ENUM('REGISTERED','UNREGISTERED','COMPOSITE','EXPORT') DEFAULT 'REGISTERED',
  vendor_type ENUM('DOMESTIC','IMPORT','EXPORT') DEFAULT 'DOMESTIC',
  is_active TINYINT(1) DEFAULT '1',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY vendor_code (vendor_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================
-- PURCHASE ORDERS TABLE FIXES
-- =============================================

-- Add missing columns to purchase_orders table
ALTER TABLE purchase_orders 
ADD COLUMN po_id VARCHAR(50) NULL AFTER id,
ADD COLUMN po_number VARCHAR(50) NULL AFTER po_id,
ADD COLUMN date DATE NULL AFTER supplier_id,
ADD COLUMN po_date DATE NULL AFTER expected_delivery_date,
ADD COLUMN delivery_date DATE NULL AFTER date,
ADD COLUMN tax_amount DECIMAL(15,2) DEFAULT '0.00' AFTER total_amount,
ADD COLUMN grand_total DECIMAL(15,2) DEFAULT '0.00' AFTER tax_amount,
ADD COLUMN purchase_request_id INT DEFAULT NULL AFTER grand_total,
ADD UNIQUE KEY unique_po_id (po_id),
ADD INDEX idx_purchase_request_id (purchase_request_id);

-- Copy existing order_number to po_id and po_number if null
UPDATE purchase_orders 
SET po_id = order_number,
    po_number = order_number
WHERE po_id IS NULL;

-- Copy order_date to date and po_date if null
UPDATE purchase_orders 
SET date = order_date,
    po_date = order_date
WHERE date IS NULL;

-- Update status enum to match expected values
ALTER TABLE purchase_orders 
MODIFY COLUMN status ENUM('draft','pending','approved','completed','cancelled','sent','received') DEFAULT 'draft';

-- Add foreign key constraint for purchase_request_id
ALTER TABLE purchase_orders 
ADD CONSTRAINT fk_purchase_orders_requisition 
FOREIGN KEY (purchase_request_id) REFERENCES purchase_requisitions(id);

-- =============================================
-- GOODS RECEIVED NOTES (GRN) TABLES
-- =============================================

-- Create goods_received_notes table for GRN management
CREATE TABLE IF NOT EXISTS goods_received_notes (
  id INT NOT NULL AUTO_INCREMENT,
  grn_number VARCHAR(50) NOT NULL,
  purchase_order_id INT DEFAULT NULL,
  supplier_id INT NOT NULL,
  grn_date DATE NOT NULL,
  lr_number VARCHAR(100) DEFAULT NULL,
  supplier_invoice_number VARCHAR(100) DEFAULT NULL,
  supplier_invoice_date DATE DEFAULT NULL,
  total_amount DECIMAL(15,2) DEFAULT '0.00',
  status ENUM('draft','verified','approved','cancelled') DEFAULT 'draft',
  received_by INT DEFAULT NULL,
  verified_by INT DEFAULT NULL,
  approved_by INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY grn_number (grn_number),
  KEY idx_purchase_order_id (purchase_order_id),
  KEY idx_supplier_id (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create grn_items table for GRN line items
CREATE TABLE IF NOT EXISTS grn_items (
  id INT NOT NULL AUTO_INCREMENT,
  grn_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  ordered_quantity DECIMAL(10,2) NOT NULL,
  received_quantity DECIMAL(10,2) NOT NULL,
  accepted_quantity DECIMAL(10,2) NOT NULL,
  rejected_quantity DECIMAL(10,2) DEFAULT '0.00',
  unit_price DECIMAL(10,2) DEFAULT NULL,
  serial_numbers TEXT,
  warranty_start_date DATE DEFAULT NULL,
  warranty_end_date DATE DEFAULT NULL,
  location_id INT DEFAULT NULL,
  notes TEXT,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_grn_id (grn_id),
  KEY idx_product_id (product_id),
  FOREIGN KEY (grn_id) REFERENCES goods_received_notes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================
-- COMPANY LOCATIONS TABLE
-- =============================================

-- Create company_locations table for managing company locations/branches
CREATE TABLE IF NOT EXISTS company_locations (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  pincode VARCHAR(20) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,
  contact_person VARCHAR(255) DEFAULT NULL,
  is_head_office TINYINT(1) DEFAULT '0',
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================
-- SUPPLIERS TABLE
-- =============================================

-- Drop and recreate suppliers table with correct structure
-- Note: The existing suppliers table had incorrect schema (only had 'name' field)
-- This replaces it with the proper structure expected by the application
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS suppliers;
SET FOREIGN_KEY_CHECKS = 1;

-- Create suppliers table for supplier/vendor management
CREATE TABLE IF NOT EXISTS suppliers (
  id INT NOT NULL AUTO_INCREMENT,
  supplier_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) DEFAULT NULL,
  contact_person VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  address TEXT,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  pincode VARCHAR(20) DEFAULT NULL,
  gstin VARCHAR(20) DEFAULT NULL,
  pan_number VARCHAR(20) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT '1',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  code VARCHAR(50) DEFAULT NULL,
  pan VARCHAR(20) DEFAULT NULL,
  payment_terms VARCHAR(100) DEFAULT NULL,
  credit_limit DECIMAL(15,2) DEFAULT '0.00',
  rating ENUM('excellent','good','fair','poor') DEFAULT 'good',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================
-- MANUFACTURING/PRODUCTION TABLES
-- =============================================

-- Create bom_headers table for Bill of Materials
CREATE TABLE IF NOT EXISTS bom_headers (
  id INT NOT NULL AUTO_INCREMENT,
  bom_number VARCHAR(50) NOT NULL,
  production_item_id INT DEFAULT NULL,
  version VARCHAR(20) DEFAULT '1.0',
  description TEXT,
  quantity_per_unit DECIMAL(15,3) DEFAULT '1.000',
  material_cost DECIMAL(15,2) DEFAULT '0.00',
  labor_cost DECIMAL(15,2) DEFAULT '0.00',
  overhead_cost DECIMAL(15,2) DEFAULT '0.00',
  total_cost DECIMAL(15,2) GENERATED ALWAYS AS ((material_cost + labor_cost + overhead_cost)) STORED,
  effective_from DATE DEFAULT NULL,
  effective_to DATE DEFAULT NULL,
  status ENUM('draft','active','inactive','superseded') DEFAULT 'draft',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY bom_number (bom_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create manufacturing_units table
CREATE TABLE IF NOT EXISTS manufacturing_units (
  id INT NOT NULL AUTO_INCREMENT,
  unit_name VARCHAR(255) NOT NULL,
  unit_code VARCHAR(50) NOT NULL,
  location VARCHAR(255) DEFAULT NULL,
  capacity_per_day DECIMAL(15,3) DEFAULT '0.000',
  unit_of_measurement VARCHAR(50) DEFAULT 'PCS',
  manager_employee_id INT DEFAULT NULL,
  contact_phone VARCHAR(20) DEFAULT NULL,
  contact_email VARCHAR(100) DEFAULT NULL,
  status ENUM('active','inactive','maintenance') DEFAULT 'active',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unit_code (unit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create manufacturing_work_orders table
CREATE TABLE IF NOT EXISTS manufacturing_work_orders (
  id INT NOT NULL AUTO_INCREMENT,
  manufacturing_case_id INT DEFAULT NULL,
  work_order_number VARCHAR(50) NOT NULL,
  operation_name VARCHAR(255) DEFAULT NULL,
  sequence_number INT DEFAULT '1',
  status ENUM('pending','in_progress','completed','on_hold') DEFAULT 'pending',
  assigned_to INT DEFAULT NULL,
  planned_start_date DATE DEFAULT NULL,
  planned_end_date DATE DEFAULT NULL,
  actual_start_date DATE DEFAULT NULL,
  actual_end_date DATE DEFAULT NULL,
  estimated_hours DECIMAL(8,2) DEFAULT '0.00',
  actual_hours DECIMAL(8,2) DEFAULT '0.00',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY work_order_number (work_order_number),
  KEY idx_manufacturing_case_id (manufacturing_case_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Update manufacturing_cases table with missing columns
ALTER TABLE manufacturing_cases 
ADD COLUMN manufacturing_case_number VARCHAR(50) NULL AFTER id,
ADD COLUMN planned_start_date DATE DEFAULT NULL AFTER case_id,
ADD COLUMN planned_end_date DATE DEFAULT NULL AFTER planned_start_date,
ADD COLUMN actual_start_date DATE DEFAULT NULL AFTER planned_end_date,
ADD COLUMN actual_end_date DATE DEFAULT NULL AFTER actual_start_date,
ADD COLUMN priority ENUM('low','medium','high','urgent') DEFAULT 'medium' AFTER status,
ADD COLUMN progress_percentage DECIMAL(5,2) DEFAULT '0.00' AFTER priority,
ADD COLUMN notes TEXT AFTER progress_percentage,
ADD COLUMN created_by INT DEFAULT NULL AFTER notes,
ADD COLUMN deleted_at TIMESTAMP NULL AFTER updated_at,
ADD COLUMN bom_header_id INT DEFAULT NULL AFTER deleted_at,
ADD COLUMN manufacturing_unit_id INT DEFAULT NULL AFTER bom_header_id,
ADD UNIQUE KEY unique_manufacturing_case_number (manufacturing_case_number),
ADD INDEX idx_bom_header_id (bom_header_id),
ADD INDEX idx_manufacturing_unit_id (manufacturing_unit_id);

-- Update status enum to match expected values
ALTER TABLE manufacturing_cases 
MODIFY COLUMN status ENUM('planning','approved','in_progress','on_hold','completed','cancelled','pending') DEFAULT 'planning';

-- Update case_number to manufacturing_case_number if null
UPDATE manufacturing_cases 
SET manufacturing_case_number = case_number 
WHERE manufacturing_case_number IS NULL AND case_number IS NOT NULL;

-- =============================================
-- CASES TABLE FIXES
-- =============================================

-- Add missing columns to cases table
ALTER TABLE cases 
ADD COLUMN requirements TEXT AFTER project_name,
ADD COLUMN estimated_value DECIMAL(15,2) DEFAULT NULL AFTER requirements,
ADD COLUMN final_value DECIMAL(15,2) DEFAULT NULL AFTER estimated_value,
ADD COLUMN expected_completion_date DATE DEFAULT NULL AFTER status,
ADD COLUMN actual_completion_date DATE DEFAULT NULL AFTER expected_completion_date,
ADD COLUMN notes TEXT AFTER actual_completion_date;

-- Update status enum to match expected values
ALTER TABLE cases 
MODIFY COLUMN status ENUM('active','on_hold','cancelled','completed','open','closed','pending') DEFAULT 'active';

-- Update current_state enum to include 'estimation' 
ALTER TABLE cases 
MODIFY COLUMN current_state ENUM('enquiry','estimation','quotation','order','production','delivery','closed') DEFAULT 'enquiry';

-- =============================================
-- QUALITY MANAGEMENT TABLES
-- =============================================

-- Create quality_checkpoints table
CREATE TABLE IF NOT EXISTS quality_checkpoints (
  id INT NOT NULL AUTO_INCREMENT,
  checkpoint_code VARCHAR(50) NOT NULL,
  checkpoint_name VARCHAR(200) NOT NULL,
  checkpoint_type ENUM('incoming','in_process','final','pre_delivery') DEFAULT 'in_process',
  description TEXT,
  is_mandatory TINYINT(1) DEFAULT '1',
  sequence_order INT DEFAULT '0',
  applicable_categories JSON DEFAULT NULL COMMENT 'Product categories this applies to',
  is_active TINYINT(1) DEFAULT '1',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY checkpoint_code (checkpoint_code),
  KEY idx_checkpoint_type (checkpoint_type),
  KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create quality_defect_types table
CREATE TABLE IF NOT EXISTS quality_defect_types (
  id INT NOT NULL AUTO_INCREMENT,
  defect_code VARCHAR(50) NOT NULL,
  defect_name VARCHAR(200) NOT NULL,
  category ENUM('critical','major','minor','cosmetic') DEFAULT 'minor',
  description TEXT,
  root_cause_category VARCHAR(100) DEFAULT NULL COMMENT 'Material, Process, Equipment, Human',
  corrective_action_required TINYINT(1) DEFAULT '0',
  is_active TINYINT(1) DEFAULT '1',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY defect_code (defect_code),
  KEY idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create quality_control_templates table
CREATE TABLE IF NOT EXISTS quality_control_templates (
  id INT NOT NULL AUTO_INCREMENT,
  template_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT '1',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create quality_inspections table
CREATE TABLE IF NOT EXISTS quality_inspections (
  id INT NOT NULL AUTO_INCREMENT,
  inspection_number VARCHAR(50) NOT NULL,
  work_order_id INT DEFAULT NULL,
  template_id INT DEFAULT NULL,
  inspection_type ENUM('incoming','in_process','final','outgoing') NOT NULL,
  lot_number VARCHAR(50) DEFAULT NULL,
  quantity_inspected DECIMAL(10,4) DEFAULT NULL,
  quantity_passed DECIMAL(10,4) DEFAULT '0.0000',
  quantity_failed DECIMAL(10,4) DEFAULT '0.0000',
  overall_result ENUM('pass','fail','conditional_pass') DEFAULT 'pass',
  inspector_id INT DEFAULT NULL,
  inspection_date DATETIME NOT NULL,
  notes TEXT,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY inspection_number (inspection_number),
  KEY work_order_id (work_order_id),
  KEY template_id (template_id),
  KEY inspector_id (inspector_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =============================================
-- PRODUCTION PLANNING & SCHEDULING TABLES
-- =============================================

-- Production Schedule
CREATE TABLE IF NOT EXISTS production_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_code VARCHAR(50) UNIQUE NOT NULL,
    schedule_name VARCHAR(200) NOT NULL,
    schedule_type ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
    schedule_date DATE NOT NULL,
    manufacturing_unit_id INT,
    
    -- Planning
    planned_capacity DECIMAL(10,2),
    allocated_capacity DECIMAL(10,2),
    available_capacity DECIMAL(10,2),
    
    -- Status
    status ENUM('draft', 'planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
    
    -- Performance
    actual_output DECIMAL(10,2),
    efficiency_percentage DECIMAL(5,2),
    
    notes TEXT,
    created_by INT,
    approved_by INT,
    approved_at DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    INDEX idx_schedule_date (schedule_date),
    INDEX idx_status (status),
    INDEX idx_manufacturing_unit (manufacturing_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Production Schedule Items
CREATE TABLE IF NOT EXISTS production_schedule_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    work_order_id INT NOT NULL,
    sequence_order INT DEFAULT 0,
    
    -- Time Allocation
    planned_start_time DATETIME,
    planned_end_time DATETIME,
    estimated_duration_minutes INT,
    
    -- Actual
    actual_start_time DATETIME,
    actual_end_time DATETIME,
    actual_duration_minutes INT,
    
    -- Resources
    assigned_machine_id INT,
    assigned_operator_id INT,
    
    -- Priority
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    status ENUM('scheduled', 'in_progress', 'completed', 'delayed', 'cancelled') DEFAULT 'scheduled',
    delay_reason VARCHAR(200),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (schedule_id) REFERENCES production_schedule(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    FOREIGN KEY (assigned_machine_id) REFERENCES production_machines(id),
    FOREIGN KEY (assigned_operator_id) REFERENCES users(id),
    
    INDEX idx_schedule (schedule_id),
    INDEX idx_work_order (work_order_id),
    INDEX idx_time_range (planned_start_time, planned_end_time),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PRODUCTION WASTE TRACKING
-- =============================================

-- Waste Categories
CREATE TABLE IF NOT EXISTS waste_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    waste_type ENUM('material', 'time', 'energy', 'defect', 'overproduction') NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Waste Records
CREATE TABLE IF NOT EXISTS production_waste_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    waste_category_id INT NOT NULL,
    
    -- Quantity
    waste_quantity DECIMAL(10,2) NOT NULL,
    waste_unit VARCHAR(20) NOT NULL,
    
    -- Cost
    material_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    overhead_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    
    -- Details
    waste_reason VARCHAR(200),
    root_cause TEXT,
    corrective_action TEXT,
    
    -- Responsibility
    responsible_operator_id INT,
    reported_by INT,
    
    -- Disposal
    disposal_method VARCHAR(100),
    disposed_at DATETIME,
    
    waste_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    FOREIGN KEY (waste_category_id) REFERENCES waste_categories(id),
    FOREIGN KEY (responsible_operator_id) REFERENCES users(id),
    FOREIGN KEY (reported_by) REFERENCES users(id),
    
    INDEX idx_work_order (work_order_id),
    INDEX idx_waste_date (waste_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PRODUCTION ANALYTICS & OEE METRICS
-- =============================================

-- OEE (Overall Equipment Effectiveness) Records
CREATE TABLE IF NOT EXISTS production_oee_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT,
    manufacturing_unit_id INT,
    work_order_id INT,
    
    -- Date
    record_date DATE NOT NULL,
    shift VARCHAR(50),
    
    -- Time Components
    planned_production_time_minutes INT NOT NULL,
    actual_runtime_minutes INT NOT NULL,
    downtime_minutes INT DEFAULT 0,
    
    -- Quantity Components
    target_quantity INT NOT NULL,
    actual_quantity INT NOT NULL,
    good_quantity INT NOT NULL,
    rejected_quantity INT DEFAULT 0,
    
    -- OEE Factors
    availability_percentage DECIMAL(5,2) COMMENT 'Runtime / Planned time',
    performance_percentage DECIMAL(5,2) COMMENT 'Actual / Target',
    quality_percentage DECIMAL(5,2) COMMENT 'Good / Actual',
    oee_percentage DECIMAL(5,2) COMMENT 'Availability × Performance × Quality',
    
    -- World Class OEE Benchmark: 85%+
    oee_rating ENUM('poor', 'fair', 'good', 'excellent', 'world_class') GENERATED ALWAYS AS (
        CASE
            WHEN oee_percentage >= 85 THEN 'world_class'
            WHEN oee_percentage >= 75 THEN 'excellent'
            WHEN oee_percentage >= 65 THEN 'good'
            WHEN oee_percentage >= 50 THEN 'fair'
            ELSE 'poor'
        END
    ) STORED,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (machine_id) REFERENCES production_machines(id),
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    
    INDEX idx_record_date (record_date),
    INDEX idx_machine (machine_id),
    INDEX idx_oee_rating (oee_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Schema fixes applied successfully' AS status;

-- Show updated structures
SELECT 'QUOTATIONS TABLE:' AS info;
DESCRIBE quotations;

SELECT 'EMPLOYEES TABLE:' AS info;
DESCRIBE employees;

SELECT 'DEPARTMENTS TABLE:' AS info;
DESCRIBE departments;

SELECT 'USERS TABLE:' AS info;
DESCRIBE users;
