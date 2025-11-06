-- Enhanced Manufacturing Cases Schema
-- Add missing tables for comprehensive manufacturing workflow

-- Manufacturing Case Notes Table
CREATE TABLE IF NOT EXISTS manufacturing_case_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    note_type ENUM('general', 'technical', 'quality', 'approval', 'rejection', 'progress') DEFAULT 'general',
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_case_notes (case_id),
    INDEX idx_note_type (note_type)
);

-- Manufacturing Case Documents Table
CREATE TABLE IF NOT EXISTS manufacturing_case_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    document_type ENUM('drawing', 'specification', 'certificate', 'photo', 'report', 'other') DEFAULT 'other',
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by INT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_case_documents (case_id),
    INDEX idx_document_type (document_type)
);

-- Enhanced Products Table for Serial Number and Warranty Tracking
-- Check if columns exist before adding them
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='products' AND COLUMN_NAME='serial_number' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE products ADD COLUMN serial_number VARCHAR(100) UNIQUE',
    'SELECT "Column serial_number already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='products' AND COLUMN_NAME='warranty_start_date' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE products ADD COLUMN warranty_start_date DATE',
    'SELECT "Column warranty_start_date already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='products' AND COLUMN_NAME='warranty_end_date' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE products ADD COLUMN warranty_end_date DATE',
    'SELECT "Column warranty_end_date already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='products' AND COLUMN_NAME='cost_basis' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE products ADD COLUMN cost_basis DECIMAL(15,2)',
    'SELECT "Column cost_basis already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='products' AND COLUMN_NAME='location' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE products ADD COLUMN location VARCHAR(255)',
    'SELECT "Column location already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='products' AND COLUMN_NAME='condition_status' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE products ADD COLUMN condition_status ENUM(\'new\', \'refurbished\', \'used\', \'damaged\') DEFAULT \'new\'',
    'SELECT "Column condition_status already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Work Order Materials Allocation Table
CREATE TABLE IF NOT EXISTS work_order_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    bom_item_id INT,
    product_id INT,
    quantity_required DECIMAL(10,3) NOT NULL,
    quantity_allocated DECIMAL(10,3) DEFAULT 0,
    quantity_consumed DECIMAL(10,3) DEFAULT 0,
    serial_numbers JSON, -- Array of allocated serial numbers
    allocated_by INT,
    allocated_at TIMESTAMP NULL,
    cost_per_unit DECIMAL(15,2),
    total_cost DECIMAL(15,2),
    status ENUM('pending', 'allocated', 'consumed', 'returned') DEFAULT 'pending',
    
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (bom_item_id) REFERENCES bom_items(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (allocated_by) REFERENCES users(id),
    INDEX idx_work_order (work_order_id),
    INDEX idx_status (status)
);

-- Quality Control Checkpoints Table
CREATE TABLE IF NOT EXISTS quality_checkpoints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_case_id INT NOT NULL,
    work_order_id INT,
    checkpoint_name VARCHAR(255) NOT NULL,
    checkpoint_type ENUM('incoming', 'in_process', 'final', 'customer_approval') NOT NULL,
    sequence_number INT DEFAULT 1,
    description TEXT,
    criteria TEXT,
    measurement_type ENUM('visual', 'dimensional', 'functional', 'electrical', 'other') DEFAULT 'visual',
    required_tools VARCHAR(500),
    standard_value VARCHAR(100),
    tolerance_plus DECIMAL(10,6),
    tolerance_minus DECIMAL(10,6),
    unit VARCHAR(20),
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_case_checkpoints (manufacturing_case_id),
    INDEX idx_checkpoint_type (checkpoint_type)
);

-- Quality Inspection Results Table
CREATE TABLE IF NOT EXISTS quality_inspection_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checkpoint_id INT NOT NULL,
    work_order_id INT NOT NULL,
    inspector_id INT NOT NULL,
    inspection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    measured_value VARCHAR(100),
    result ENUM('pass', 'fail', 'conditional') NOT NULL,
    deviation DECIMAL(10,6),
    notes TEXT,
    corrective_action TEXT,
    photos JSON, -- Array of photo file paths
    approved_by INT,
    approved_at TIMESTAMP NULL,
    
    FOREIGN KEY (checkpoint_id) REFERENCES quality_checkpoints(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (inspector_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_checkpoint_results (checkpoint_id),
    INDEX idx_work_order_results (work_order_id),
    INDEX idx_result (result)
);

-- Manufacturing Case Progress Milestones Table
CREATE TABLE IF NOT EXISTS manufacturing_case_milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_case_id INT NOT NULL,
    milestone_name VARCHAR(255) NOT NULL,
    description TEXT,
    planned_date DATE,
    actual_date DATE,
    weight_percentage DECIMAL(5,2) DEFAULT 0, -- Contribution to overall progress
    status ENUM('pending', 'in_progress', 'completed', 'delayed', 'blocked') DEFAULT 'pending',
    dependencies JSON, -- Array of milestone IDs this depends on
    responsible_person INT,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (responsible_person) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_case_milestones (manufacturing_case_id),
    INDEX idx_status (status)
);

