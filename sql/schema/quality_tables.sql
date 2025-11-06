-- ============================================================================
-- PRODUCTION MODULE ENHANCEMENTS
-- ============================================================================
-- This schema enhances the production module with:
-- - Quality Control Management
-- - Shop Floor Control
-- - Production Analytics
-- - Resource Management
-- - Real-time Monitoring
-- ============================================================================

-- ============================================================================
-- QUALITY CONTROL ENHANCEMENTS
-- ============================================================================

-- Quality Inspection Checkpoints
CREATE TABLE IF NOT EXISTS quality_checkpoints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checkpoint_code VARCHAR(50) UNIQUE NOT NULL,
    checkpoint_name VARCHAR(200) NOT NULL,
    checkpoint_type ENUM('incoming', 'in_process', 'final', 'pre_delivery') DEFAULT 'in_process',
    description TEXT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    sequence_order INT DEFAULT 0,
    applicable_categories JSON COMMENT 'Product categories this applies to',
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_checkpoint_type (checkpoint_type),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quality Defect Types
CREATE TABLE IF NOT EXISTS quality_defect_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    defect_code VARCHAR(50) UNIQUE NOT NULL,
    defect_name VARCHAR(200) NOT NULL,
    category ENUM('critical', 'major', 'minor', 'cosmetic') DEFAULT 'minor',
    description TEXT,
    root_cause_category VARCHAR(100) COMMENT 'Material, Process, Equipment, Human',
    corrective_action_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enhanced Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections_enhanced (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_number VARCHAR(50) UNIQUE NOT NULL,
    work_order_id INT,
    manufacturing_case_id INT,
    product_id INT,
    checkpoint_id INT,
    batch_number VARCHAR(50),
    lot_number VARCHAR(50),
    inspection_type ENUM('incoming', 'in_process', 'final', 'pre_delivery', 'audit') NOT NULL,
    inspection_date DATETIME NOT NULL,
    inspector_id INT NOT NULL,
    
    -- Quantities
    sample_size INT NOT NULL,
    quantity_inspected INT NOT NULL,
    quantity_accepted INT DEFAULT 0,
    quantity_rejected INT DEFAULT 0,
    quantity_rework INT DEFAULT 0,
    
    -- Results
    overall_result ENUM('passed', 'failed', 'conditional', 'pending') DEFAULT 'pending',
    conformance_percentage DECIMAL(5,2) COMMENT 'Percentage of checks passed',
    
    -- Details
    inspection_criteria JSON COMMENT 'Criteria and measurements',
    defects_found JSON COMMENT 'Array of defects with details',
    measurements JSON COMMENT 'Dimensional and other measurements',
    observations TEXT,
    inspector_notes TEXT,
    
    -- Actions
    action_required ENUM('none', 'rework', 'scrap', 'hold', 'return_to_supplier') DEFAULT 'none',
    corrective_action TEXT,
    preventive_action TEXT,
    
    -- Approvals
    approved_by INT,
    approved_at DATETIME,
    status ENUM('draft', 'submitted', 'approved', 'rejected') DEFAULT 'draft',
    
    -- Attachments
    attachments JSON COMMENT 'Photos, documents, test reports',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys removed for tables that don't exist yet
    -- TODO: Add back when manufacturing_work_orders and manufacturing_cases tables are created
    -- FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id),
    -- FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id),
    -- FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (checkpoint_id) REFERENCES quality_checkpoints(id),
    FOREIGN KEY (inspector_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    INDEX idx_inspection_type (inspection_type),
    INDEX idx_inspection_date (inspection_date),
    INDEX idx_overall_result (overall_result),
    INDEX idx_work_order (work_order_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quality Defect Records
CREATE TABLE IF NOT EXISTS quality_defect_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_id INT NOT NULL,
    defect_type_id INT NOT NULL,
    defect_count INT DEFAULT 1,
    severity ENUM('critical', 'major', 'minor', 'cosmetic') NOT NULL,
    location VARCHAR(200) COMMENT 'Where defect was found',
    description TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    responsible_person_id INT,
    resolved_at DATETIME,
    cost_impact DECIMAL(10,2) COMMENT 'Cost of defect',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES quality_inspections_enhanced(id) ON DELETE CASCADE,
    FOREIGN KEY (defect_type_id) REFERENCES quality_defect_types(id),
    FOREIGN KEY (responsible_person_id) REFERENCES users(id),
    INDEX idx_inspection (inspection_id),
    INDEX idx_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
