<?php
/**
 * Database Check Script
 * Upload this file to your ByteVantage server to check the database contents
 * Access via: http://yourdomain.com/database_check.php
 */

// Database configuration
$host = 'localhost'; // Usually localhost for shared hosting
$username = 'u570718221'; // Your database username
$password = 'YOUR_DB_PASSWORD'; // Replace with your actual database password
$database = 'u570718221_byte_license';

// Security check - you can add a simple password protection
$check_password = $_GET['auth'] ?? '';
if ($check_password !== 'bytevantage2024') {
    die('Access denied. Use ?auth=bytevantage2024');
}

echo "<h1>ByteVantage Database Check</h1>\n";
echo "<p>Checking database: $database</p>\n";

try {
    // Connect to MySQL
    $pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h2 style='color: green;'>✓ Database Connection Successful</h2>\n";
    
    // List all tables
    echo "<h2>Tables in Database</h2>\n";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($tables)) {
        echo "<p style='color: red;'>No tables found in the database!</p>\n";
    } else {
        echo "<ul>\n";
        foreach ($tables as $table) {
            echo "<li>$table</li>\n";
        }
        echo "</ul>\n";
    }
    
    // Check products table
    echo "<h2>Products Table Check</h2>\n";
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM products");
        $count = $stmt->fetchColumn();
        echo "<p><strong>Products count:</strong> $count</p>\n";
        
        if ($count > 0) {
            echo "<h3>Products Data (First 5 records):</h3>\n";
            $stmt = $pdo->query("SELECT * FROM products LIMIT 5");
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (!empty($products)) {
                echo "<table border='1' style='border-collapse: collapse;'>\n";
                // Table header
                echo "<tr>\n";
                foreach (array_keys($products[0]) as $column) {
                    echo "<th style='padding: 8px; background: #f0f0f0;'>$column</th>\n";
                }
                echo "</tr>\n";
                
                // Table data
                foreach ($products as $product) {
                    echo "<tr>\n";
                    foreach ($product as $value) {
                        echo "<td style='padding: 8px;'>" . htmlspecialchars($value) . "</td>\n";
                    }
                    echo "</tr>\n";
                }
                echo "</table>\n";
            }
        }
        
        // Show table structure
        echo "<h3>Products Table Structure:</h3>\n";
        $stmt = $pdo->query("DESCRIBE products");
        $structure = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<table border='1' style='border-collapse: collapse;'>\n";
        echo "<tr><th style='padding: 8px; background: #f0f0f0;'>Field</th><th style='padding: 8px; background: #f0f0f0;'>Type</th><th style='padding: 8px; background: #f0f0f0;'>Null</th><th style='padding: 8px; background: #f0f0f0;'>Key</th><th style='padding: 8px; background: #f0f0f0;'>Default</th><th style='padding: 8px; background: #f0f0f0;'>Extra</th></tr>\n";
        foreach ($structure as $field) {
            echo "<tr>\n";
            echo "<td style='padding: 8px;'>{$field['Field']}</td>\n";
            echo "<td style='padding: 8px;'>{$field['Type']}</td>\n";
            echo "<td style='padding: 8px;'>{$field['Null']}</td>\n";
            echo "<td style='padding: 8px;'>{$field['Key']}</td>\n";
            echo "<td style='padding: 8px;'>{$field['Default']}</td>\n";
            echo "<td style='padding: 8px;'>{$field['Extra']}</td>\n";
            echo "</tr>\n";
        }
        echo "</table>\n";
        
    } catch (PDOException $e) {
        echo "<p style='color: red;'>Products table does not exist or error: " . $e->getMessage() . "</p>\n";
    }
    
    // Check pricing_tiers table
    echo "<h2>Pricing Tiers Table Check</h2>\n";
    $tiers_tables = ['pricing_tiers', 'tiers', 'product_tiers'];
    $tiers_found = false;
    
    foreach ($tiers_tables as $table_name) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table_name");
            $count = $stmt->fetchColumn();
            echo "<p><strong>$table_name count:</strong> $count</p>\n";
            $tiers_found = true;
            
            if ($count > 0) {
                echo "<h3>$table_name Data (First 5 records):</h3>\n";
                $stmt = $pdo->query("SELECT * FROM $table_name LIMIT 5");
                $tiers = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (!empty($tiers)) {
                    echo "<table border='1' style='border-collapse: collapse;'>\n";
                    // Table header
                    echo "<tr>\n";
                    foreach (array_keys($tiers[0]) as $column) {
                        echo "<th style='padding: 8px; background: #f0f0f0;'>$column</th>\n";
                    }
                    echo "</tr>\n";
                    
                    // Table data
                    foreach ($tiers as $tier) {
                        echo "<tr>\n";
                        foreach ($tier as $value) {
                            echo "<td style='padding: 8px;'>" . htmlspecialchars($value) . "</td>\n";
                        }
                        echo "</tr>\n";
                    }
                    echo "</table>\n";
                }
            }
            
            // Show table structure
            echo "<h3>$table_name Table Structure:</h3>\n";
            $stmt = $pdo->query("DESCRIBE $table_name");
            $structure = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "<table border='1' style='border-collapse: collapse;'>\n";
            echo "<tr><th style='padding: 8px; background: #f0f0f0;'>Field</th><th style='padding: 8px; background: #f0f0f0;'>Type</th><th style='padding: 8px; background: #f0f0f0;'>Null</th><th style='padding: 8px; background: #f0f0f0;'>Key</th><th style='padding: 8px; background: #f0f0f0;'>Default</th><th style='padding: 8px; background: #f0f0f0;'>Extra</th></tr>\n";
            foreach ($structure as $field) {
                echo "<tr>\n";
                echo "<td style='padding: 8px;'>{$field['Field']}</td>\n";
                echo "<td style='padding: 8px;'>{$field['Type']}</td>\n";
                echo "<td style='padding: 8px;'>{$field['Null']}</td>\n";
                echo "<td style='padding: 8px;'>{$field['Key']}</td>\n";
                echo "<td style='padding: 8px;'>{$field['Default']}</td>\n";
                echo "<td style='padding: 8px;'>{$field['Extra']}</td>\n";
                echo "</tr>\n";
            }
            echo "</table>\n";
            
            break; // Found the table, no need to check others
            
        } catch (PDOException $e) {
            // Table doesn't exist, try next one
            continue;
        }
    }
    
    if (!$tiers_found) {
        echo "<p style='color: red;'>No pricing tiers tables found (checked: " . implode(', ', $tiers_tables) . ")</p>\n";
    }
    
    // Check for any tables related to licenses or clients
    echo "<h2>License and Client Related Tables</h2>\n";
    $license_tables = ['licenses', 'clients', 'client_licenses', 'license_keys'];
    
    foreach ($license_tables as $table_name) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table_name");
            $count = $stmt->fetchColumn();
            echo "<p><strong>$table_name count:</strong> $count</p>\n";
            
            if ($count > 0) {
                echo "<h3>$table_name Data (First 3 records):</h3>\n";
                $stmt = $pdo->query("SELECT * FROM $table_name LIMIT 3");
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (!empty($records)) {
                    echo "<table border='1' style='border-collapse: collapse;'>\n";
                    // Table header
                    echo "<tr>\n";
                    foreach (array_keys($records[0]) as $column) {
                        echo "<th style='padding: 8px; background: #f0f0f0;'>$column</th>\n";
                    }
                    echo "</tr>\n";
                    
                    // Table data
                    foreach ($records as $record) {
                        echo "<tr>\n";
                        foreach ($record as $value) {
                            echo "<td style='padding: 8px;'>" . htmlspecialchars($value) . "</td>\n";
                        }
                        echo "</tr>\n";
                    }
                    echo "</table>\n";
                }
            }
        } catch (PDOException $e) {
            // Table doesn't exist
            continue;
        }
    }
    
    // Show recent activity from any audit/log tables
    echo "<h2>Recent Activity Check</h2>\n";
    $log_tables = ['audit_logs', 'activity_logs', 'logs'];
    
    foreach ($log_tables as $table_name) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM $table_name");
            $count = $stmt->fetchColumn();
            echo "<p><strong>$table_name count:</strong> $count</p>\n";
            
            if ($count > 0) {
                echo "<h3>Recent $table_name (Last 5 records):</h3>\n";
                $stmt = $pdo->query("SELECT * FROM $table_name ORDER BY id DESC LIMIT 5");
                $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (!empty($logs)) {
                    echo "<table border='1' style='border-collapse: collapse;'>\n";
                    // Table header
                    echo "<tr>\n";
                    foreach (array_keys($logs[0]) as $column) {
                        echo "<th style='padding: 8px; background: #f0f0f0;'>$column</th>\n";
                    }
                    echo "</tr>\n";
                    
                    // Table data
                    foreach ($logs as $log) {
                        echo "<tr>\n";
                        foreach ($log as $value) {
                            echo "<td style='padding: 8px;'>" . htmlspecialchars($value) . "</td>\n";
                        }
                        echo "</tr>\n";
                    }
                    echo "</table>\n";
                }
            }
        } catch (PDOException $e) {
            // Table doesn't exist
            continue;
        }
    }
    
} catch (PDOException $e) {
    echo "<h2 style='color: red;'>✗ Database Connection Failed</h2>\n";
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>\n";
    echo "<p>Please check your database credentials:</p>\n";
    echo "<ul>\n";
    echo "<li>Host: $host</li>\n";
    echo "<li>Username: $username</li>\n";
    echo "<li>Database: $database</li>\n";
    echo "<li>Password: [Check if correct]</li>\n";
    echo "</ul>\n";
}

echo "\n<hr>\n";
echo "<p><small>Generated on " . date('Y-m-d H:i:s') . "</small></p>\n";
?>