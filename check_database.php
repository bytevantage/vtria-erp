<?php
// Database connection parameters
$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'vtria_erp_dev';

echo "<h1>VTRIA ERP Database Setup Check</h1>";

// Check MySQL connection
try {
    $conn = new PDO("mysql:host=$host", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<p>✅ Successfully connected to MySQL server</p>";
    
    // Check if database exists
    $stmt = $conn->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$dbname'");
    $dbExists = $stmt->fetchColumn();
    
    if ($dbExists) {
        echo "<p>✅ Database '$dbname' already exists</p>";
    } else {
        echo "<p>❌ Database '$dbname' does not exist</p>";
        
        // Create database
        echo "<p>Creating database '$dbname'...</p>";
        $conn->exec("CREATE DATABASE `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "<p>✅ Database created successfully</p>";
    }
    
    // Connect to the database
    $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<p>✅ Connected to database '$dbname'</p>";
    
    // Check if tables exist
    $tables = array('users', 'locations', 'roles', 'products', 'stock', 'cases', 'tickets');
    $existingTables = array();
    
    $stmt = $conn->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $existingTables[] = $row[0];
    }
    
    echo "<h2>Database Tables:</h2>";
    echo "<ul>";
    foreach ($tables as $table) {
        if (in_array($table, $existingTables)) {
            echo "<li>✅ Table '$table' exists</li>";
        } else {
            echo "<li>❌ Table '$table' does not exist</li>";
        }
    }
    echo "</ul>";
    
    // Show total number of tables
    $stmt = $conn->query("SHOW TABLES");
    $totalTables = $stmt->rowCount();
    echo "<p>Total tables in database: $totalTables</p>";
    
    echo "<h2>Next Steps:</h2>";
    echo "<ol>";
    echo "<li>If tables are missing, run the database migrations</li>";
    echo "<li>Start the Node.js server: <code>cd C:\\wamp64\\www\\vtria-erp\\server && npm start</code></li>";
    echo "<li>Access the VTRIA ERP application at: <a href='http://localhost:8080/vtria-erp/'>http://localhost:8080/vtria-erp/</a></li>";
    echo "</ol>";
    
    echo "<h2>Default Admin Credentials:</h2>";
    echo "<p>Email: admin@vtria.com<br>Password: VtriaAdmin@2024</p>";
    
} catch(PDOException $e) {
    echo "<p>❌ Connection failed: " . $e->getMessage() . "</p>";
}
?>
