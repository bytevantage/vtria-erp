const mysql = require('mysql2/promise');

async function setupCompanyConfig() {
    try {
        // Create connection to MySQL
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'vtria_user',
            password: 'dev_password',
            database: 'vtria_erp'
        });

        console.log('Connected to database');

        // Create company_config table
        await connection.execute(`
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
            )
        `);
        console.log('✅ Created company_config table');

        // Create company_locations table
        await connection.execute(`
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
            )
        `);
        console.log('✅ Created company_locations table');

        // Create tax_config table
        await connection.execute(`
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
            )
        `);
        console.log('✅ Created tax_config table');

        // Insert default company config
        await connection.execute(`
            INSERT IGNORE INTO company_config (company_name, address, city, state) 
            VALUES ('VTRIA Engineering Solutions Pvt Ltd', 'Head Office Address, Mangalore', 'Mangalore', 'Karnataka')
        `);
        console.log('✅ Inserted default company config');

        // Insert default locations
        await connection.execute(`
            INSERT IGNORE INTO company_locations (name, city, state, address) VALUES
            ('Head Office', 'Mangalore', 'Karnataka', 'Head Office Address, Mangalore'),
            ('Branch Office', 'Bangalore', 'Karnataka', 'Branch Office Address, Bangalore')
        `);
        console.log('✅ Inserted default locations');

        // Insert Karnataka as home state
        await connection.execute(`
            INSERT IGNORE INTO tax_config (state_name, state_code, cgst_rate, sgst_rate, igst_rate, is_home_state) 
            VALUES ('Karnataka', 'KA', 9.00, 9.00, 18.00, true)
        `);
        console.log('✅ Inserted default tax config');

        await connection.end();
        console.log('🎉 Company config setup completed successfully!');

    } catch (error) {
        console.error('❌ Error setting up company config:', error);
        process.exit(1);
    }
}

setupCompanyConfig();