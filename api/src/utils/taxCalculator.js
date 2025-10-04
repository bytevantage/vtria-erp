/**
 * Tax Calculation Utility
 * 
 * This module provides functions to calculate GST tax splits based on:
 * - Product GST rate (stored in products table)
 * - Customer state vs Company home state
 * 
 * Logic:
 * - Intra-state (same state): CGST + SGST (50% each of total GST)
 * - Inter-state (different states): IGST (100% of total GST)
 */

const db = require('../config/database');

class TaxCalculator {
    
    /**
     * Get the company's home state
     * @returns {Promise<string>} Home state name
     */
    async getCompanyHomeState() {
        try {
            // First try to get from tax_config table
            const [homeStateRows] = await db.execute(
                "SELECT state_name FROM tax_config WHERE is_home_state = 1 LIMIT 1"
            );
            
            if (homeStateRows.length > 0) {
                return homeStateRows[0].state_name;
            }
            
            // Fallback to company_config table
            const [configRows] = await db.execute(
                "SELECT config_value FROM company_config WHERE config_key IN ('company_home_state', 'company.home_state') LIMIT 1"
            );
            
            return configRows.length > 0 ? configRows[0].config_value : 'Karnataka';
        } catch (error) {
            console.error('Error fetching home state:', error);
            return 'Karnataka'; // Default fallback
        }
    }

    /**
     * Calculate tax split based on product GST rate and customer state
     * @param {number} productGstRate - GST rate from product (e.g., 18.00)
     * @param {string} customerState - Customer's state name
     * @param {string} companyHomeState - Company's home state (optional, will fetch if not provided)
     * @returns {Promise<Object>} Tax split object
     */
    async calculateTaxSplit(productGstRate, customerState, companyHomeState = null) {
        try {
            // Get company home state if not provided
            const homeState = companyHomeState || await this.getCompanyHomeState();
            
            // Normalize state names for comparison (trim and case-insensitive)
            const normalizedCustomerState = customerState?.trim().toLowerCase();
            const normalizedHomeState = homeState?.trim().toLowerCase();
            
            const gstRate = parseFloat(productGstRate) || 0;
            
            if (normalizedCustomerState === normalizedHomeState) {
                // Intra-state: CGST + SGST (50% each)
                return {
                    cgst_percentage: gstRate / 2,
                    sgst_percentage: gstRate / 2,
                    igst_percentage: 0.00,
                    total_tax_percentage: gstRate,
                    tax_type: 'intra_state',
                    customer_state: customerState,
                    home_state: homeState
                };
            } else {
                // Inter-state: IGST (100%)
                return {
                    cgst_percentage: 0.00,
                    sgst_percentage: 0.00,
                    igst_percentage: gstRate,
                    total_tax_percentage: gstRate,
                    tax_type: 'inter_state',
                    customer_state: customerState,
                    home_state: homeState
                };
            }
        } catch (error) {
            console.error('Error calculating tax split:', error);
            // Return safe defaults
            return {
                cgst_percentage: 0.00,
                sgst_percentage: 0.00,
                igst_percentage: parseFloat(productGstRate) || 18.00,
                total_tax_percentage: parseFloat(productGstRate) || 18.00,
                tax_type: 'error_fallback',
                error: error.message
            };
        }
    }

