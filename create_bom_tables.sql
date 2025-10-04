-- Create BOM Headers table if it doesn't exist
CREATE TABLE IF NOT EXISTS bom_headers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_number VARCHAR(50) UNIQUE NOT NULL,
    estimation_id INT,
    case_id INT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0',
    status ENUM('draft', 'active', 'obsolete') DEFAULT 'draft',
    total_cost DECIMAL(15,4) DEFAULT 0.0000,
    total_selling_price DECIMAL(15,4) DEFAULT 0.0000,
    created_by INT,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    INDEX idx_bom_estimation (estimation_id),
    INDEX idx_bom_case (case_id),
    INDEX idx_bom_status (status)
);

-- Create BOM Components table
CREATE TABLE IF NOT EXISTS bom_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_header_id INT NOT NULL,
    item_id INT,
    component_code VARCHAR(100),
    component_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
    unit VARCHAR(20) DEFAULT 'NOS',
    unit_cost DECIMAL(15,4) DEFAULT 0.0000,
    total_cost DECIMAL(15,4) DEFAULT 0.0000,
    selling_price DECIMAL(15,4) DEFAULT 0.0000,
    total_selling_price DECIMAL(15,4) DEFAULT 0.0000,
    component_type ENUM('material', 'labor', 'overhead', 'subcontract') DEFAULT 'material',
    category VARCHAR(100),
    brand VARCHAR(100),
    specifications JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_header_id) REFERENCES bom_headers(id) ON DELETE CASCADE,
    INDEX idx_bom_header (bom_header_id),
    INDEX idx_item (item_id),
    INDEX idx_component_type (component_type)
);

-- Create BOM Operations table for manufacturing workflow
CREATE TABLE IF NOT EXISTS bom_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bom_header_id INT NOT NULL,
    operation_sequence INT NOT NULL,
    operation_name VARCHAR(255) NOT NULL,
    description TEXT,
    setup_time DECIMAL(8,2) DEFAULT 0.00, -- in minutes
    run_time DECIMAL(8,2) DEFAULT 0.00,   -- in minutes per unit
    labor_cost_per_hour DECIMAL(10,2) DEFAULT 0.00,
    machine_cost_per_hour DECIMAL(10,2) DEFAULT 0.00,
    department VARCHAR(100),
    work_center VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bom_header_id) REFERENCES bom_headers(id) ON DELETE CASCADE,
    INDEX idx_bom_operations (bom_header_id),
    INDEX idx_operation_sequence (operation_sequence)
);

-- Insert sample BOM headers based on existing production cases
INSERT IGNORE INTO bom_headers (id, bom_number, case_id, title, status, created_by) VALUES
(1, 'BOM-CP-001', 1, 'Control Panel for Rolling Mill', 'active', 1),
(2, 'BOM-HVAC-001', 2, 'HVAC System for Warehouse', 'active', 1),
(3, 'BOM-FAN-001', 3, 'Ceiling Fans for Assembly Hall', 'active', 1);

-- Insert sample BOM components
INSERT IGNORE INTO bom_components (bom_header_id, component_code, component_name, description, quantity, unit, unit_cost, total_cost, selling_price, total_selling_price, component_type, category) VALUES
-- BOM-CP-001 Components
(1, 'PLC001', 'Siemens S7-1200 CPU 1214C', 'Compact PLC with 14 DI/10 DO', 1.0000, 'NOS', 25000.00, 25000.00, 30000.00, 30000.00, 'material', 'Control Systems'),
(1, 'VFD001', 'ABB ACS580 5.5kW VFD', '5.5kW Variable Frequency Drive', 1.0000, 'NOS', 55000.00, 55000.00, 60000.00, 60000.00, 'material', 'Motor Drives'),
(1, 'MCB001', 'L&T 32A MCB', '32A C-Curve MCB 415V', 3.0000, 'NOS', 850.00, 2550.00, 1020.00, 3060.00, 'material', 'Power Distribution'),
(1, 'CABLE001', 'Polycab Control Cable 12C', '12 Core Control Cable 1.5sqmm', 50.0000, 'METER', 45.00, 2250.00, 54.00, 2700.00, 'material', 'Cables & Wiring'),
(1, 'LABOR-ASM', 'Assembly Labor', 'Control panel assembly work', 8.0000, 'HOURS', 500.00, 4000.00, 750.00, 6000.00, 'labor', 'Labor'),

-- BOM-HVAC-001 Components
(2, 'HMI001', 'Schneider HMI 7 inch', '7 inch Color Touch Panel HMI', 1.0000, 'NOS', 28000.00, 28000.00, 33600.00, 33600.00, 'material', 'Human Machine Interface'),
(2, 'PROX001', 'Omron Proximity Sensor M18', 'M18 Inductive Proximity Sensor DC 3-wire', 2.0000, 'NOS', 1500.00, 3000.00, 1800.00, 3600.00, 'material', 'Sensors & Instrumentation'),
(2, 'LABOR-HVAC', 'HVAC Installation Labor', 'HVAC system installation work', 12.0000, 'HOURS', 600.00, 7200.00, 900.00, 10800.00, 'labor', 'Labor'),

-- BOM-FAN-001 Components
(3, 'FAN-MOTOR', 'Ceiling Fan Motor', '56 inch ceiling fan motor', 5.0000, 'NOS', 2500.00, 12500.00, 3000.00, 15000.00, 'material', 'Motors'),
(3, 'FAN-BLADE', 'Fan Blade Set', 'Aerodynamic fan blades', 5.0000, 'SET', 800.00, 4000.00, 1000.00, 5000.00, 'material', 'Accessories'),
(3, 'LABOR-FAN', 'Fan Assembly Labor', 'Ceiling fan assembly work', 6.0000, 'HOURS', 400.00, 2400.00, 600.00, 3600.00, 'labor', 'Labor');

-- Update BOM headers with calculated totals
UPDATE bom_headers bh 
SET total_cost = (
    SELECT COALESCE(SUM(bc.total_cost), 0) 
    FROM bom_components bc 
    WHERE bc.bom_header_id = bh.id
),
total_selling_price = (
    SELECT COALESCE(SUM(bc.total_selling_price), 0) 
    FROM bom_components bc 
    WHERE bc.bom_header_id = bh.id
);