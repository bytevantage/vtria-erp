/**
 * Remote Database Check Script for ByteVantage MySQL Database
 * 
 * This script connects to the remote MySQL database and checks for
 * products and pricing tiers tables.
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: '82.25.125.174',
    user: 'u570718221',
    password: process.env.DB_PASSWORD || 'test', // Set via environment variable
    database: 'u570718221_byte_license',
    port: 3306,
    connectTimeout: 30000,
    acquireTimeout: 30000,
    timeout: 30000
};

async function checkDatabase() {
    console.log('🔍 ByteVantage Database Check Starting...');
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🌐 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log('━'.repeat(60));
    
    let connection;
    
    try {
        // Test connection
        console.log('🔌 Attempting to connect to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connection successful!');
        
        // List all tables
        console.log('\n📋 Tables in Database:');
        console.log('━'.repeat(40));
        
        const [tables] = await connection.execute('SHOW TABLES');
        
        if (tables.length === 0) {
            console.log('❌ No tables found in the database!');
            return;
        }
        
        const tableNames = tables.map(row => Object.values(row)[0]);
        tableNames.forEach((table, index) => {
            console.log(`${index + 1}. ${table}`);
        });
        
        // Check products table
        console.log('\n🛍️ Products Table Analysis:');
        console.log('━'.repeat(40));
        
        try {
            // Count products
            const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM products');
            const productCount = countResult[0].count;
            console.log(`📊 Products count: ${productCount}`);
            
            if (productCount > 0) {
                // Show sample data
                console.log('\n📝 Sample Products Data (First 3 records):');
                const [products] = await connection.execute('SELECT * FROM products LIMIT 3');
                
                if (products.length > 0) {
                    console.table(products);
                } else {
                    console.log('No product data found');
                }
                
                // Show table structure
                console.log('\n🏗️ Products Table Structure:');
                const [structure] = await connection.execute('DESCRIBE products');
                console.table(structure);
            } else {
                console.log('📝 Products table exists but is empty');
                
                // Show table structure anyway
                console.log('\n🏗️ Products Table Structure:');
                const [structure] = await connection.execute('DESCRIBE products');
                console.table(structure);
            }
            
        } catch (error) {
            console.log(`❌ Products table does not exist or error: ${error.message}`);
        }
        
        // Check pricing tiers tables
        console.log('\n💰 Pricing Tiers Table Analysis:');
        console.log('━'.repeat(40));
        
        const tiersTableNames = ['pricing_tiers', 'tiers', 'product_tiers'];
        let tiersFound = false;
        
        for (const tableName of tiersTableNames) {
            try {
                const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
                const tiersCount = countResult[0].count;
                console.log(`📊 ${tableName} count: ${tiersCount}`);
                tiersFound = true;
                
                if (tiersCount > 0) {
                    // Show sample data
                    console.log(`\n📝 Sample ${tableName} Data (First 3 records):`);
                    const [tiers] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 3`);
                    
                    if (tiers.length > 0) {
                        console.table(tiers);
                    } else {
                        console.log('No tiers data found');
                    }
                    
                    // Show table structure
                    console.log(`\n🏗️ ${tableName} Table Structure:`);
                    const [structure] = await connection.execute(`DESCRIBE ${tableName}`);
                    console.table(structure);
                } else {
                    console.log(`📝 ${tableName} table exists but is empty`);
                    
                    // Show table structure anyway
                    console.log(`\n🏗️ ${tableName} Table Structure:`);
                    const [structure] = await connection.execute(`DESCRIBE ${tableName}`);
                    console.table(structure);
                }
                
                break; // Found a tiers table, no need to check others
                
            } catch (error) {
                // Table doesn't exist, try next one
                continue;
            }
        }
        
        if (!tiersFound) {
            console.log(`❌ No pricing tiers tables found (checked: ${tiersTableNames.join(', ')})`);
        }
        
        // Check for license-related tables
        console.log('\n🔐 License and Client Tables Analysis:');
        console.log('━'.repeat(40));
        
        const licenseTableNames = ['licenses', 'clients', 'client_licenses', 'license_keys'];
        
        for (const tableName of licenseTableNames) {
            try {
                const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
                const count = countResult[0].count;
                console.log(`📊 ${tableName} count: ${count}`);
                
                if (count > 0) {
                    console.log(`\n📝 Sample ${tableName} Data (First 2 records):`);
                    const [records] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 2`);
                    
                    if (records.length > 0) {
                        console.table(records);
                    }
                }
                
            } catch (error) {
                // Table doesn't exist
                console.log(`❌ ${tableName} table does not exist`);
            }
        }
        
        // Check for recent activity
        console.log('\n📈 Recent Activity Analysis:');
        console.log('━'.repeat(40));
        
        const logTableNames = ['audit_logs', 'activity_logs', 'logs'];
        
        for (const tableName of logTableNames) {
            try {
                const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
                const count = countResult[0].count;
                console.log(`📊 ${tableName} count: ${count}`);
                
                if (count > 0) {
                    console.log(`\n📝 Recent ${tableName} (Last 3 records):`);
                    const [logs] = await connection.execute(`SELECT * FROM ${tableName} ORDER BY id DESC LIMIT 3`);
                    
                    if (logs.length > 0) {
                        console.table(logs);
                    }
                }
                
            } catch (error) {
                // Table doesn't exist or different structure
                continue;
            }
        }
        
    } catch (error) {
        console.log('\n❌ Database Connection Failed!');
        console.log(`🔴 Error: ${error.message}`);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check if MySQL server is running and accessible');
        console.log('2. Verify database credentials');
        console.log('3. Check firewall settings');
        console.log('4. Ensure remote access is enabled for MySQL');
        console.log('\n📝 Database Configuration Used:');
        console.log(`   Host: ${dbConfig.host}`);
        console.log(`   Port: ${dbConfig.port}`);
        console.log(`   User: ${dbConfig.user}`);
        console.log(`   Database: ${dbConfig.database}`);
        
        // Test if it's a network connectivity issue
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.log('\n🌐 Network Connection Test:');
            console.log('This appears to be a network connectivity issue.');
            console.log('The MySQL server might not be accessible from external connections.');
            console.log('Many shared hosting providers (like Hostinger) restrict direct database connections.');
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
    
    console.log('\n━'.repeat(60));
    console.log('📊 Database check completed');
}

// Main execution
async function main() {
    console.log('ByteVantage Database Check Tool');
    console.log('===============================\n');
    
    // Check if password is provided
    if (!dbConfig.password || dbConfig.password === 'test') {
        console.log('⚠️  Using test password for connection test...');
        console.log('This will likely fail but will help us determine if MySQL is accessible.');
    }
    
    await checkDatabase();
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n⏹️  Process interrupted');
    process.exit(0);
});

// Run the script
main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
});