    /**
     * Calculate tax amounts for a line item
     * @param {number} amount - Line item amount (before tax)
     * @param {number} productGstRate - GST rate from product
     * @param {string} customerState - Customer's state
     * @returns {Promise<Object>} Tax amounts and totals
     */
    async calculateTaxAmounts(amount, productGstRate, customerState) {
        try {
            const taxSplit = await this.calculateTaxSplit(productGstRate, customerState);
            const baseAmount = parseFloat(amount) || 0;
            
            const cgstAmount = (baseAmount * taxSplit.cgst_percentage) / 100;
            const sgstAmount = (baseAmount * taxSplit.sgst_percentage) / 100;
            const igstAmount = (baseAmount * taxSplit.igst_percentage) / 100;
            const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
            const totalAmount = baseAmount + totalTaxAmount;
            
            return {
                base_amount: baseAmount,
                cgst_percentage: taxSplit.cgst_percentage,
                sgst_percentage: taxSplit.sgst_percentage,
                igst_percentage: taxSplit.igst_percentage,
                cgst_amount: Math.round(cgstAmount * 100) / 100, // Round to 2 decimal places
                sgst_amount: Math.round(sgstAmount * 100) / 100,
                igst_amount: Math.round(igstAmount * 100) / 100,
                total_tax_amount: Math.round(totalTaxAmount * 100) / 100,
                total_amount: Math.round(totalAmount * 100) / 100,
                tax_type: taxSplit.tax_type
            };
        } catch (error) {
            console.error('Error calculating tax amounts:', error);
            throw error;
        }
    }

    /**
     * Get tax configuration for a specific state
     * @param {string} stateName - State name
     * @returns {Promise<Object>} Tax configuration
     */
    async getTaxConfigForState(stateName) {
        try {
            const [rows] = await db.execute(
                "SELECT state_name, state_code, cgst_rate, sgst_rate, igst_rate, is_active FROM tax_config WHERE state_name = ? AND is_active = 1",
                [stateName]
            );
            
            if (rows.length > 0) {
                return rows[0];
            }
            
            // Return default configuration if state not found
            return {
                state_name: stateName,
                state_code: 'XX',
                cgst_rate: 9.00,
                sgst_rate: 9.00,
                igst_rate: 18.00,
                is_active: 1
            };
        } catch (error) {
            console.error('Error fetching tax config for state:', error);
            // Return safe defaults
            return {
                state_name: stateName,
                state_code: 'XX',
                cgst_rate: 9.00,
                sgst_rate: 9.00,
                igst_rate: 18.00,
                is_active: 1
            };
        }
    }

    /**
     * Get all available states from tax_config table
     * @returns {Promise<Array>} Array of states with tax configuration
     */
    async getAvailableStates() {
        try {
            const [rows] = await db.execute(
                "SELECT state_name, state_code, is_home_state FROM tax_config WHERE is_active = 1 ORDER BY is_home_state DESC, state_name ASC"
            );
            return rows;
        } catch (error) {
            console.error('Error fetching available states:', error);
            // Return fallback list
            return this.getIndianStates().map(state => ({
                state_name: state,
                state_code: 'XX',
                is_home_state: state === 'Karnataka' ? 1 : 0
            }));
        }
    }

    /**
     * Get a list of common Indian states for dropdown (fallback)
     * @returns {Array} Array of state names
     */
    getIndianStates() {
        return [
            'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
            'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
            'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
            'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 
            'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry'
        ];
    }

    /**
     * Validate GST rate
     * @param {number} gstRate - GST rate to validate
     * @returns {boolean} Is valid
     */
    validateGstRate(gstRate) {
        const rate = parseFloat(gstRate);
        return !isNaN(rate) && rate >= 0 && rate <= 100;
    }

