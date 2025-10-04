-- Create company_config table
CREATE TABLE IF NOT EXISTS company_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT 'VTRIA Engineering Solutions Pvt Ltd',
    motto TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(100),
    gstin VARCHAR(50),
    pan_number VARCHAR(20),
    cin_number VARCHAR(50),
    website VARCHAR(255),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    bank_ifsc_code VARCHAR(20),
    download_folder_path VARCHAR(500) DEFAULT '/downloads',
    financial_year_start DATE,
    currency VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create company_locations table
CREATE TABLE IF NOT EXISTS company_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    pincode VARCHAR(10),
    email VARCHAR(100),
    gstin VARCHAR(50),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create tax_config table
CREATE TABLE IF NOT EXISTS tax_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_name VARCHAR(100) NOT NULL,
    state_code VARCHAR(10) NOT NULL,
    cgst_rate DECIMAL(5,2) DEFAULT 9.00,
    sgst_rate DECIMAL(5,2) DEFAULT 9.00,
    igst_rate DECIMAL(5,2) DEFAULT 18.00,
    is_home_state BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_state (state_name),
    UNIQUE KEY unique_state_code (state_code)
);

-- Insert default company config
INSERT INTO company_config (company_name, address, city, state) 
VALUES ('VTRIA Engineering Solutions Pvt Ltd', 'Head Office Address, Mangalore', 'Mangalore', 'Karnataka')
ON DUPLICATE KEY UPDATE company_name = company_name;

-- Insert default locations
INSERT INTO company_locations (name, city, state, address) VALUES
('Head Office', 'Mangalore', 'Karnataka', 'Head Office Address, Mangalore'),
('Branch Office', 'Bangalore', 'Karnataka', 'Branch Office Address, Bangalore')
ON DUPLICATE KEY UPDATE name = name;

-- Insert default tax configuration for Indian states
INSERT INTO tax_config (state_name, state_code, cgst_rate, sgst_rate, igst_rate, is_home_state) VALUES
('Karnataka', 'KA', 9.00, 9.00, 18.00, true),
('Maharashtra', 'MH', 9.00, 9.00, 18.00, false),
('Tamil Nadu', 'TN', 9.00, 9.00, 18.00, false),
('Gujarat', 'GJ', 9.00, 9.00, 18.00, false),
('Rajasthan', 'RJ', 9.00, 9.00, 18.00, false),
('West Bengal', 'WB', 9.00, 9.00, 18.00, false),
('Uttar Pradesh', 'UP', 9.00, 9.00, 18.00, false),
('Andhra Pradesh', 'AP', 9.00, 9.00, 18.00, false),
('Bihar', 'BR', 9.00, 9.00, 18.00, false),
('Telangana', 'TS', 9.00, 9.00, 18.00, false),
('Madhya Pradesh', 'MP', 9.00, 9.00, 18.00, false),
('Kerala', 'KL', 9.00, 9.00, 18.00, false),
('Punjab', 'PB', 9.00, 9.00, 18.00, false),
('Haryana', 'HR', 9.00, 9.00, 18.00, false),
('Assam', 'AS', 9.00, 9.00, 18.00, false),
('Jharkhand', 'JH', 9.00, 9.00, 18.00, false),
('Odisha', 'OR', 9.00, 9.00, 18.00, false),
('Himachal Pradesh', 'HP', 9.00, 9.00, 18.00, false),
('Uttarakhand', 'UT', 9.00, 9.00, 18.00, false),
('Chhattisgarh', 'CG', 9.00, 9.00, 18.00, false),
('Goa', 'GA', 9.00, 9.00, 18.00, false),
('Tripura', 'TR', 9.00, 9.00, 18.00, false),
('Manipur', 'MN', 9.00, 9.00, 18.00, false),
('Meghalaya', 'ML', 9.00, 9.00, 18.00, false),
('Mizoram', 'MZ', 9.00, 9.00, 18.00, false),
('Nagaland', 'NL', 9.00, 9.00, 18.00, false),
('Sikkim', 'SK', 9.00, 9.00, 18.00, false),
('Arunachal Pradesh', 'AR', 9.00, 9.00, 18.00, false),
('Delhi', 'DL', 9.00, 9.00, 18.00, false),
('Puducherry', 'PY', 9.00, 9.00, 18.00, false),
('Chandigarh', 'CH', 9.00, 9.00, 18.00, false),
('Andaman and Nicobar Islands', 'AN', 9.00, 9.00, 18.00, false),
('Dadra and Nagar Haveli and Daman and Diu', 'DN', 9.00, 9.00, 18.00, false),
('Lakshadweep', 'LD', 9.00, 9.00, 18.00, false),
('Ladakh', 'LA', 9.00, 9.00, 18.00, false),
('Jammu and Kashmir', 'JK', 9.00, 9.00, 18.00, false)
ON DUPLICATE KEY UPDATE state_name = state_name;