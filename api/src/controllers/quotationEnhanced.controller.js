const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class QuotationEnhancedController {
    // Create quotation from estimation with tax calculations
    async createQuotationFromEstimation(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { 
                estimation_id, 
                client_state, 
                notes, 
                lead_time_days,
                terms_conditions,
                delivery_terms,
                payment_terms,
                warranty_terms
            } = req.body;
            const created_by = req.user?.id || 1;
            
            // Generate quotation number
            const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
            const quotation_number = await DocumentNumberGenerator.generateNumber('Q', financialYear);
            
            // Get estimation details
            const [estimations] = await connection.execute(`
                SELECT e.*, se.client_id, c.state as client_state_db
                FROM estimations e
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                WHERE e.id = ?
            `, [estimation_id]);
            
            if (estimations.length === 0) {
                throw new Error('Estimation not found');
            }
            
            const estimation = estimations[0];
            const clientState = client_state || estimation.client_state_db;
            
            // Get company home state from config
            const [companyConfig] = await connection.execute(
                'SELECT state FROM company_config LIMIT 1'
            );
            const homeState = companyConfig[0]?.state || 'Karnataka';
            
            // Determine if interstate
            const is_interstate = clientState !== homeState;
            
            // Get tax rates for the client state
            const [taxConfig] = await connection.execute(
                'SELECT * FROM tax_config WHERE state_name = ? AND is_active = 1',
                [clientState]
            );
            
            const tax = taxConfig[0] || { cgst_rate: 9, sgst_rate: 9, igst_rate: 18 };
            
            // Get estimation items grouped by section
            const [estimationItems] = await connection.execute(`
                SELECT 
                    ei.*,
                    es.section_name,
                    ess.subsection_name,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.hsn_code,
                    p.unit,
                    p.image_url
                FROM estimation_items ei
                LEFT JOIN estimation_subsections ess ON ei.subsection_id = ess.id
                LEFT JOIN estimation_sections es ON ess.section_id = es.id
                LEFT JOIN products p ON ei.product_id = p.id
                WHERE es.estimation_id = ?
                ORDER BY es.section_order, ess.subsection_order
            `, [estimation_id]);
            
            // Calculate totals and taxes
            let subtotal = 0;
            estimationItems.forEach(item => {
                subtotal += parseFloat(item.final_price) || 0;
            });
            
            let total_cgst = 0, total_sgst = 0, total_igst = 0;
            
            if (is_interstate) {
                total_igst = subtotal * (tax.igst_rate / 100);
            } else {
                total_cgst = subtotal * (tax.cgst_rate / 100);
                total_sgst = subtotal * (tax.sgst_rate / 100);
            }
            
            const total_tax = total_cgst + total_sgst + total_igst;
            const grand_total = subtotal + total_tax;
            
            // Calculate profit percentage (assuming 15% markup is standard)
            const estimated_cost = subtotal * 0.85; // Assuming 15% margin
            const profit_percentage = ((subtotal - estimated_cost) / estimated_cost) * 100;
            
            // Get the case_id from the estimation
            const case_id = estimation.case_id;
            
            // Insert quotation
            const [quotationResult] = await connection.execute(`
                INSERT INTO quotations 
                (quotation_id, estimation_id, case_id, date, valid_until, terms_conditions, 
                 delivery_terms, payment_terms, warranty_terms, total_amount, total_tax, 
                 grand_total, profit_percentage, notes, created_by, status) 
                VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
            `, [
                quotation_number, estimation_id, case_id,
                terms_conditions || 'Standard terms and conditions apply',
                delivery_terms || '4-6 weeks from approval',
                payment_terms || '30% advance, 70% on delivery',
                warranty_terms || '12 months warranty from date of installation',
                subtotal, total_tax, grand_total, profit_percentage, notes, created_by
            ]);
            
            const quotation_id = quotationResult.insertId;
            
            // Group items by main section for quotation display
            const groupedItems = {};
            estimationItems.forEach(item => {
                const sectionKey = item.section_name;
                if (!groupedItems[sectionKey]) {
                    groupedItems[sectionKey] = {
                        section_name: sectionKey,
                        description: `${sectionKey} components and accessories`,
                        total_quantity: 0,
                        total_amount: 0,
                        hsn_code: item.hsn_code || '85371000', // Default electrical equipment HSN
                        items: []
                    };
                }
                groupedItems[sectionKey].total_quantity += item.quantity;
                groupedItems[sectionKey].total_amount += parseFloat(item.final_price) || 0;
                groupedItems[sectionKey].items.push(item);
            });
            
            // Insert quotation items (grouped by section)
            for (const [sectionName, groupData] of Object.entries(groupedItems)) {
                const unit_rate = parseFloat(groupData.total_amount) || 0; // Total for this section
                const discount_given = 0; // Can be calculated if needed
                const tax_rate = is_interstate ? parseFloat(tax.igst_rate) : (parseFloat(tax.cgst_rate) + parseFloat(tax.sgst_rate));
                
                await connection.execute(`
                    INSERT INTO quotation_items 
                    (quotation_id, item_name, description, hsn_code, quantity, unit, 
                     rate, discount_percentage, tax_percentage, amount, lead_time, image_url) 
                    VALUES (?, ?, ?, ?, 1, 'Set', ?, ?, ?, ?, ?, ?)
                `, [
                    quotation_id, sectionName, groupData.description, groupData.hsn_code,
                    unit_rate, discount_given, tax_rate,
                    unit_rate, `${lead_time_days || 7} days`, null
                ]);
            }
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Quotation created successfully',
                data: { 
                    id: quotation_id, 
                    quotation_number,
                    profit_percentage,
                    is_low_profit: profit_percentage < 10
                }
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error creating quotation:', error);
            res.status(500).json({
                success: false,
                message: 'Error creating quotation',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Get quotation with enhanced format
    async getQuotationById(req, res) {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    q.*,
                    c.company_name as client_name,
                    c.contact_person,
                    c.address as client_address,
                    c.city as client_city,
                    c.state as client_state,
                    c.pincode as client_pincode,
                    c.gstin as client_gstin,
                    se.project_name,
                    e.estimation_id as estimation_number,
                    u.full_name as created_by_name
                FROM quotations q
                LEFT JOIN estimations e ON q.estimation_id = e.id
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN users u ON q.created_by = u.id
                WHERE q.id = ?
            `;
            
            const [quotations] = await db.execute(query, [id]);
            
            if (quotations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }
            
            // Get quotation items
            const itemsQuery = `
                SELECT 
                    qi.*
                FROM quotation_items qi
                WHERE qi.quotation_id = ?
                ORDER BY qi.id
            `;
            
            const [items] = await db.execute(itemsQuery, [id]);
            
            // Get company details
            const [companyConfig] = await db.execute(
                'SELECT * FROM company_config LIMIT 1'
            );
            
            const quotation = quotations[0];
            
            res.json({
                success: true,
                data: {
                    ...quotation,
                    items,
                    company: companyConfig[0] || {},
                    is_low_profit: quotation.profit_percentage < 10
                }
            });
        } catch (error) {
            console.error('Error fetching quotation:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching quotation',
                error: error.message
            });
        }
    }

    // Approve quotation
    async approveQuotation(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            const approved_by = req.user?.id || 1;
            
            // Check if quotation exists
            const [quotations] = await connection.execute(
                'SELECT * FROM quotations WHERE id = ?',
                [id]
            );
            
            if (quotations.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }
            
            // Update quotation status
            await connection.execute(
                'UPDATE quotations SET status = "approved", approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
                [approved_by, id]
            );
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Quotation approved successfully'
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error approving quotation:', error);
            res.status(500).json({
                success: false,
                message: 'Error approving quotation',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Get all quotations
    async getAllQuotations(req, res) {
        try {
            const query = `
                SELECT 
                    q.*,
                    c.company_name as client_name,
                    c.city as client_city,
                    c.state as client_state,
                    se.project_name,
                    e.estimation_id as estimation_number,
                    cs.case_number,
                    u.full_name as created_by_name,
                    a.full_name as approved_by_name
                FROM quotations q
                LEFT JOIN estimations e ON q.estimation_id = e.id
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN cases cs ON q.case_id = cs.id
                LEFT JOIN users u ON q.created_by = u.id
                LEFT JOIN users a ON q.approved_by = a.id
                ORDER BY q.created_at DESC
            `;
            
            const [quotations] = await db.execute(query);
            
            res.json({
                success: true,
                data: quotations,
                count: quotations.length
            });
        } catch (error) {
            console.error('Error fetching quotations:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching quotations',
                error: error.message
            });
        }
    }

    // Update quotation
    async updateQuotation(req, res) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const { id } = req.params;
            const { 
                notes, 
                lead_time_days, 
                terms_conditions, 
                delivery_terms, 
                payment_terms, 
                warranty_terms,
                items 
            } = req.body;
            
            // Update quotation basic details (handle undefined values)
            await connection.execute(`
                UPDATE quotations 
                SET notes = ?, terms_conditions = ?, 
                    delivery_terms = ?, payment_terms = ?, warranty_terms = ?
                WHERE id = ?
            `, [
                notes || null, 
                terms_conditions || null, 
                delivery_terms || null, 
                payment_terms || null, 
                warranty_terms || null, 
                id
            ]);
            
            // Update items if provided
            if (items && Array.isArray(items)) {
                // Delete existing items
                await connection.execute('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
                
                let subtotal = 0;
                
                // Insert updated items
                for (const item of items) {
                    await connection.execute(`
                        INSERT INTO quotation_items 
                        (quotation_id, section_name, description, hsn_code, quantity, unit, 
                         rate, discount_percentage, tax_rate, amount, lead_time_days) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        id, item.section_name, item.description, item.hsn_code,
                        item.quantity, item.unit, item.rate, item.discount_percentage || 0,
                        item.tax_rate, item.amount, item.lead_time_days
                    ]);
                    
                    subtotal += item.amount;
                }
                
                // Recalculate taxes and totals
                const [quotationData] = await connection.execute(
                    'SELECT * FROM quotations WHERE id = ?', [id]
                );
                const quotation = quotationData[0];
                
                let total_cgst = 0, total_sgst = 0, total_igst = 0;
                
                if (quotation.is_interstate) {
                    total_igst = subtotal * (quotation.igst_rate / 100);
                } else {
                    total_cgst = subtotal * (quotation.cgst_rate / 100);
                    total_sgst = subtotal * (quotation.sgst_rate / 100);
                }
                
                const total_tax = total_cgst + total_sgst + total_igst;
                const grand_total = subtotal + total_tax;
                
                // Update totals
                await connection.execute(`
                    UPDATE quotations 
                    SET subtotal = ?, total_cgst = ?, total_sgst = ?, total_igst = ?, 
                        total_tax = ?, grand_total = ?
                    WHERE id = ?
                `, [subtotal, total_cgst, total_sgst, total_igst, total_tax, grand_total, id]);
            }
            
            await connection.commit();
            
            res.json({
                success: true,
                message: 'Quotation updated successfully'
            });
        } catch (error) {
            await connection.rollback();
            console.error('Error updating quotation:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating quotation',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }

    // Generate PDF quotation
    async generateQuotationPDF(req, res) {
        try {
            const { id } = req.params;
            
            // Get quotation details
            const quotationQuery = `
                SELECT 
                    q.*,
                    c.company_name as client_name,
                    c.contact_person,
                    c.address as client_address,
                    c.city as client_city,
                    c.state as client_state,
                    c.pincode as client_pincode,
                    c.gstin as client_gstin,
                    c.email as client_email,
                    c.phone as client_phone,
                    se.project_name,
                    e.estimation_id as estimation_number,
                    u.full_name as created_by_name
                FROM quotations q
                LEFT JOIN estimations e ON q.estimation_id = e.id
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN users u ON q.created_by = u.id
                WHERE q.id = ?
            `;
            
            const [quotations] = await db.execute(quotationQuery, [id]);
            
            if (quotations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }
            
            const quotation = quotations[0];
            
            // Get quotation items
            const [items] = await db.execute(
                'SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id',
                [id]
            );
            
            // Get detailed estimation items with section/subsection structure for PDF
            const [detailedItems] = await db.execute(`
                SELECT 
                    ei.*,
                    es.section_name as main_section_name,
                    ess.subsection_name as sub_section_name,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.hsn_code,
                    p.unit,
                    p.image_url
                FROM estimation_items ei
                LEFT JOIN estimation_subsections ess ON ei.subsection_id = ess.id
                LEFT JOIN estimation_sections es ON ess.section_id = es.id
                LEFT JOIN products p ON ei.product_id = p.id
                WHERE es.estimation_id = ?
                ORDER BY es.section_order, ess.subsection_order, ei.id
            `, [quotation.estimation_id]);
            
            // Get company config
            const [companyConfig] = await db.execute(
                'SELECT * FROM company_config LIMIT 1'
            );
            const company = companyConfig[0] || {};
            
            // Create HTML content with detailed items
            const htmlContent = this.generateQuotationHTML(quotation, items, detailedItems, company);

            // Generate PDF using Puppeteer
            const puppeteer = require('puppeteer');
            const browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            // Generate PDF buffer
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                }
            });

            await browser.close();

            // Set proper PDF headers
            const filename = `Quotation_${quotation.quotation_id.replace(/\//g, '_')}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            // Send PDF buffer
            res.send(pdfBuffer);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating PDF',
                error: error.message
            });
        }
    }

    // Generate HTML template for PDF

    // Generate HTML template for PDF
    generateQuotationHTML(quotation, summaryItems, detailedItems, company) {
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2
            }).format(amount);
        };

        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('en-IN');
        };

        // Use detailed items to show Main Section - Sub Section structure
        const itemsHTML = detailedItems.map((item, index) => `
            <tr>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">
                    <strong>${item.main_section_name} - ${item.sub_section_name}</strong><br>
                    <small>${item.description || item.product_name || item.item_name || ''}</small>
                </td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.hsn_code || ''}</td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.unit || 'Nos'}</td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 8px;">${formatCurrency(parseFloat(item.rate) || 0)}</td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 8px; font-weight: 600;">${formatCurrency(parseFloat(item.total_amount) || 0)}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quotation ${quotation.quotation_id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1976d2; }
        .quotation-title { font-size: 20px; margin-top: 15px; background: #1976d2; color: white; padding: 10px; }
        .details-section { display: flex; justify-content: space-between; margin: 20px 0; }
        .details-box { width: 48%; }
        .details-box h3 { color: #1976d2; border-bottom: 1px solid #1976d2; padding-bottom: 5px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #1976d2; color: white; padding: 10px; border: 1px solid #1976d2; }
        .totals-table { float: right; margin-top: 20px; border-collapse: collapse; }
        .totals-table td { padding: 8px 12px; border: 1px solid #ddd; }
        .grand-total { background: #1976d2; color: white; font-weight: bold; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">${company.company_name || 'VTRIA ENGINEERING SOLUTIONS PVT LTD'}</div>
        <div class="quotation-title">QUOTATION - ${quotation.quotation_id}</div>
    </div>
    
    <div class="details-section">
        <div class="details-box">
            <h3>Bill To:</h3>
            <strong>${quotation.client_name || 'Client Name'}</strong><br>
            ${quotation.client_address || ''}<br>
            ${quotation.client_city || ''}, ${quotation.client_state || ''}
        </div>
        <div class="details-box">
            <h3>Quotation Details:</h3>
            <strong>Date:</strong> ${formatDate(quotation.date)}<br>
            <strong>Valid Until:</strong> ${formatDate(quotation.valid_until)}<br>
            <strong>Project:</strong> ${quotation.project_name || 'N/A'}
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Sr.</th>
                <th>Description</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>

    <table class="totals-table">
        <tr>
            <td><strong>Subtotal:</strong></td>
            <td style="text-align: right;">${formatCurrency(parseFloat(quotation.total_amount) || 0)}</td>
        </tr>
        <tr>
            <td><strong>Tax:</strong></td>
            <td style="text-align: right;">${formatCurrency(parseFloat(quotation.total_tax) || 0)}</td>
        </tr>
        <tr class="grand-total">
            <td><strong>Grand Total:</strong></td>
            <td style="text-align: right;"><strong>${formatCurrency(parseFloat(quotation.grand_total) || 0)}</strong></td>
        </tr>
    </table>

    <div class="footer">
        This is a computer generated quotation.<br>
        For queries, contact: ${company.email || 'info@vtria.com'} | ${company.phone || '+91 80 1234 5678'}
    </div>
</body>
</html>`;
    }

    // Update quotation status
    async updateQuotationStatus(req, res) {
        const connection = await db.getConnection();
        
        try {
            const { id } = req.params;
            const { status } = req.body;
            const updated_by = req.user?.id || 1;
            
            // Validate status
            const validStatuses = ['draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
                });
            }
            
            await connection.beginTransaction();
            
            // Check if quotation exists
            const [quotations] = await connection.execute(
                'SELECT * FROM quotations WHERE id = ?',
                [id]
            );
            
            if (quotations.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }
            
            const oldStatus = quotations[0].status;
            
            // Update quotation status
            await connection.execute(`
                UPDATE quotations 
                SET status = ?
                WHERE id = ?
            `, [status, id]);
            
            // Log status change (optional - skip if table doesn't exist)
            try {
                await connection.execute(`
                    INSERT INTO quotation_status_history 
                    (quotation_id, old_status, new_status, changed_by, created_at)
                    VALUES (?, ?, ?, ?, NOW())
                `, [id, oldStatus, status, updated_by]);
            } catch (historyError) {
                // If history table doesn't exist, just log but don't fail the operation
                console.log('Quotation status history logging skipped (table may not exist)');
            }
            
            await connection.commit();
            
            res.json({
                success: true,
                message: `Quotation status updated to ${status}`,
                data: {
                    id,
                    status,
                    updated_at: new Date().toISOString()
                }
            });
            
        } catch (error) {
            await connection.rollback();
            console.error('Error updating quotation status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update quotation status',
                error: error.message
            });
        } finally {
            connection.release();
        }
    }
}

module.exports = new QuotationEnhancedController();