-- Manufacturing Resource Requirements Table
CREATE TABLE IF NOT EXISTS manufacturing_resource_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_case_id INT NOT NULL,
    work_order_id INT,
    resource_type ENUM('machine', 'tool', 'skill', 'space') NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    quantity_required DECIMAL(10,2) NOT NULL,
    duration_hours DECIMAL(8,2),
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    availability_required_from DATETIME,
    availability_required_to DATETIME,
    allocated_resource_id INT,
    allocation_status ENUM('pending', 'allocated', 'in_use', 'completed', 'unavailable') DEFAULT 'pending',
    allocated_by INT,
    allocated_at TIMESTAMP NULL,
    
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_by) REFERENCES users(id),
    INDEX idx_case_resources (manufacturing_case_id),
    INDEX idx_resource_type (resource_type),
    INDEX idx_allocation_status (allocation_status)
);

-- Manufacturing Skills Requirements Table
CREATE TABLE IF NOT EXISTS manufacturing_skills_required (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_case_id INT NOT NULL,
    work_order_id INT,
    skill_name VARCHAR(255) NOT NULL,
    skill_level ENUM('basic', 'intermediate', 'advanced', 'expert') NOT NULL,
    certification_required VARCHAR(255),
    estimated_hours DECIMAL(8,2),
    assigned_user_id INT,
    assignment_status ENUM('pending', 'assigned', 'in_progress', 'completed') DEFAULT 'pending',
    
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id),
    INDEX idx_case_skills (manufacturing_case_id),
    INDEX idx_skill_level (skill_level)
);

-- Cost Tracking and Variance Analysis Table
CREATE TABLE IF NOT EXISTS manufacturing_cost_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_case_id INT NOT NULL,
    work_order_id INT,
    cost_category ENUM('material', 'labor', 'overhead', 'tooling', 'quality', 'rework') NOT NULL,
    budgeted_cost DECIMAL(15,2) DEFAULT 0,
    actual_cost DECIMAL(15,2) DEFAULT 0,
    variance_amount DECIMAL(15,2) AS (actual_cost - budgeted_cost) STORED,
    variance_percentage DECIMAL(5,2) AS (
        CASE 
            WHEN budgeted_cost > 0 THEN ((actual_cost - budgeted_cost) / budgeted_cost) * 100
            ELSE 0 
        END
    ) STORED,
    cost_date DATE NOT NULL,
    description TEXT,
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    INDEX idx_case_costs (manufacturing_case_id),
    INDEX idx_cost_category (cost_category),
    INDEX idx_cost_date (cost_date)
);

-- Manufacturing Equipment/Machine Scheduling Table
CREATE TABLE IF NOT EXISTS manufacturing_equipment_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_name VARCHAR(255) NOT NULL,
    manufacturing_case_id INT NOT NULL,
    work_order_id INT,
    scheduled_start DATETIME NOT NULL,
    scheduled_end DATETIME NOT NULL,
    actual_start DATETIME,
    actual_end DATETIME,
    operator_id INT,
    setup_time_minutes INT DEFAULT 0,
    runtime_minutes INT DEFAULT 0,
    breakdown_time_minutes INT DEFAULT 0,
    status ENUM('scheduled', 'setup', 'running', 'completed', 'breakdown', 'maintenance') DEFAULT 'scheduled',
    efficiency_percentage DECIMAL(5,2),
    notes TEXT,
    
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES users(id),
    INDEX idx_equipment (equipment_name),
    INDEX idx_schedule_time (scheduled_start, scheduled_end),
    INDEX idx_status (status)
);

-- Customer Communication Log Table
CREATE TABLE IF NOT EXISTS manufacturing_customer_communications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_case_id INT NOT NULL,
    communication_type ENUM('email', 'phone', 'meeting', 'update', 'approval_request') NOT NULL,
    subject VARCHAR(255),
    message TEXT,
    sent_by INT NOT NULL,
    sent_to VARCHAR(500), -- Email addresses or contact info
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_received BOOLEAN DEFAULT FALSE,
    response_date TIMESTAMP NULL,
    response_content TEXT,
    status ENUM('sent', 'delivered', 'read', 'responded', 'failed') DEFAULT 'sent',
    
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by) REFERENCES users(id),
    INDEX idx_case_communications (manufacturing_case_id),
    INDEX idx_communication_type (communication_type)
);

-- Add indexes for better performance
CREATE INDEX idx_manufacturing_cases_status ON manufacturing_cases(status);
CREATE INDEX idx_manufacturing_cases_priority ON manufacturing_cases(priority);
CREATE INDEX idx_manufacturing_cases_dates ON manufacturing_cases(planned_start_date, planned_end_date);

-- Update existing manufacturing_cases table with new fields
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='manufacturing_cases' AND COLUMN_NAME='assigned_to' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE manufacturing_cases ADD COLUMN assigned_to INT',
    'SELECT "Column assigned_to already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='manufacturing_cases' AND COLUMN_NAME='deleted_at' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE manufacturing_cases ADD COLUMN deleted_at TIMESTAMP NULL',
    'SELECT "Column deleted_at already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Link manufacturing_cases to bill_of_materials
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_NAME='bill_of_materials' AND COLUMN_NAME='manufacturing_case_id' AND TABLE_SCHEMA='vtria_erp') = 0,
    'ALTER TABLE bill_of_materials ADD COLUMN manufacturing_case_id INT',
    'SELECT "Column manufacturing_case_id already exists"'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create upload directory structure
-- This would be handled by the application, but documenting the structure:
-- /uploads/manufacturing-documents/
-- /uploads/quality-photos/
-- /uploads/progress-photos/