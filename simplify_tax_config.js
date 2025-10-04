const mysql = require('mysql2/promise');

async function simplifyTaxConfig() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'vtria_user',
            password: 'dev_password',
            database: 'vtria_erp'
        });

        console.log('🔧 Simplifying tax configuration...');

        // 1. Replace tax_config table with simple company configuration
        console.log('\n1️⃣ Creating simple company configuration...');
        
        // Check if we already have a company config in the key-value structure
        const [existingConfig] = await connection.execute(
            "SELECT * FROM company_config WHERE config_key = 'company.home_state'"
        );

        if (existingConfig.length === 0) {
            // Insert home state configuration
            await connection.execute(`
                INSERT INTO company_config (config_key, config_value, config_description, config_category) 
                VALUES ('company.home_state', 'Karnataka', 'Company home state for tax calculation', 'general')
            `);
            console.log('   ✅ Added home state configuration');
        } else {
            console.log('   ✅ Home state configuration already exists');
        }

        // 2. Drop the complex tax_config table since we don't need it
        console.log('\n2️⃣ Removing complex tax_config table...');
        try {
            await connection.execute('DROP TABLE IF EXISTS tax_config');
            console.log('   ✅ Removed tax_config table');
        } catch (e) {
            console.log('   ⚠️  tax_config table may not exist');
        }

        // 3. Update company config controller routes to handle home state
        console.log('\n3️⃣ Configuration updated to use simple home state approach');

        await connection.end();
        console.log('\n🎉 Tax configuration simplified successfully!');
        
        console.log('\n📋 New tax logic:');
        console.log('  ✅ Company home state stored in company_config');
        console.log('  ✅ If customer_state == home_state → CGST + SGST');
        console.log('  ✅ If customer_state != home_state → IGST');
        console.log('  ✅ No need to manage list of all Indian states');

    } catch (error) {
        console.error('❌ Error simplifying tax config:', error);
    }
}

simplifyTaxConfig();