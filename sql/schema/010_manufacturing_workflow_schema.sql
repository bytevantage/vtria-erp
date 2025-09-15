-- Manufacturing workflow schema for technician management
-- VTRIA Engineering Solutions Pvt Ltd

-- Manufacturing jobs table (enhanced from existing)
CREATE TABLE IF NOT EXISTS manufacturing_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_number VARCHAR(50) UNIQUE NOT NULL,
    sales_order_id INT,
    job_title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_technician_id INT,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('pending', 'in_progress', 'completed', 'on_hold', 'cancelled') DEFAULT 'pending',
    estimated_hours DECIMAL(8,2) DEFAULT 0.00,
    actual_hours DECIMAL(8,2) DEFAULT 0.00,
    start_date DATE,
    due_date DATE,
    completed_date DATE NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (assigned_technician_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_technician_status (assigned_technician_id, status),
    INDEX idx_priority_date (priority, due_date)
);

-- Manufacturing job tasks table
CREATE TABLE IF NOT EXISTS manufacturing_job_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    task_name VARCHAR(200) NOT NULL,
    description TEXT,
    sequence_order INT DEFAULT 1,
    estimated_hours DECIMAL(8,2) DEFAULT 0.00,
    actual_hours DECIMAL(8,2) DEFAULT 0.00,
    status ENUM('pending', 'in_progress', 'completed', 'on_hold', 'cancelled') DEFAULT 'pending',
    assigned_to INT,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    completed_by INT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id),
    INDEX idx_job_sequence (job_id, sequence_order),
    INDEX idx_assigned_status (assigned_to, status)
);

-- Manufacturing job materials table
CREATE TABLE IF NOT EXISTS manufacturing_job_materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    product_id INT NOT NULL,
    required_quantity DECIMAL(10,2) NOT NULL,
    allocated_quantity DECIMAL(10,2) DEFAULT 0.00,
    consumed_quantity DECIMAL(10,2) DEFAULT 0.00,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (consumed_quantity * unit_cost) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_job_product (job_id, product_id)
);

-- Manufacturing work logs table
CREATE TABLE IF NOT EXISTS manufacturing_work_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    task_id INT NULL,
    technician_id INT NOT NULL,
    work_description TEXT NOT NULL,
    hours_worked DECIMAL(8,2) NOT NULL,
    issues_encountered TEXT,
    log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES manufacturing_job_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (technician_id) REFERENCES users(id),
    INDEX idx_job_date (job_id, log_date),
    INDEX idx_technician_date (technician_id, log_date)
);

-- Work log materials used table
CREATE TABLE IF NOT EXISTS work_log_materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    work_log_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity_used DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) DEFAULT 0.00,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity_used * unit_cost) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_log_id) REFERENCES manufacturing_work_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_worklog_product (work_log_id, product_id)
);

-- Work log photos table
CREATE TABLE IF NOT EXISTS work_log_photos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    work_log_id INT NOT NULL,
    photo_path VARCHAR(500) NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (work_log_id) REFERENCES manufacturing_work_logs(id) ON DELETE CASCADE,
    INDEX idx_worklog_photos (work_log_id)
);

-- Manufacturing phases table
CREATE TABLE IF NOT EXISTS manufacturing_phases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phase_name VARCHAR(100) NOT NULL,
    description TEXT,
    sequence_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sequence (sequence_order)
);

-- Insert default manufacturing phases
INSERT INTO manufacturing_phases (phase_name, description, sequence_order) VALUES
('Design Review', 'Review and finalize technical drawings and specifications', 1),
('Material Procurement', 'Source and procure required materials and components', 2),
('Fabrication', 'Manufacturing and assembly of components', 3),
('Quality Control', 'Testing and quality assurance checks', 4),
('Packaging', 'Final packaging and preparation for dispatch', 5),
('Dispatch', 'Shipping and delivery coordination', 6);

-- Job phase assignments table
CREATE TABLE IF NOT EXISTS manufacturing_job_phases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    phase_id INT NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'skipped') DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (phase_id) REFERENCES manufacturing_phases(id),
    UNIQUE KEY unique_job_phase (job_id, phase_id),
    INDEX idx_job_phase_status (job_id, phase_id, status)
);

-- Technician skills table
CREATE TABLE IF NOT EXISTS technician_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    technician_id INT NOT NULL,
    skill_name VARCHAR(100) NOT NULL,
    skill_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
    certified BOOLEAN DEFAULT FALSE,
    certification_date DATE NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (technician_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_technician_skill (technician_id, skill_name),
    INDEX idx_skill_level (skill_name, skill_level)
);

-- Insert default skills for technicians
INSERT INTO technician_skills (technician_id, skill_name, skill_level, certified) VALUES
(1, 'Electrical Wiring', 'advanced', TRUE),
(1, 'PLC Programming', 'intermediate', FALSE),
(1, 'Panel Assembly', 'expert', TRUE),
(1, 'HVAC Installation', 'advanced', TRUE);

-- Manufacturing equipment table
CREATE TABLE IF NOT EXISTS manufacturing_equipment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    equipment_name VARCHAR(100) NOT NULL,
    equipment_code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50),
    location_id INT,
    status ENUM('available', 'in_use', 'maintenance', 'out_of_order') DEFAULT 'available',
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    INDEX idx_status_location (status, location_id)
);

