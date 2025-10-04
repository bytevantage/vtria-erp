const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupBomTables() {
    let connection;
    
    try {
        // Database connection configuration
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'vtria_user',
            password: process.env.DB_PASS || 'dev_password',
            database: process.env.DB_NAME || 'vtria_erp',
            multipleStatements: true
        };

        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'create_bom_tables.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('Executing BOM tables creation script...');
        await connection.execute(sql);
        
        console.log('✅ BOM tables created successfully!');
        
        // Verify tables were created
        const [tables] = await connection.execute("SHOW TABLES LIKE '%bom%'");
        console.log('📋 BOM tables in database:', tables.map(row => Object.values(row)[0]));
        
        // Check BOM components count
        const [count] = await connection.execute("SELECT COUNT(*) as count FROM bom_components");
        console.log(`📦 Sample BOM components inserted: ${count[0].count}`);
        
    } catch (error) {
        console.error('❌ Error setting up BOM tables:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

// Run the setup
setupBomTables()
    .then(() => {
        console.log('🎉 BOM tables setup completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    });