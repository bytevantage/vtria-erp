const mysql = require('mysql2/promise');

async function populateBomComponents() {
    let connection;
    
    try {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'vtria_user',
            password: process.env.DB_PASS || 'dev_password',
            database: process.env.DB_NAME || 'vtria_erp'
        };

        connection = await mysql.createConnection(dbConfig);
        
        console.log('Populating BOM components with sample data...');
        
        // Insert sample BOM components for each BOM header
        await connection.execute(`
            INSERT INTO bom_components 
            (bom_header_id, component_code, component_name, description, quantity, unit, unit_cost, total_cost, selling_price, total_selling_price, component_type, category) 
            VALUES
            -- BOM-CP-001 Components (Control Panel)
            (1, 'PLC001', 'Siemens S7-1200 CPU 1214C', 'Compact PLC with 14 DI/10 DO', 1.0000, 'NOS', 25000.00, 25000.00, 30000.00, 30000.00, 'material', 'Control Systems'),
            (1, 'VFD001', 'ABB ACS580 5.5kW VFD', '5.5kW Variable Frequency Drive', 1.0000, 'NOS', 55000.00, 55000.00, 60000.00, 60000.00, 'material', 'Motor Drives'),
            (1, 'MCB001', 'L&T 32A MCB', '32A C-Curve MCB 415V', 3.0000, 'NOS', 850.00, 2550.00, 1020.00, 3060.00, 'material', 'Power Distribution'),
            (1, 'CABLE001', 'Polycab Control Cable 12C', '12 Core Control Cable 1.5sqmm', 50.0000, 'METER', 45.00, 2250.00, 54.00, 2700.00, 'material', 'Cables & Wiring'),
            (1, 'LABOR-ASM', 'Assembly Labor', 'Control panel assembly work', 8.0000, 'HOURS', 500.00, 4000.00, 750.00, 6000.00, 'labor', 'Labor'),
            
            -- BOM-HVAC-001 Components (HVAC System)
            (2, 'HMI001', 'Schneider HMI 7 inch', '7 inch Color Touch Panel HMI', 1.0000, 'NOS', 28000.00, 28000.00, 33600.00, 33600.00, 'material', 'Human Machine Interface'),
            (2, 'PROX001', 'Omron Proximity Sensor M18', 'M18 Inductive Proximity Sensor DC 3-wire', 2.0000, 'NOS', 1500.00, 3000.00, 1800.00, 3600.00, 'material', 'Sensors & Instrumentation'),
            (2, 'TEMP001', 'Temperature Sensor RTD PT100', 'RTD Temperature Sensor for HVAC', 4.0000, 'NOS', 800.00, 3200.00, 1000.00, 4000.00, 'material', 'Sensors & Instrumentation'),
            (2, 'LABOR-HVAC', 'HVAC Installation Labor', 'HVAC system installation work', 12.0000, 'HOURS', 600.00, 7200.00, 900.00, 10800.00, 'labor', 'Labor'),
            
            -- BOM-FAN-001 Components (Ceiling Fan)
            (3, 'FAN-MOTOR', 'Ceiling Fan Motor', '56 inch ceiling fan motor', 5.0000, 'NOS', 2500.00, 12500.00, 3000.00, 15000.00, 'material', 'Motors'),
            (3, 'FAN-BLADE', 'Fan Blade Set', 'Aerodynamic fan blades', 5.0000, 'SET', 800.00, 4000.00, 1000.00, 5000.00, 'material', 'Accessories'),
            (3, 'CAPACITOR001', 'Fan Capacitor 2.5uF', 'Motor Starting Capacitor', 5.0000, 'NOS', 150.00, 750.00, 200.00, 1000.00, 'material', 'Electrical Components'),
            (3, 'REGULATOR001', 'Fan Speed Regulator', '5 Step Speed Controller', 5.0000, 'NOS', 450.00, 2250.00, 600.00, 3000.00, 'material', 'Control Components'),
            (3, 'LABOR-FAN', 'Fan Assembly Labor', 'Ceiling fan assembly work', 6.0000, 'HOURS', 400.00, 2400.00, 600.00, 3600.00, 'labor', 'Labor')
        `);
        
        console.log('✅ BOM components inserted successfully!');
        
        // Verify the data
        const [count] = await connection.execute('SELECT COUNT(*) as count FROM bom_components');
        console.log(`📦 Total BOM components: ${count[0].count}`);
        
        // Show components by BOM
        const [bomSummary] = await connection.execute(`
            SELECT 
                bh.bom_number,
                bh.description,
                COUNT(bc.id) as components_count,
                SUM(bc.total_cost) as total_components_cost
            FROM bom_headers bh
            LEFT JOIN bom_components bc ON bh.id = bc.bom_header_id
            GROUP BY bh.id, bh.bom_number, bh.description
            ORDER BY bh.id
        `);
        
        console.log('\n📋 BOM Summary:');
        console.table(bomSummary);
        
    } catch (error) {
        console.error('❌ Error populating BOM components:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

populateBomComponents()
    .then(() => {
        console.log('🎉 BOM components population completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Population failed:', error);
        process.exit(1);
    });