-- Job equipment usage table
CREATE TABLE IF NOT EXISTS manufacturing_job_equipment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    equipment_id INT NOT NULL,
    allocated_from TIMESTAMP NOT NULL,
    allocated_to TIMESTAMP NOT NULL,
    actual_start TIMESTAMP NULL,
    actual_end TIMESTAMP NULL,
    status ENUM('allocated', 'in_use', 'completed', 'cancelled') DEFAULT 'allocated',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES manufacturing_equipment(id),
    INDEX idx_job_equipment (job_id, equipment_id),
    INDEX idx_equipment_schedule (equipment_id, allocated_from, allocated_to)
);

-- Manufacturing quality checks table
CREATE TABLE IF NOT EXISTS manufacturing_quality_checks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    task_id INT NULL,
    check_name VARCHAR(200) NOT NULL,
    check_description TEXT,
    expected_result TEXT,
    actual_result TEXT,
    status ENUM('pending', 'passed', 'failed', 'na') DEFAULT 'pending',
    checked_by INT,
    checked_at TIMESTAMP NULL,
    photos TEXT, -- JSON array of photo paths
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES manufacturing_job_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (checked_by) REFERENCES users(id),
    INDEX idx_job_status (job_id, status)
);

-- Manufacturing issues/problems table
CREATE TABLE IF NOT EXISTS manufacturing_issues (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id INT NOT NULL,
    task_id INT NULL,
    issue_title VARCHAR(200) NOT NULL,
    issue_description TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    reported_by INT NOT NULL,
    assigned_to INT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    FOREIGN KEY (job_id) REFERENCES manufacturing_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES manufacturing_job_tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    INDEX idx_job_status (job_id, status),
    INDEX idx_assigned_status (assigned_to, status)
);

-- Views for reporting and dashboard
CREATE OR REPLACE VIEW technician_workload AS
SELECT 
    u.id as technician_id,
    u.name as technician_name,
    COUNT(CASE WHEN mj.status IN ('pending', 'in_progress') THEN 1 END) as active_jobs,
    COUNT(CASE WHEN mjt.status IN ('pending', 'in_progress') THEN 1 END) as pending_tasks,
    SUM(CASE WHEN mj.status IN ('pending', 'in_progress') THEN mj.estimated_hours ELSE 0 END) as estimated_hours,
    AVG(CASE WHEN mj.status = 'completed' THEN 
        DATEDIFF(mj.completed_date, mj.start_date) 
    END) as avg_completion_days
FROM users u
LEFT JOIN manufacturing_jobs mj ON u.id = mj.assigned_technician_id
LEFT JOIN manufacturing_job_tasks mjt ON u.id = mjt.assigned_to
WHERE u.role = 'technician' AND u.is_active = 1
GROUP BY u.id, u.name;

CREATE OR REPLACE VIEW job_progress_summary AS
SELECT 
    mj.id as job_id,
    mj.job_number,
    mj.job_title,
    mj.status as job_status,
    mj.priority,
    mj.due_date,
    u.name as technician_name,
    COUNT(mjt.id) as total_tasks,
    SUM(CASE WHEN mjt.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
    ROUND((SUM(CASE WHEN mjt.status = 'completed' THEN 1 ELSE 0 END) / COUNT(mjt.id)) * 100, 2) as progress_percentage,
    SUM(mjt.estimated_hours) as total_estimated_hours,
    SUM(mjt.actual_hours) as total_actual_hours,
    COUNT(CASE WHEN mi.status = 'open' THEN 1 END) as open_issues
FROM manufacturing_jobs mj
LEFT JOIN users u ON mj.assigned_technician_id = u.id
LEFT JOIN manufacturing_job_tasks mjt ON mj.id = mjt.job_id
LEFT JOIN manufacturing_issues mi ON mj.id = mi.job_id
GROUP BY mj.id, mj.job_number, mj.job_title, mj.status, mj.priority, mj.due_date, u.name;

-- Triggers for automatic updates
DELIMITER //

-- Update job actual hours when task hours are updated
CREATE TRIGGER IF NOT EXISTS update_job_hours 
AFTER UPDATE ON manufacturing_job_tasks
FOR EACH ROW
BEGIN
    UPDATE manufacturing_jobs 
    SET actual_hours = (
        SELECT COALESCE(SUM(actual_hours), 0) 
        FROM manufacturing_job_tasks 
        WHERE job_id = NEW.job_id
    )
    WHERE id = NEW.job_id;
END//

-- Update material consumed quantity when work log materials are added
CREATE TRIGGER IF NOT EXISTS update_material_consumption 
AFTER INSERT ON work_log_materials
FOR EACH ROW
BEGIN
    UPDATE manufacturing_job_materials mjm
    SET consumed_quantity = consumed_quantity + NEW.quantity_used
    WHERE mjm.job_id = (
        SELECT mwl.job_id 
        FROM manufacturing_work_logs mwl 
        WHERE mwl.id = NEW.work_log_id
    ) AND mjm.product_id = NEW.product_id;
END//

DELIMITER ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_technician_priority ON manufacturing_jobs(assigned_technician_id, priority, status);
CREATE INDEX IF NOT EXISTS idx_tasks_job_sequence ON manufacturing_job_tasks(job_id, sequence_order, status);
CREATE INDEX IF NOT EXISTS idx_worklogs_date_technician ON manufacturing_work_logs(log_date, technician_id);
CREATE INDEX IF NOT EXISTS idx_issues_severity_status ON manufacturing_issues(severity, status, reported_at);
