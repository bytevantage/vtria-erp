-- Manufacturing Cases and Work Orders Schema

-- Manufacturing Cases Table
CREATE TABLE IF NOT EXISTS manufacturing_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_case_number VARCHAR(50) UNIQUE NOT NULL,
    case_id INT NOT NULL,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    manufacturing_unit_id INT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('draft', 'planned', 'in_progress', 'completed', 'cancelled', 'on_hold') DEFAULT 'draft',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    estimated_cost DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    notes TEXT,
    created_by INT NOT NULL,
    approved_by INT,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_case_id (case_id),
    INDEX idx_status (status),
    INDEX idx_manufacturing_unit (manufacturing_unit_id),
    INDEX idx_created_at (created_at)
);

-- Manufacturing Work Orders Table
CREATE TABLE IF NOT EXISTS manufacturing_work_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_number VARCHAR(50) UNIQUE NOT NULL,
    manufacturing_case_id INT NOT NULL,
    case_id INT NOT NULL,
    product_id INT,
    section_name VARCHAR(255),
    subsection_name VARCHAR(255),
    title VARCHAR(255),
    description TEXT,
    quantity_required INT NOT NULL DEFAULT 1,
    quantity_completed INT DEFAULT 0,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    estimated_cost DECIMAL(15,2),
    actual_cost DECIMAL(15,2),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    assigned_to INT,
    manufacturing_unit_id INT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('planned', 'in_progress', 'completed', 'cancelled', 'on_hold') DEFAULT 'planned',
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    quality_status ENUM('pending', 'passed', 'failed', 'rework_required') DEFAULT 'pending',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (manufacturing_unit_id) REFERENCES manufacturing_units(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_manufacturing_case (manufacturing_case_id),
    INDEX idx_case_id (case_id),
    INDEX idx_status (status),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_product (product_id),
    INDEX idx_created_at (created_at)
);

-- Work Order Operations Table (for detailed operation tracking)
CREATE TABLE IF NOT EXISTS work_order_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    operation_id INT,
    operation_name VARCHAR(255) NOT NULL,
    sequence_number INT NOT NULL,
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    setup_time_hours DECIMAL(8,2),
    run_time_hours DECIMAL(8,2),
    assigned_to INT,
    machine_id INT,
    status ENUM('pending', 'in_progress', 'completed', 'skipped') DEFAULT 'pending',
    quality_check_required BOOLEAN DEFAULT FALSE,
    quality_status ENUM('pending', 'passed', 'failed') DEFAULT 'pending',
    notes TEXT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (operation_id) REFERENCES production_operations(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_work_order (work_order_id),
    INDEX idx_sequence (work_order_id, sequence_number),
    INDEX idx_status (status),
    INDEX idx_assigned_to (assigned_to)
);

-- Work Order Materials Table (for material consumption tracking)
CREATE TABLE IF NOT EXISTS work_order_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    product_id INT NOT NULL,
    required_quantity DECIMAL(12,3) NOT NULL,
    allocated_quantity DECIMAL(12,3) DEFAULT 0,
    consumed_quantity DECIMAL(12,3) DEFAULT 0,
    wastage_quantity DECIMAL(12,3) DEFAULT 0,
    unit_cost DECIMAL(12,2),
    total_cost DECIMAL(15,2),
    issued_from_location_id INT,
    issued_at TIMESTAMP NULL,
    issued_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (work_order_id) REFERENCES manufacturing_work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (issued_from_location_id) REFERENCES locations(id),
    FOREIGN KEY (issued_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_work_order (work_order_id),
    INDEX idx_product (product_id),
    INDEX idx_location (issued_from_location_id)
);

-- Manufacturing Case Status History
CREATE TABLE IF NOT EXISTS manufacturing_case_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    manufacturing_case_id INT NOT NULL,
    status_from ENUM('draft', 'planned', 'in_progress', 'completed', 'cancelled', 'on_hold'),
    status_to ENUM('draft', 'planned', 'in_progress', 'completed', 'cancelled', 'on_hold') NOT NULL,
    changed_by INT NOT NULL,
    change_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (manufacturing_case_id) REFERENCES manufacturing_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_manufacturing_case (manufacturing_case_id),
    INDEX idx_created_at (created_at)
);