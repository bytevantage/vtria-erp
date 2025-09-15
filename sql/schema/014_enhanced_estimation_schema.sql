-- Enhanced estimation schema with dynamic sections

-- Update estimations table
ALTER TABLE estimations ADD COLUMN IF NOT EXISTS estimation_number VARCHAR(50) UNIQUE;
ALTER TABLE estimations ADD COLUMN IF NOT EXISTS total_discount_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE estimations ADD COLUMN IF NOT EXISTS notes TEXT;

-- Estimation sections (editable headings like Main Panel, Generator, UPS)
CREATE TABLE estimation_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estimation_id INT NOT NULL,
    section_name VARCHAR(255) NOT NULL DEFAULT 'Main Panel',
    section_order INT DEFAULT 1,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (estimation_id) REFERENCES estimations(id) ON DELETE CASCADE
);

-- Estimation subsections (editable headings like Incoming, Outgoing)
CREATE TABLE estimation_subsections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    subsection_name VARCHAR(255) NOT NULL DEFAULT 'General',
    subsection_order INT DEFAULT 1,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES estimation_sections(id) ON DELETE CASCADE
);

-- Enhanced estimation items with stock availability
CREATE TABLE estimation_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subsection_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    mrp DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discounted_price DECIMAL(12,2) NOT NULL,
    final_price DECIMAL(12,2) NOT NULL,
    stock_available INT DEFAULT 0,
    is_stock_available BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subsection_id) REFERENCES estimation_subsections(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Update quotations table to support tax calculations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS client_state VARCHAR(100);
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS is_interstate BOOLEAN DEFAULT FALSE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS cgst_rate DECIMAL(5,2) DEFAULT 9.00;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sgst_rate DECIMAL(5,2) DEFAULT 9.00;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS igst_rate DECIMAL(5,2) DEFAULT 18.00;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_cgst DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_sgst DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_igst DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_tax DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS grand_total DECIMAL(12,2) DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS profit_percentage DECIMAL(5,2) DEFAULT 0;

-- Update quotation items to support enhanced display
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS lead_time_days INT DEFAULT 7;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS section_name VARCHAR(255);
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS item_image_url VARCHAR(255);

-- Add HSN codes to products if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);

-- Insert default section and subsection templates
INSERT INTO estimation_sections (estimation_id, section_name, section_order) VALUES 
(0, 'Main Panel', 1),
(0, 'Generator', 2),
(0, 'UPS', 3),
(0, 'Incoming', 4),
(0, 'Outgoing', 5);

INSERT INTO estimation_subsections (section_id, subsection_name, subsection_order) VALUES 
(0, 'Incoming', 1),
(0, 'Outgoing', 2),
(0, 'Control Components', 3),
(0, 'Protection', 4),
(0, 'Metering', 5);
