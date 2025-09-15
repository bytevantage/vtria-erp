-- Manufacturing/Production Management Schema for VTRIA ERP
-- Extends the production capabilities beyond basic scheduling

-- Work Orders (Detailed production instructions)
CREATE TABLE IF NOT EXISTS work_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id VARCHAR(50) NOT NULL UNIQUE,
    sales_order_id INT NOT NULL,
    sales_order_item_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Assignment
    assigned_to INT, -- technician/engineer
    assigned_date DATE,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    -- Timeline
    estimated_hours DECIMAL(8,2),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Status and progress
    status ENUM('pending', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled') DEFAULT 'pending',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Technical details
    technical_specifications TEXT,
    quality_requirements TEXT,
    safety_notes TEXT,
    
    -- Approval
    approved_by INT,
    approved_at TIMESTAMP NULL,
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (sales_order_item_id) REFERENCES sales_order_items(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_sales_order_id (sales_order_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_priority (priority)
);

-- Production Tasks (Sub-tasks under work orders)
CREATE TABLE IF NOT EXISTS production_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INT DEFAULT 1,
    
    -- Assignment and timing
    assigned_to INT,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    start_date DATE,
    end_date DATE,
    
    -- Status
    status ENUM('pending', 'in_progress', 'completed', 'skipped') DEFAULT 'pending',
    completion_notes TEXT,
    
    -- Dependencies
    depends_on_task_id INT, -- task dependency
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (depends_on_task_id) REFERENCES production_tasks(id) ON DELETE SET NULL,
    
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_sequence (sequence_order)
);

-- Material Usage Tracking
CREATE TABLE IF NOT EXISTS material_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    product_id INT,
    material_name VARCHAR(255) NOT NULL,
    required_quantity DECIMAL(10,2) NOT NULL,
    used_quantity DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    
    -- Status
    status ENUM('required', 'issued', 'consumed', 'returned', 'shortage') DEFAULT 'required',
    issue_date DATE,
    consumed_date DATE,
    
    -- Tracking
    issued_by INT,
    consumed_by INT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (consumed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_product_id (product_id),
    INDEX idx_status (status)
);

-- Production Documentation
CREATE TABLE IF NOT EXISTS production_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    document_type ENUM('drawing', 'specification', 'photo', 'video', 'report', 'certificate', 'other') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    
    -- Metadata
    title VARCHAR(255),
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Status
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_document_type (document_type),
    INDEX idx_uploaded_by (uploaded_by)
);

-- Quality Control Checkpoints
CREATE TABLE IF NOT EXISTS quality_checkpoints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    checkpoint_name VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INT DEFAULT 1,
    
    -- Inspection details
    inspection_criteria TEXT,
    measurement_required BOOLEAN DEFAULT FALSE,
    measurement_unit VARCHAR(50),
    expected_value VARCHAR(100),
    tolerance_range VARCHAR(100),
    
    -- Status
    status ENUM('pending', 'passed', 'failed', 'skipped', 'rework_required') DEFAULT 'pending',
    actual_value VARCHAR(100),
    inspector_notes TEXT,
    
    -- Inspector
    inspected_by INT,
    inspection_date DATE,
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_status (status),
    INDEX idx_sequence (sequence_order)
);

-- Production Time Logs
CREATE TABLE IF NOT EXISTS production_time_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    task_id INT,
    user_id INT NOT NULL,
    
    -- Time tracking
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    total_hours DECIMAL(8,2),
    
    -- Activity details
    activity_description TEXT,
    break_time_minutes INT DEFAULT 0,
    efficiency_rating ENUM('low', 'medium', 'high') DEFAULT 'medium',
    
    -- Status
    is_billable BOOLEAN DEFAULT TRUE,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by INT,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES production_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_user_id (user_id),
    INDEX idx_start_time (start_time)
);

-- Machine/Equipment Usage
CREATE TABLE IF NOT EXISTS equipment_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_code VARCHAR(100),
    
    -- Usage details
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    total_hours DECIMAL(8,2),
    
    -- Operator and status
    operator_id INT,
    status ENUM('in_use', 'idle', 'maintenance', 'breakdown') DEFAULT 'in_use',
    efficiency_percentage DECIMAL(5,2) DEFAULT 100,
    
    -- Maintenance
    maintenance_required BOOLEAN DEFAULT FALSE,
    maintenance_notes TEXT,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_work_order_id (work_order_id),
    INDEX idx_equipment_code (equipment_code),
    INDEX idx_operator_id (operator_id)
);
