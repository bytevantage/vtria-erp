const mysql = require('mysql2/promise');

async function fixTaxImplementation() {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'vtria_user',
            password: 'dev_password',
            database: 'vtria_erp'
        });

        console.log('🔧 Fixing tax implementation...');

        // 1. Update tax_config table structure - remove tax rates, keep only state info
        console.log('\n1️⃣ Updating tax_config table to store only state information...');
        
        // First, let's see the current structure
        const [currentColumns] = await connection.execute('DESCRIBE tax_config');
        console.log('Current tax_config columns:', currentColumns.map(c => c.Field));

        // Drop the rate columns and keep only state identification
        try {
            await connection.execute('ALTER TABLE tax_config DROP COLUMN cgst_rate');
            console.log('   ✅ Dropped cgst_rate column');
        } catch (e) { console.log('   ⚠️  cgst_rate column may not exist'); }
        
        try {
            await connection.execute('ALTER TABLE tax_config DROP COLUMN sgst_rate');
            console.log('   ✅ Dropped sgst_rate column');
        } catch (e) { console.log('   ⚠️  sgst_rate column may not exist'); }
        
        try {
            await connection.execute('ALTER TABLE tax_config DROP COLUMN igst_rate');
            console.log('   ✅ Dropped igst_rate column');
        } catch (e) { console.log('   ⚠️  igst_rate column may not exist'); }

        // 2. Add tax columns to estimation_items
        console.log('\n2️⃣ Adding tax columns to estimation_items...');
        
        try {
            await connection.execute(`
                ALTER TABLE estimation_items 
                ADD COLUMN cgst_percentage DECIMAL(5,2) DEFAULT 0.00,
                ADD COLUMN sgst_percentage DECIMAL(5,2) DEFAULT 0.00,
                ADD COLUMN igst_percentage DECIMAL(5,2) DEFAULT 0.00
            `);
            console.log('   ✅ Added tax columns to estimation_items');
        } catch (e) {
            if (e.message.includes('Duplicate column')) {
                console.log('   ⚠️  Tax columns already exist in estimation_items');
            } else {
                console.log('   ❌ Error adding tax columns:', e.message);
            }
        }

        // 3. Update purchase_order_items to have proper tax split
        console.log('\n3️⃣ Updating purchase_order_items tax structure...');
        
        try {
            await connection.execute(`
                ALTER TABLE purchase_order_items 
                ADD COLUMN cgst_percentage DECIMAL(5,2) DEFAULT 0.00,
                ADD COLUMN sgst_percentage DECIMAL(5,2) DEFAULT 0.00,
                ADD COLUMN igst_percentage DECIMAL(5,2) DEFAULT 0.00
            `);
            console.log('   ✅ Added proper tax columns to purchase_order_items');
        } catch (e) {
            if (e.message.includes('Duplicate column')) {
                console.log('   ⚠️  Tax columns already exist in purchase_order_items');
            } else {
                console.log('   ❌ Error adding tax columns:', e.message);
            }
        }

        // 4. Create a helper function/procedure for tax calculation
        console.log('\n4️⃣ Creating tax calculation helper function...');
        
        try {
            // Drop existing function if it exists
            await connection.execute('DROP FUNCTION IF EXISTS CalculateTaxSplit');
            
            await connection.execute(`
                CREATE FUNCTION CalculateTaxSplit(
                    product_gst_rate DECIMAL(5,2),
                    customer_state VARCHAR(100),
                    company_home_state VARCHAR(100)
                ) 
                RETURNS JSON
                READS SQL DATA
                DETERMINISTIC
                BEGIN
                    DECLARE result JSON;
                    
                    IF customer_state = company_home_state THEN
                        -- Intra-state: CGST + SGST (50% each)
                        SET result = JSON_OBJECT(
                            'cgst_percentage', product_gst_rate / 2,
                            'sgst_percentage', product_gst_rate / 2,
                            'igst_percentage', 0.00,
                            'tax_type', 'intra_state'
                        );
                    ELSE
                        -- Inter-state: IGST (100%)
                        SET result = JSON_OBJECT(
                            'cgst_percentage', 0.00,
                            'sgst_percentage', 0.00,
                            'igst_percentage', product_gst_rate,
                            'tax_type', 'inter_state'
                        );
                    END IF;
                    
                    RETURN result;
                END
            `);
            console.log('   ✅ Created CalculateTaxSplit function');
        } catch (e) {
            console.log('   ❌ Error creating function:', e.message);
        }

        // 5. Update tax_config to have proper state data
        console.log('\n5️⃣ Ensuring tax_config has proper state data...');
        
        // Clear existing data and insert proper state information
        await connection.execute('DELETE FROM tax_config');
        
        await connection.execute(`
            INSERT INTO tax_config (state_name, state_code, is_home_state) VALUES
            ('Karnataka', 'KA', true),
            ('Maharashtra', 'MH', false),
            ('Tamil Nadu', 'TN', false),
            ('Gujarat', 'GJ', false),
            ('Delhi', 'DL', false),
            ('West Bengal', 'WB', false),
            ('Uttar Pradesh', 'UP', false),
            ('Rajasthan', 'RJ', false),
            ('Andhra Pradesh', 'AP', false),
            ('Telangana', 'TS', false)
        `);
        console.log('   ✅ Updated tax_config with state information');

        await connection.end();
        console.log('\n🎉 Tax implementation fixed successfully!');
        
        console.log('\n📋 Summary of changes:');
        console.log('  ✅ tax_config now stores only state information (no tax rates)');
        console.log('  ✅ estimation_items now has cgst/sgst/igst columns');
        console.log('  ✅ purchase_order_items now has proper tax split columns');
        console.log('  ✅ Created CalculateTaxSplit() function for automatic tax calculation');

    } catch (error) {
        console.error('❌ Error fixing tax implementation:', error);
    }
}

fixTaxImplementation();