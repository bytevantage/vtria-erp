const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class DatabaseController {

  // Export database to SQL file (JavaScript-based approach)
  async exportDatabase(req, res) {
    try {
      console.log('Starting database export...');

      // Get all table names
      const [tables] = await db.execute(`
        SELECT TABLE_NAME, ENGINE 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_type = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);

      if (tables.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No tables found to export'
        });
      }

      let sqlContent = `-- VTria ERP Database Backup\n`;
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Database: ${process.env.DB_NAME}\n\n`;
      sqlContent += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

      // Export each table
      for (const table of tables) {
        const tableName = table.TABLE_NAME;
        console.log(`Exporting table: ${tableName}`);

        // Get CREATE TABLE statement
        const [createTable] = await db.execute(`SHOW CREATE TABLE \`${tableName}\``);
        sqlContent += `-- Table structure for ${tableName}\n`;
        sqlContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlContent += `${createTable[0]['Create Table']};\n\n`;

        // Get table data
        const [rows] = await db.execute(`SELECT * FROM \`${tableName}\``);

        if (rows.length > 0) {
          sqlContent += `-- Data for table ${tableName}\n`;
          sqlContent += `LOCK TABLES \`${tableName}\` WRITE;\n`;

          // Generate INSERT statements
          const columns = Object.keys(rows[0]);
          const columnList = columns.map(col => `\`${col}\``).join(',');

          for (let i = 0; i < rows.length; i += 100) { // Batch inserts
            const batch = rows.slice(i, i + 100);
            const values = batch.map(row => {
              const valueList = columns.map(col => {
                const value = row[col];
                if (value === null) return 'NULL';
                if (typeof value === 'string') {
                  return `'${value.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')}'`;
                }
                if (value instanceof Date) {
                  return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                }
                return value;
              }).join(',');
              return `(${valueList})`;
            }).join(',\n');

            sqlContent += `INSERT INTO \`${tableName}\` (${columnList}) VALUES\n${values};\n`;
          }

          sqlContent += `UNLOCK TABLES;\n\n`;
        }
      }

      sqlContent += `SET FOREIGN_KEY_CHECKS=1;\n`;
      sqlContent += `-- End of backup\n`;

      // Set headers for download
      const filename = `vtria_erp_backup_${new Date().toISOString().split('T')[0]}.sql`;
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(sqlContent, 'utf8'));

      console.log(`Export completed. Size: ${Buffer.byteLength(sqlContent, 'utf8')} bytes`);
      res.send(sqlContent);

    } catch (error) {
      console.error('Export database error:', error);
      res.status(500).json({
        success: false,
        message: 'Database export failed',
        error: error.message
      });
    }
  }

  // Import database from SQL file (JavaScript-based approach)
  async importDatabase(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No SQL file provided'
        });
      }

      console.log('Starting database import...');
      const sqlContent = req.file.buffer.toString('utf8');

      if (!sqlContent || sqlContent.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'SQL file is empty or invalid'
        });
      }

      // Split SQL content into statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`Processing ${statements.length} SQL statements...`);

      // Disable foreign key checks
      await db.execute('SET FOREIGN_KEY_CHECKS = 0');

      let executedStatements = 0;
      let errors = [];

      // Execute each statement
      for (const statement of statements) {
        try {
          if (statement.toLowerCase().includes('lock tables') ||
            statement.toLowerCase().includes('unlock tables')) {
            // Skip LOCK/UNLOCK statements - not needed for our approach
            continue;
          }

          await db.execute(statement);
          executedStatements++;

          // Log progress for large imports
          if (executedStatements % 100 === 0) {
            console.log(`Executed ${executedStatements}/${statements.length} statements`);
          }
        } catch (error) {
          console.error(`Error executing statement: ${statement.substring(0, 100)}...`, error.message);
          errors.push(`Statement ${executedStatements + 1}: ${error.message}`);

          // Continue with other statements unless it's a critical error
          if (error.message.includes('syntax error') || error.message.includes('doesn\'t exist')) {
            // For syntax errors or missing tables, we might want to continue
          }
        }
      }

      // Re-enable foreign key checks
      await db.execute('SET FOREIGN_KEY_CHECKS = 1');

      console.log(`Import completed. ${executedStatements} statements executed.`);

      res.json({
        success: true,
        message: `Database imported successfully. ${executedStatements} statements executed.`,
        filename: req.file.originalname,
        executedStatements,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit errors shown
      });

    } catch (error) {
      console.error('Import database error:', error);

      // Re-enable foreign key checks in case of error
      try {
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {
        console.error('Failed to re-enable foreign key checks:', e.message);
      }

      res.status(500).json({
        success: false,
        message: 'Database import failed',
        error: error.message
      });
    }
  }

  // Clear all data from database (keep structure)
  async clearDatabase(req, res) {
    try {
      // Get all table names (excluding views)
      const [tables] = await db.execute(`
        SELECT TABLE_NAME 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_type = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);

      if (tables.length === 0) {
        return res.json({
          success: true,
          message: 'No tables found to clear'
        });
      }

      // Disable foreign key checks
      await db.execute('SET FOREIGN_KEY_CHECKS = 0');

      let clearedTables = [];
      let errors = [];

      // Truncate each table
      for (const table of tables) {
        try {
          await db.execute(`TRUNCATE TABLE \`${table.TABLE_NAME}\``);
          clearedTables.push(table.TABLE_NAME);
        } catch (error) {
          console.error(`Error clearing table ${table.TABLE_NAME}:`, error.message);
          errors.push(`${table.TABLE_NAME}: ${error.message}`);
        }
      }

      // Re-enable foreign key checks
      await db.execute('SET FOREIGN_KEY_CHECKS = 1');

      res.json({
        success: true,
        message: `Database cleared successfully. ${clearedTables.length} tables cleared.`,
        clearedTables: clearedTables,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('Clear database error:', error);
      res.status(500).json({
        success: false,
        message: 'Database clear failed',
        error: error.message
      });
    }
  }

  // Get database info
  async getDatabaseInfo(req, res) {
    try {
      // Get database size and table info
      const [sizeInfo] = await db.execute(`
                SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS size_mb
                FROM information_schema.tables 
                WHERE table_schema = DATABASE()
            `);

      const [tableInfo] = await db.execute(`
                SELECT 
                    table_name,
                    table_rows,
                    ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() 
                ORDER BY (data_length + index_length) DESC
            `);

      res.json({
        success: true,
        data: {
          total_size_mb: sizeInfo[0].size_mb,
          tables: tableInfo
        }
      });

    } catch (error) {
      console.error('Get database info error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get database info',
        error: error.message
      });
    }
  }

  // Selective import - only import safe reference tables
  async selectiveImport(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No SQL file provided'
        });
      }

      console.log('Starting selective database import...');
      const sqlContent = req.file.buffer.toString('utf8');

      if (!sqlContent || sqlContent.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'SQL file is empty or invalid'
        });
      }

      // Get selected tables from request body
      let selectedTables = new Set();
      if (req.body.selectedTables) {
        try {
          const parsedTables = JSON.parse(req.body.selectedTables);
          selectedTables = new Set(parsedTables);
          console.log(`User selected ${selectedTables.size} tables for import:`, Array.from(selectedTables));
        } catch (parseError) {
          console.error('Failed to parse selected tables:', parseError);
          return res.status(400).json({
            success: false,
            message: 'Invalid selected tables format'
          });
        }
      } else {
        // Fallback to safe tables if no selection provided
        selectedTables = new Set([
          'inventory_main_categories',
          'inventory_sub_categories',
          'inventory_categories',
          'inventory_units',
          'departments',
          'company_config',
          'locations',
          'tax_rates',
          'gst_rates',
          'product_categories',
          'vendors_master',
          'clients',
          'employees',
          'user_roles',
          'permissions'
        ]);
      }

      if (selectedTables.size === 0) {
        return res.status(400).json({
          success: false,
          message: 'No tables selected for import'
        });
      }

      // Parse SQL content to extract table-specific statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`Processing ${statements.length} SQL statements for selective import...`);

      // Disable foreign key checks
      await db.execute('SET FOREIGN_KEY_CHECKS = 0');

      let executedStatements = 0;
      let errors = [];
      let importedTables = new Set();
      let skippedTables = new Set();

      // Process each statement
      for (const statement of statements) {
        try {
          // Skip lock/unlock statements
          if (statement.toLowerCase().includes('lock tables') ||
            statement.toLowerCase().includes('unlock tables')) {
            continue;
          }

          // Extract table name from statement
          let tableName = null;
          const lowerStatement = statement.toLowerCase();

          if (lowerStatement.startsWith('drop table') ||
            lowerStatement.startsWith('create table') ||
            lowerStatement.startsWith('insert into')) {

            // Extract table name using regex
            const matches = statement.match(/(?:drop table if exists|create table|insert into)\s+`?([^`\s]+)`?/i);
            if (matches && matches[1]) {
              tableName = matches[1];
            }
          }

          // Decide whether to execute this statement
          if (tableName) {
            if (selectedTables.has(tableName)) {
              await db.execute(statement);
              executedStatements++;
              importedTables.add(tableName);

              if (executedStatements % 50 === 0) {
                console.log(`Executed ${executedStatements} statements...`);
              }
            } else {
              skippedTables.add(tableName);
              console.log(`Skipped ${lowerStatement.split(' ')[0]} for table: ${tableName} (not selected)`);
            }
          } else {
            // Statement without clear table reference - execute if safe
            if (lowerStatement.startsWith('set ') ||
              lowerStatement.startsWith('use ') ||
              lowerStatement.includes('foreign_key_checks')) {
              await db.execute(statement);
              executedStatements++;
            }
          }

        } catch (error) {
          console.error(`Error executing statement: ${statement.substring(0, 100)}...`, error.message);
          errors.push(`Statement ${executedStatements + 1}: ${error.message}`);
        }
      }

      // Re-enable foreign key checks
      await db.execute('SET FOREIGN_KEY_CHECKS = 1');

      console.log(`Selective import completed. ${executedStatements} statements executed.`);

      res.json({
        success: true,
        message: `Selective import completed successfully. ${executedStatements} statements executed for ${importedTables.size} tables.`,
        filename: req.file.originalname,
        executedStatements,
        importedTables: Array.from(importedTables),
        skippedTables: Array.from(skippedTables),
        selectedTablesCount: selectedTables.size,
        errors: errors.length > 0 ? errors.slice(0, 5) : undefined
      });

    } catch (error) {
      console.error('Selective import error:', error);

      // Re-enable foreign key checks in case of error
      try {
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {
        console.error('Failed to re-enable foreign key checks:', e.message);
      }

      res.status(500).json({
        success: false,
        message: 'Selective import failed',
        error: error.message
      });
    }
  }

  // Analyze SQL file and extract table information
  async analyzeSqlFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No SQL file uploaded'
        });
      }

      // Read the uploaded SQL file
      const sqlContent = await fs.readFile(req.file.path, 'utf8');

      // Define safe tables (reference data)
      const safeTables = [
        'categories', 'departments', 'product_categories', 'units', 'tax_rates',
        'company_config', 'inventory_main_categories', 'inventory_subcategories',
        'employee_departments', 'roles', 'permissions', 'settings', 'configurations',
        'currencies', 'countries', 'states', 'cities', 'suppliers', 'customers',
        'vendors', 'manufacturers', 'brands', 'product_groups', 'warehouses',
        'locations', 'bins', 'zones', 'user_roles', 'system_settings'
      ];

      // Extract tables from SQL content
      const tableMatches = sqlContent.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?([^`\s]+)`?\s*\(/gi);
      const insertMatches = sqlContent.match(/INSERT INTO\s+`?([^`\s]+)`?\s/gi);

      const tablesFound = new Set();

      // Extract from CREATE TABLE statements
      if (tableMatches) {
        tableMatches.forEach(match => {
          const tableMatch = match.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?([^`\s]+)`?\s*\(/i);
          if (tableMatch && tableMatch[1]) {
            tablesFound.add(tableMatch[1]);
          }
        });
      }

      // Extract from INSERT statements
      if (insertMatches) {
        insertMatches.forEach(match => {
          const tableMatch = match.match(/INSERT INTO\s+`?([^`\s]+)`?\s/i);
          if (tableMatch && tableMatch[1]) {
            tablesFound.add(tableMatch[1]);
          }
        });
      }

      // Analyze tables and estimate record counts
      const tableAnalysis = Array.from(tablesFound).map(tableName => {
        const isSafe = safeTables.some(safeTable =>
          tableName.toLowerCase().includes(safeTable.toLowerCase()) ||
          safeTable.toLowerCase().includes(tableName.toLowerCase())
        );

        // Estimate record count from INSERT statements
        const insertRegex = new RegExp(`INSERT INTO\\s+\`?${tableName}\`?[^;]*;`, 'gi');
        const insertStatements = sqlContent.match(insertRegex) || [];
        let recordCount = 0;

        insertStatements.forEach(statement => {
          const valuesMatch = statement.match(/VALUES\s*\((.*?)\)(?:\s*,\s*\((.*?)\))*/gi);
          if (valuesMatch) {
            recordCount += valuesMatch.length;
          }
        });

        return {
          name: tableName,
          isSafe: isSafe,
          recordCount: recordCount,
          category: isSafe ? 'Reference Data' : 'Transactional Data'
        };
      });

      // Clean up uploaded file
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError.message);
      }

      res.json({
        success: true,
        message: `Analyzed ${tableAnalysis.length} tables from SQL file`,
        data: {
          tables: tableAnalysis.sort((a, b) => {
            // Sort by safety (safe first) then by name
            if (a.isSafe !== b.isSafe) {
              return b.isSafe - a.isSafe;
            }
            return a.name.localeCompare(b.name);
          }),
          summary: {
            totalTables: tableAnalysis.length,
            safeTables: tableAnalysis.filter(t => t.isSafe).length,
            riskyTables: tableAnalysis.filter(t => !t.isSafe).length,
            totalRecords: tableAnalysis.reduce((sum, t) => sum + t.recordCount, 0)
          }
        }
      });

    } catch (error) {
      console.error('SQL Analysis Error:', error);

      // Clean up uploaded file on error
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError.message);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to analyze SQL file',
        error: error.message
      });
    }
  }
}

module.exports = new DatabaseController();