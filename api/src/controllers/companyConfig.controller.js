const db = require('../config/database');

class CompanyConfigController {
    // Get company configuration
    async getCompanyConfig(req, res) {
        try {
            const [configs] = await db.execute(
                'SELECT config_key, config_value FROM company_config WHERE is_active = 1'
            );

            // Convert key-value pairs to object
            const configData = {};
            configs.forEach(config => {
                configData[config.config_key] = config.config_value;
            });

            // If no configs exist, create default ones
            if (configs.length === 0) {
                const defaultConfigs = [
                    { key: 'company_name', value: 'VTRIA ENGINEERING SOLUTIONS PVT LTD' },
                    { key: 'motto', value: 'Engineering for a Better Tomorrow' },
                    { key: 'address', value: '' },
                    { key: 'city', value: '' },
                    { key: 'state', value: '' },
                    { key: 'pincode', value: '' },
                    { key: 'phone', value: '' },
                    { key: 'email', value: '' },
                    { key: 'website', value: '' },
                    { key: 'gstin', value: '' },
                    { key: 'pan', value: '' },
                    { key: 'cin', value: '' },
                    { key: 'download_folder_path', value: '/downloads' }
                ];

                // Insert default configurations
                for (const config of defaultConfigs) {
                    await db.execute(`
                        INSERT INTO company_config 
                        (config_key, config_value, config_category) 
                        VALUES (?, ?, 'general')
                    `, [config.key, config.value]);

                    configData[config.key] = config.value;
                }
            }

            res.json({
                success: true,
                data: configData
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
            const configData = req.body;

            // Update or insert each configuration key
            for (const [key, value] of Object.entries(configData)) {
                // Skip null, undefined, or empty objects
                if (value === null || value === undefined ||
                    (typeof value === 'object' && Object.keys(value).length === 0)) {
                    continue;
                }

                // Check if config key exists
                const [existing] = await db.execute(
                    'SELECT id FROM company_config WHERE config_key = ? AND is_active = 1',
                    [key]
                );

                if (existing.length > 0) {
                    // Update existing config
                    await db.execute(`
                        UPDATE company_config 
                        SET config_value = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE config_key = ? AND is_active = 1
                    `, [String(value), key]);
                } else {
                    // Insert new config
                    await db.execute(`
                        INSERT INTO company_config 
                        (config_key, config_value, config_category) 
                        VALUES (?, ?, 'general')
                    `, [key, String(value)]);
                }
            }

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
                'SELECT * FROM company_locations WHERE status = "active" ORDER BY name'
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
                contact_number,
                gstin,
                pincode,
                email,
                phone,
                status
            } = req.body;

            const [result] = await db.execute(`
                INSERT INTO company_locations 
                (name, city, state, address, contact_person, phone, pincode, email, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [name, city, state, address, contact_person, phone, pincode, email, status || 'active']);

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

    // Update location
    async updateLocation(req, res) {
        try {
            const { id } = req.params;
            const {
                name,
                city,
                state,
                address,
                contact_person,
                contact_number,
                gstin,
                pincode,
                email,
                phone,
                status
            } = req.body;

            await db.execute(`
                UPDATE company_locations SET 
                name = ?, city = ?, state = ?, address = ?, 
                contact_person = ?, phone = ?, 
                pincode = ?, email = ?, status = ?,
                updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [name, city, state, address, contact_person, phone, pincode, email, status, id]);

            res.json({
                success: true,
                message: 'Location updated successfully'
            });
        } catch (error) {
            console.error('Error updating location:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating location',
                error: error.message
            });
        }
    }

    // Delete location
    async deleteLocation(req, res) {
        try {
            const { id } = req.params;

            await db.execute(
                'UPDATE company_locations SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'Location deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting location:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting location',
                error: error.message
            });
        }
    }

    // Get tax configuration (home state)
    async getTaxConfig(req, res) {
        try {
            const [homeStateConfig] = await db.execute(
                "SELECT config_value as home_state FROM company_config WHERE config_key = 'company.home_state'"
            );

            // Get list of Indian states
            const indianStates = [
                'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
                'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
                'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
                'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
                'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
            ];

            res.json({
                success: true,
                data: {
                    home_state: homeStateConfig.length > 0 ? homeStateConfig[0].home_state : 'Karnataka',
                    available_states: indianStates
                }
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

    // Update home state
    async updateTaxConfig(req, res) {
        try {
            const { home_state } = req.body;

            if (!home_state) {
                return res.status(400).json({
                    success: false,
                    message: 'Home state is required'
                });
            }

            // Update or insert home state configuration
            const [result] = await db.execute(
                "UPDATE company_config SET config_value = ? WHERE config_key = 'company.home_state'",
                [home_state]
            );

            // If no rows were affected, insert the configuration
            if (result.affectedRows === 0) {
                await db.execute(
                    "INSERT INTO company_config (config_key, config_value, config_description, config_category) VALUES ('company.home_state', ?, 'Company home state for tax calculation', 'general')",
                    [home_state]
                );
            }

            res.json({
                success: true,
                message: 'Home state updated successfully'
            });
        } catch (error) {
            console.error('Error updating home state:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating home state',
                error: error.message
            });
        }
    }

    // Reset home state for all tax configurations
    async resetHomeState(req, res) {
        try {
            await db.execute(
                'UPDATE tax_config SET is_home_state = false, updated_at = CURRENT_TIMESTAMP'
            );

            res.json({
                success: true,
                message: 'Home state reset successfully'
            });
        } catch (error) {
            console.error('Error resetting home state:', error);
            res.status(500).json({
                success: false,
                message: 'Error resetting home state',
                error: error.message
            });
        }
    }

    // Add new tax configuration
    async addTaxConfig(req, res) {
        try {
            const {
                state_name,
                state_code,
                cgst_rate,
                sgst_rate,
                igst_rate,
                is_home_state
            } = req.body;

            const [result] = await db.execute(`
                INSERT INTO tax_config 
                (state_name, state_code, cgst_rate, sgst_rate, igst_rate, is_home_state) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [state_name, state_code, cgst_rate, sgst_rate, igst_rate, is_home_state || false]);

            res.json({
                success: true,
                message: 'Tax configuration added successfully',
                data: { id: result.insertId }
            });
        } catch (error) {
            console.error('Error adding tax config:', error);
            res.status(500).json({
                success: false,
                message: 'Error adding tax configuration',
                error: error.message
            });
        }
    }

    // Delete tax configuration
    async deleteTaxConfig(req, res) {
        try {
            const { id } = req.params;

            await db.execute(
                'DELETE FROM tax_config WHERE id = ?',
                [id]
            );

            res.json({
                success: true,
                message: 'Tax configuration deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting tax config:', error);
            res.status(500).json({
                success: false,
                message: 'Error deleting tax configuration',
                error: error.message
            });
        }
    }
}

module.exports = new CompanyConfigController();
