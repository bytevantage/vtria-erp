const mysql = require('mysql2/promise');

async function setupTaxConfiguration() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'vtria_user',
        password: 'dev_password',
        database: 'vtria_erp'
    });

    try {
        console.log('Setting up tax configuration...');

        // Create tax_config table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tax_config (
                id INT PRIMARY KEY AUTO_INCREMENT,
                state_name VARCHAR(100) NOT NULL,
                state_code VARCHAR(10) NOT NULL,
                gst_rate DECIMAL(5,2) DEFAULT 18.00,
                cgst_rate DECIMAL(5,2) DEFAULT 9.00,
                sgst_rate DECIMAL(5,2) DEFAULT 9.00,
                igst_rate DECIMAL(5,2) DEFAULT 18.00,
                is_home_state BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_state_code (state_code),
                INDEX idx_state_name (state_name),
                INDEX idx_home_state (is_home_state)
            )
        `);
        console.log('✅ Tax config table created');

        // Check if data already exists
        const [existing] = await connection.execute('SELECT COUNT(*) as count FROM tax_config');
        if (existing[0].count > 0) {
            console.log('✅ Tax config data already exists');
            await connection.end();
            return;
        }

        // Insert Indian states and union territories
        const states = [
            ['Andhra Pradesh', 'AP', 18.00, 9.00, 9.00, 18.00, false],
            ['Arunachal Pradesh', 'AR', 18.00, 9.00, 9.00, 18.00, false],
            ['Assam', 'AS', 18.00, 9.00, 9.00, 18.00, false],
            ['Bihar', 'BR', 18.00, 9.00, 9.00, 18.00, false],
            ['Chhattisgarh', 'CG', 18.00, 9.00, 9.00, 18.00, false],
            ['Goa', 'GA', 18.00, 9.00, 9.00, 18.00, false],
            ['Gujarat', 'GJ', 18.00, 9.00, 9.00, 18.00, false],
            ['Haryana', 'HR', 18.00, 9.00, 9.00, 18.00, false],
            ['Himachal Pradesh', 'HP', 18.00, 9.00, 9.00, 18.00, false],
            ['Jharkhand', 'JH', 18.00, 9.00, 9.00, 18.00, false],
            ['Karnataka', 'KA', 18.00, 9.00, 9.00, 18.00, true], // Home state
            ['Kerala', 'KL', 18.00, 9.00, 9.00, 18.00, false],
            ['Madhya Pradesh', 'MP', 18.00, 9.00, 9.00, 18.00, false],
            ['Maharashtra', 'MH', 18.00, 9.00, 9.00, 18.00, false],
            ['Manipur', 'MN', 18.00, 9.00, 9.00, 18.00, false],
            ['Meghalaya', 'ML', 18.00, 9.00, 9.00, 18.00, false],
            ['Mizoram', 'MZ', 18.00, 9.00, 9.00, 18.00, false],
            ['Nagaland', 'NL', 18.00, 9.00, 9.00, 18.00, false],
            ['Odisha', 'OR', 18.00, 9.00, 9.00, 18.00, false],
            ['Punjab', 'PB', 18.00, 9.00, 9.00, 18.00, false],
            ['Rajasthan', 'RJ', 18.00, 9.00, 9.00, 18.00, false],
            ['Sikkim', 'SK', 18.00, 9.00, 9.00, 18.00, false],
            ['Tamil Nadu', 'TN', 18.00, 9.00, 9.00, 18.00, false],
            ['Telangana', 'TS', 18.00, 9.00, 9.00, 18.00, false],
            ['Tripura', 'TR', 18.00, 9.00, 9.00, 18.00, false],
            ['Uttar Pradesh', 'UP', 18.00, 9.00, 9.00, 18.00, false],
            ['Uttarakhand', 'UK', 18.00, 9.00, 9.00, 18.00, false],
            ['West Bengal', 'WB', 18.00, 9.00, 9.00, 18.00, false],
            // Union Territories
            ['Andaman and Nicobar Islands', 'AN', 18.00, 9.00, 9.00, 18.00, false],
            ['Chandigarh', 'CH', 18.00, 9.00, 9.00, 18.00, false],
            ['Dadra and Nagar Haveli and Daman and Diu', 'DN', 18.00, 9.00, 9.00, 18.00, false],
            ['Delhi', 'DL', 18.00, 9.00, 9.00, 18.00, false],
            ['Jammu and Kashmir', 'JK', 18.00, 9.00, 9.00, 18.00, false],
            ['Ladakh', 'LA', 18.00, 9.00, 9.00, 18.00, false],
            ['Lakshadweep', 'LD', 18.00, 9.00, 9.00, 18.00, false],
            ['Puducherry', 'PY', 18.00, 9.00, 9.00, 18.00, false]
        ];

        // Insert states
        for (const state of states) {
            await connection.execute(`
                INSERT INTO tax_config (state_name, state_code, gst_rate, cgst_rate, sgst_rate, igst_rate, is_home_state) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, state);
        }
        console.log(`✅ Inserted ${states.length} states and union territories`);

        // Add company configuration
        const configs = [
            ['company_home_state', 'Karnataka', 'Company home state for GST calculation', 'general'],
            ['company_state_code', 'KA', 'Company state code for GST calculation', 'general'],
            ['default_gst_rate', '18.00', 'Default GST rate when product GST not specified', 'general'],
            ['gst_calculation_enabled', 'true', 'Enable automatic GST calculation', 'general']
        ];

        for (const config of configs) {
            await connection.execute(`
                INSERT INTO company_config (config_key, config_value, config_description, config_category) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    config_value = VALUES(config_value),
                    updated_at = CURRENT_TIMESTAMP
            `, config);
        }
        console.log('✅ Company configuration updated');

        // Verify setup
        const [taxCount] = await connection.execute('SELECT COUNT(*) as count FROM tax_config');
        const [homeState] = await connection.execute('SELECT state_name FROM tax_config WHERE is_home_state = TRUE');
        const [companyConfig] = await connection.execute('SELECT config_key, config_value FROM company_config WHERE config_key IN ("company_home_state", "default_gst_rate")');

        console.log('\n=== VERIFICATION ===');
        console.log(`Total states configured: ${taxCount[0].count}`);
        console.log(`Home state: ${homeState[0]?.state_name || 'Not set'}`);
        console.log('Company configuration:');
        companyConfig.forEach(config => {
            console.log(`  ${config.config_key}: ${config.config_value}`);
        });

        console.log('\n✅ Tax configuration setup complete!');

    } catch (error) {
        console.error('❌ Error setting up tax configuration:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run the setup
setupTaxConfiguration().catch(console.error);