    /**
     * Enhanced tax calculation with proper state-based rates
     * @param {number} amount - Base amount
     * @param {number} productGstRate - Product GST rate
     * @param {string} customerState - Customer state
     * @returns {Promise<Object>} Comprehensive tax calculation
     */
    async calculateEnhancedTax(amount, productGstRate, customerState) {
        try {
            // Validate inputs
            if (!this.validateGstRate(productGstRate)) {
                throw new Error('Invalid product GST rate');
            }

            const homeState = await this.getCompanyHomeState();
            const taxConfig = await this.getTaxConfigForState(customerState);
            const isInterstate = customerState.toLowerCase() !== homeState.toLowerCase();
            
            const baseAmount = parseFloat(amount) || 0;
            const gstRate = parseFloat(productGstRate) || taxConfig.igst_rate;
            
            let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
            let cgstRate = 0, sgstRate = 0, igstRate = 0;

            if (isInterstate) {
                // Interstate: IGST only
                igstRate = gstRate;
                igstAmount = (baseAmount * igstRate) / 100;
            } else {
                // Intrastate: CGST + SGST
                cgstRate = gstRate / 2;
                sgstRate = gstRate / 2;
                cgstAmount = (baseAmount * cgstRate) / 100;
                sgstAmount = (baseAmount * sgstRate) / 100;
            }

            const totalTax = cgstAmount + sgstAmount + igstAmount;
            const totalAmount = baseAmount + totalTax;

            return {
                baseAmount: parseFloat(baseAmount.toFixed(2)),
                gstRate: gstRate,
                cgstRate: parseFloat(cgstRate.toFixed(2)),
                sgstRate: parseFloat(sgstRate.toFixed(2)),
                igstRate: parseFloat(igstRate.toFixed(2)),
                cgstAmount: parseFloat(cgstAmount.toFixed(2)),
                sgstAmount: parseFloat(sgstAmount.toFixed(2)),
                igstAmount: parseFloat(igstAmount.toFixed(2)),
                totalTax: parseFloat(totalTax.toFixed(2)),
                totalAmount: parseFloat(totalAmount.toFixed(2)),
                isInterstate: isInterstate,
                customerState: customerState,
                homeState: homeState,
                taxType: isInterstate ? 'IGST' : 'CGST+SGST'
            };
        } catch (error) {
            console.error('Error in enhanced tax calculation:', error);
            throw new Error(`Tax calculation failed: ${error.message}`);
        }
    }

    /**
     * Set company home state
     * @param {string} stateName - State name to set as home state
     * @returns {Promise<Object>} Success status with details
     */
    async setHomeState(stateName) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Reset all states to non-home
            await connection.execute("UPDATE tax_config SET is_home_state = 0");

            // Set new home state
            const [result] = await connection.execute(
                "UPDATE tax_config SET is_home_state = 1 WHERE state_name = ? AND is_active = 1",
                [stateName]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return { 
                    success: false, 
                    message: 'Invalid state name or state not found in tax configuration' 
                };
            }

            // Update company config for backward compatibility
            await connection.execute(
                `INSERT INTO company_config (config_key, config_value, config_description, config_category) 
                 VALUES ('company_home_state', ?, 'Company home state for tax calculation', 'general')
                 ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = CURRENT_TIMESTAMP`,
                [stateName]
            );

            await connection.commit();
            return { 
                success: true, 
                message: `Home state successfully updated to ${stateName}` 
            };
        } catch (error) {
            await connection.rollback();
            console.error('Error setting home state:', error);
            return { 
                success: false, 
                message: 'Failed to update home state: ' + error.message 
            };
        } finally {
            connection.release();
        }
    }

    // Legacy method for backward compatibility
    static calculateTaxes(quantity, price, supplierState, companyState = 'Karnataka') {
        const amount = quantity * price;
        const isInterState = supplierState !== companyState;
        
        let taxStructure;
        if (isInterState) {
            // IGST
            taxStructure = {
                type: 'IGST',
                percentage: 18,
                breakdown: {
                    IGST: 18
                }
            };
        } else {
            // CGST + SGST
            taxStructure = {
                type: 'CGST_SGST',
                percentage: 18,
                breakdown: {
                    CGST: 9,
                    SGST: 9
                }
            };
        }
        
        const taxAmount = (amount * taxStructure.percentage) / 100;
        
        return {
            amount,
            tax: {
                ...taxStructure,
                amount: taxAmount,
                breakdown_amounts: Object.entries(taxStructure.breakdown).reduce((acc, [key, value]) => {
                    acc[key] = (amount * value) / 100;
                    return acc;
                }, {})
            }
        };
    }
}

module.exports = new TaxCalculator();
