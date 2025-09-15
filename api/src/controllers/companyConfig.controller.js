const db = require('../config/database');

class CompanyConfigController {
    // Get company configuration
    async getCompanyConfig(req, res) {
        try {
            const [config] = await db.execute(
                'SELECT * FROM company_config LIMIT 1'
            );
            
            if (config.length === 0) {
                // Create default config if none exists
                await db.execute(`
                    INSERT INTO company_config 
                    (company_name, address, city, state, download_folder_path) 
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    'VTRIA Engineering Solutions Pvt Ltd',
                    'Head Office Address, Mangalore',
                    'Mangalore',
                    'Karnataka',
                    '/downloads'
                ]);
                
                const [newConfig] = await db.execute(
                    'SELECT * FROM company_config LIMIT 1'
                );
                
                return res.json({
                    success: true,
                    data: newConfig[0]
                });
            }
            
            res.json({
                success: true,
                data: config[0]
            });
        } catch (error) {
            console.error('Error fetching company config:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching company configuration',
                error: error.message
            });
        }
    }

    // Update company configuration
    async updateCompanyConfig(req, res) {
        try {
            const {
                company_name,
                motto,
                logo_url,
                address,
                city,
                state,
                pincode,
                phone,
                email,
                gstin,
                download_folder_path
            } = req.body;
            
            const updateQuery = `
                UPDATE company_config SET 
                company_name = COALESCE(?, company_name),
                motto = COALESCE(?, motto),
                logo_url = COALESCE(?, logo_url),
                address = COALESCE(?, address),
                city = COALESCE(?, city),
                state = COALESCE(?, state),
                pincode = COALESCE(?, pincode),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email),
                gstin = COALESCE(?, gstin),
                download_folder_path = COALESCE(?, download_folder_path),
                updated_at = CURRENT_TIMESTAMP
                WHERE id = (SELECT id FROM (SELECT id FROM company_config LIMIT 1) as temp)
            `;
            
            await db.execute(updateQuery, [
                company_name || null,
                motto || null,
                logo_url || null,
                address || null,
                city || null,
                state || null,
                pincode || null,
                phone || null,
                email || null,
                gstin || null,
                download_folder_path || null
            ]);
            
            res.json({
                success: true,
                message: 'Company configuration updated successfully'
            });
        } catch (error) {
            console.error('Error updating company config:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating company configuration',
                error: error.message
            });
        }
    }

    // Get locations
    async getLocations(req, res) {
        try {
            const [locations] = await db.execute(
                'SELECT * FROM locations WHERE status = "active" ORDER BY name'
            );
            
            res.json({
                success: true,
                data: locations,
                count: locations.length
            });
        } catch (error) {
            console.error('Error fetching locations:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching locations',
                error: error.message
            });
        }
    }

    // Add location
    async addLocation(req, res) {
        try {
            const {
                name,
                city,
                state,
                address,
                contact_person,
                contact_number
            } = req.body;
            
            const [result] = await db.execute(`
                INSERT INTO locations 
                (name, city, state, address, contact_person, contact_number) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [name, city, state, address, contact_person, contact_number]);
            
            res.json({
                success: true,
                message: 'Location added successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('Error adding location:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding location',
                error: error.message
            });
        }
    }

    // Get tax configuration
    async getTaxConfig(req, res) {
        try {
            const [taxConfig] = await db.execute(
                'SELECT * FROM tax_config ORDER BY state_name'
            );
            
            res.json({
                success: true,
                data: taxConfig,
                count: taxConfig.length
            });
        } catch (error) {
            console.error('Error fetching tax config:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching tax configuration',
                error: error.message
            });
        }
    }

    // Update tax rates
    async updateTaxConfig(req, res) {
        try {
            const { id } = req.params;
            const { cgst_rate, sgst_rate, igst_rate } = req.body;
            
            await db.execute(`
                UPDATE tax_config SET 
                cgst_rate = ?, sgst_rate = ?, igst_rate = ?, 
                updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [cgst_rate, sgst_rate, igst_rate, id]);
            
            res.json({
                success: true,
                message: 'Tax configuration updated successfully'
            });
        } catch (error) {
            console.error('Error updating tax config:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating tax configuration',
                error: error.message
            });
        }
    }
}

module.exports = new CompanyConfigController();
