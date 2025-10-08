const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class QuotationEnhancedController {
    // Get quotation by case number
    async getQuotationByCaseNumber(req, res) {
        try {
            const { caseNumber } = req.params;

            const query = `
                SELECT 
                    q.*,
                    e.case_id,
                    c.case_number,
                    cl.company_name as client_name,
                    cl.contact_person,
                    cl.email as client_email
                FROM quotations q
                JOIN estimations e ON q.estimation_id = e.id
                JOIN cases c ON e.case_id = c.id
                JOIN sales_enquiries se ON e.enquiry_id = se.id
                JOIN clients cl ON se.client_id = cl.id
                WHERE c.case_number = ?
                ORDER BY q.created_at DESC
                LIMIT 1
            `;

            const [quotations] = await db.execute(query, [caseNumber]);

            if (quotations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `No quotation found for case ${caseNumber}`
                });
            }

            res.json({
                success: true,
                data: quotations[0]
            });

        } catch (error) {
            console.error('Error fetching quotation by case number:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching quotation',
                error: error.message
            });
        }
    }
    // Create quotation from estimation with tax calculations
    async createQuotationFromEstimation(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            console.log('Received request body:', req.body);

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

            console.log('Extracted parameters:', {
                estimation_id,
                client_state,
                notes,
                lead_time_days,
                terms_conditions,
                delivery_terms,
                payment_terms,
                warranty_terms,
                created_by
            });

            // Generate quotation number
            const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
            const quotation_number = await DocumentNumberGenerator.generateNumber('Q', financialYear);

            // Get estimation details
            const [estimations] = await connection.execute(`
                SELECT e.*, se.client_id, c.state as client_state_db, e.case_id
                FROM estimations e
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                WHERE e.id = ?
            `, [estimation_id]);

            if (estimations.length === 0) {
                throw new Error('Estimation not found');
            }

            const estimation = estimations[0];

            // Check if a quotation already exists for this estimation
            const [existingQuotations] = await connection.execute(`
                SELECT id, quotation_id, status
                FROM quotations 
                WHERE estimation_id = ? AND deleted_at IS NULL
            `, [estimation_id]);

            if (existingQuotations.length > 0) {
                const existingQuotation = existingQuotations[0];
                throw new Error(`A quotation (${existingQuotation.quotation_id}) already exists for this estimation. Status: ${existingQuotation.status}. Please edit the existing quotation or delete it first.`);
            }
            const clientState = client_state || estimation.client_state_db;

            // Get company home state from tax_config table
            const [homeStateConfig] = await connection.execute(
                'SELECT state_name FROM tax_config WHERE is_home_state = 1 LIMIT 1'
            );
            const homeState = homeStateConfig[0]?.state_name || 'Karnataka';

            // Determine if interstate
            const is_interstate = clientState !== homeState;

            // Get tax rates for the client state from tax_config table
            const [taxConfig] = await connection.execute(
                'SELECT * FROM tax_config WHERE state_name = ? AND is_active = 1',
                [clientState]
            );

            // Use configured tax rates or fallback to defaults
            const tax = taxConfig[0] || { cgst_rate: 9, sgst_rate: 9, igst_rate: 18 };

            // Get estimation items grouped by section
            const [estimationItems] = await connection.execute(`
                SELECT 
                    ei.*,
                    es.heading as section_name,
                    ess.subsection_name,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.hsn_code,
                    p.unit
                FROM estimation_items ei
                LEFT JOIN estimation_subsections ess ON ei.subsection_id = ess.id
                LEFT JOIN estimation_sections es ON ess.section_id = es.id
                LEFT JOIN products p ON ei.product_id = p.id
                WHERE es.estimation_id = ?
                ORDER BY es.sort_order, ess.subsection_order
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
                 final_amount, grand_total, created_by, status) 
                VALUES (?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
            `, [
                quotation_number,
                estimation_id,
                case_id || null,
                terms_conditions || 'Standard terms and conditions apply',
                delivery_terms || '4-6 weeks from approval',
                payment_terms || '30% advance, 70% on delivery',
                warranty_terms || '12 months warranty from date of installation',
                subtotal || 0,
                total_tax || 0,
                grand_total || 0,
                grand_total || 0,
                created_by || 1
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

                const cgst_rate = is_interstate ? 0 : parseFloat(tax.cgst_rate) || 0;
                const sgst_rate = is_interstate ? 0 : parseFloat(tax.sgst_rate) || 0;
                const igst_rate = is_interstate ? parseFloat(tax.igst_rate) || 0 : 0;

                await connection.execute(`
                    INSERT INTO quotation_items 
                    (quotation_id, item_name, description, hsn_code, quantity, unit, 
                     rate, amount, cgst_percentage, sgst_percentage, igst_percentage) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    quotation_id,
                    sectionName || 'Section',
                    groupData.description || 'Description',
                    groupData.hsn_code || '85371000',
                    1,
                    'Set',
                    unit_rate || 0,
                    unit_rate || 0,
                    cgst_rate,
                    sgst_rate,
                    igst_rate
                ]);
            }

            // Transition case state from 'estimation' to 'quotation'
            if (case_id) {
                try {
                    // Get case number for the transition
                    const [caseData] = await connection.execute(
                        'SELECT case_number FROM cases WHERE id = ?',
                        [case_id]
                    );

                    if (caseData.length > 0) {
                        const case_number = caseData[0].case_number;

                        // Update case state to 'quotation'
                        await connection.execute(
                            `UPDATE cases 
                             SET current_state = 'quotation', updated_at = CURRENT_TIMESTAMP 
                             WHERE id = ?`,
                            [case_id]
                        );

                        // Record state transition
                        await connection.execute(
                            `INSERT INTO case_state_transitions 
                            (case_id, from_state, to_state, notes, reference_id, created_by) 
                            VALUES (?, 'estimation', 'quotation', 'Quotation created automatically', ?, ?)`,
                            [case_id, quotation_id, created_by]
                        );

                        console.log(`Case ${case_number} transitioned from estimation to quotation state`);
                    }
                } catch (transitionError) {
                    console.error('Error transitioning case state:', transitionError);
                    // Don't fail the quotation creation if state transition fails
                }
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

            // Handle both numeric IDs and quotation_id strings
            const isNumericId = !isNaN(parseInt(id));
            const whereClause = isNumericId ? 'q.id = ?' : 'q.quotation_id = ?';

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
                WHERE ${whereClause}
            `;

            const [quotations] = await db.execute(query, [id]);

            if (quotations.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }

            // Get quotation items using the resolved quotation ID
            const quotationId = quotations[0].id;
            const itemsQuery = `
                SELECT 
                    qi.*
                FROM quotation_items qi
                WHERE qi.quotation_id = ?
                ORDER BY qi.id
            `;

            const [items] = await db.execute(itemsQuery, [quotationId]);

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
            console.error('Error fetching quotation details:', error);
            console.error('Request params:', req.params);
            console.error('Stack trace:', error.stack);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch quotation details',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
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

            // Check if quotation exists and get case details
            const [quotations] = await connection.execute(
                'SELECT q.*, c.case_number, c.current_state FROM quotations q LEFT JOIN cases c ON q.case_id = c.id WHERE q.id = ?',
                [id]
            );

            if (quotations.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }

            const quotation = quotations[0];

            // Update quotation status
            await connection.execute(
                'UPDATE quotations SET status = "approved", approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
                [approved_by, id]
            );

            // Transition case to 'order' state if it has a valid case and is in 'quotation' state
            if (quotation.case_id && quotation.current_state === 'quotation') {
                // Update case state to 'order'
                await connection.execute(
                    'UPDATE cases SET current_state = "order", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [quotation.case_id]
                );

                // Add case state transition history
                await connection.execute(
                    `INSERT INTO case_state_transitions 
                     (case_id, from_state, to_state, notes, created_by, created_at) 
                     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                        quotation.case_id,
                        'quotation',
                        'order',
                        `Case transitioned to order state due to quotation ${quotation.quotation_id} approval`,
                        approved_by
                    ]
                );

                // Create sales order record
                try {
                    // Import DocumentNumberGenerator for generating sales order ID
                    const DocumentNumberGenerator = require('../utils/documentNumberGenerator');

                    // Generate sales order number
                    const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
                    const salesOrderNumber = await DocumentNumberGenerator.generateNumber('SO', financialYear);

                    // Get client_id from the quotation/estimation
                    const [clientData] = await connection.execute(`
                        SELECT se.client_id 
                        FROM quotations q 
                        INNER JOIN estimations e ON q.estimation_id = e.id 
                        INNER JOIN sales_enquiries se ON e.enquiry_id = se.id 
                        WHERE q.id = ?
                    `, [id]);

                    const client_id = clientData[0]?.client_id || null;

                    // Insert sales order
                    await connection.execute(`
                        INSERT INTO sales_orders 
                        (sales_order_id, quotation_id, case_id, order_date, client_id, 
                         total_amount, tax_amount, grand_total, status, created_by, created_at) 
                        VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, 'confirmed', ?, CURRENT_TIMESTAMP)
                    `, [
                        salesOrderNumber,
                        quotation.id,
                        quotation.case_id,
                        client_id,
                        quotation.total_amount || quotation.final_amount || 0,
                        quotation.total_tax || 0,
                        quotation.grand_total || quotation.final_amount || 0,
                        approved_by
                    ]);

                    console.log(`Sales order ${salesOrderNumber} created for quotation ${quotation.quotation_id}`);

                } catch (salesOrderError) {
                    console.error('Error creating sales order:', salesOrderError);
                    // Don't fail the quotation approval if sales order creation fails
                }
            }

            await connection.commit();

            res.json({
                success: true,
                message: 'Quotation approved successfully and case transitioned to order state',
                data: {
                    quotation_id: quotation.quotation_id,
                    case_number: quotation.case_number,
                    case_transitioned: quotation.case_id && quotation.current_state === 'quotation'
                }
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
            // Get created quotations
            const quotationsQuery = `
                SELECT 
                    'quotation' as record_type,
                    q.*,
                    q.estimation_id AS estimation_fk_id,
                    e.estimation_id as estimation_number,
                    e.total_mrp,
                    e.total_final_price,
                    CASE 
                        WHEN e.total_mrp IS NOT NULL AND e.total_final_price IS NOT NULL AND e.total_mrp > 0 
                            THEN ROUND( ( (e.total_mrp - e.total_final_price) / e.total_mrp ) * 100, 2)
                        ELSE NULL
                    END AS profit_percentage_calculated,
                    c.company_name as client_name,
                    c.city as client_city,
                    c.state as client_state,
                    se.project_name,
                    cs.case_number,
                    u.full_name as created_by_name,
                    a.full_name as approved_by_name,
                    'Created Quotation' as workflow_status,
                    false as canCreateQuotation
                FROM quotations q
                LEFT JOIN estimations e ON q.estimation_id = e.id
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN cases cs ON e.case_id = cs.id
                LEFT JOIN users u ON q.created_by = u.id
                LEFT JOIN users a ON q.approved_by = a.id
                WHERE q.deleted_at IS NULL
            `;

            // Get approved estimations available for quotation creation
            const availableEstimationsQuery = `
                SELECT 
                    'available_estimation' as record_type,
                    e.id,
                    NULL as quotation_id,
                    e.id AS estimation_fk_id,
                    e.estimation_id as estimation_number,
                    e.total_mrp,
                    e.total_final_price,
                    CASE 
                        WHEN e.total_mrp IS NOT NULL AND e.total_final_price IS NOT NULL AND e.total_mrp > 0 
                            THEN ROUND( ( (e.total_mrp - e.total_final_price) / e.total_mrp ) * 100, 2)
                        ELSE NULL
                    END AS profit_percentage_calculated,
                    c.company_name as client_name,
                    c.city as client_city,
                    c.state as client_state,
                    se.project_name,
                    cs.case_number,
                    ue.full_name as created_by_name,
                    ua.full_name as approved_by_name,
                    e.status,
                    e.date,
                    e.approved_at as created_at,
                    NULL as valid_until,
                    'Ready for Quotation' as workflow_status,
                    true as canCreateQuotation
                FROM estimations e
                JOIN sales_enquiries se ON e.enquiry_id = se.id
                JOIN clients c ON se.client_id = c.id
                LEFT JOIN users ue ON e.created_by = ue.id
                LEFT JOIN users ua ON e.approved_by = ua.id
                LEFT JOIN cases cs ON e.case_id = cs.id
                LEFT JOIN quotations q ON e.id = q.estimation_id
                WHERE e.status = 'approved' 
                AND e.deleted_at IS NULL
                AND q.id IS NULL
                AND se.status != 'closed'
            `;

            const [quotations] = await db.execute(quotationsQuery);
            const [availableEstimations] = await db.execute(availableEstimationsQuery);

            // Combine both arrays and sort by date
            const combinedData = [...quotations, ...availableEstimations].sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );

            res.json({
                success: true,
                data: combinedData,
                count: combinedData.length,
                breakdown: {
                    created_quotations: quotations.length,
                    available_estimations: availableEstimations.length
                }
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

            // Debug logging
            console.log('===== UPDATE QUOTATION DEBUG =====');
            console.log('Quotation ID:', id);
            console.log('Request body:', JSON.stringify(req.body, null, 2));
            console.log('==================================');

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
                SET terms_conditions = ?, delivery_terms = ?, payment_terms = ?, warranty_terms = ?
                WHERE id = ?
            `, [
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
                    // Calculate tax percentages based on item tax rate
                    const tax_rate = parseFloat(item.tax_rate) || 18;
                    const cgst_rate = tax_rate / 2; // Split equally for intrastate
                    const sgst_rate = tax_rate / 2;
                    const igst_rate = 0; // Assuming intrastate for now

                    await connection.execute(`
                        INSERT INTO quotation_items 
                        (quotation_id, item_name, description, hsn_code, quantity, unit, 
                         rate, amount, cgst_percentage, sgst_percentage, igst_percentage) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        id,
                        item.description || item.item_name || 'Item',
                        item.description || '',
                        item.hsn_code || '85371000',
                        item.quantity || 1,
                        item.unit || 'nos',
                        item.rate || 0,
                        item.amount || 0,
                        cgst_rate,
                        sgst_rate,
                        igst_rate
                    ]);

                    // Convert to number and add to subtotal
                    subtotal += parseFloat(item.amount) || 0;
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

                console.log('Tax calculation debug:');
                console.log('- subtotal:', subtotal);
                console.log('- total_cgst:', total_cgst);
                console.log('- total_sgst:', total_sgst);
                console.log('- total_igst:', total_igst);
                console.log('- total_tax:', total_tax);
                console.log('- grand_total:', grand_total);

                // Update totals
                await connection.execute(`
                    UPDATE quotations 
                    SET total_amount = ?, total_tax = ?, final_amount = ?, grand_total = ?
                    WHERE id = ?
                `, [subtotal, total_tax, grand_total, grand_total, id]);
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

    // Recalculate quotation totals from items
    async recalculateQuotationTotals(req, res) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { id } = req.params;

            // Get quotation items
            const [items] = await connection.execute(
                'SELECT * FROM quotation_items WHERE quotation_id = ?',
                [id]
            );

            if (items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No items found to calculate totals'
                });
            }

            // Calculate totals from items
            let subtotal = 0;
            let total_cgst = 0;
            let total_sgst = 0;
            let total_igst = 0;

            for (const item of items) {
                const amount = parseFloat(item.amount) || 0;
                const cgst_percent = parseFloat(item.cgst_percentage) || 0;
                const sgst_percent = parseFloat(item.sgst_percentage) || 0;
                const igst_percent = parseFloat(item.igst_percentage) || 0;

                subtotal += amount;
                total_cgst += (amount * cgst_percent) / 100;
                total_sgst += (amount * sgst_percent) / 100;
                total_igst += (amount * igst_percent) / 100;
            }

            const total_tax = total_cgst + total_sgst + total_igst;
            const grand_total = subtotal + total_tax;

            console.log('Recalculation results:');
            console.log('- subtotal:', subtotal);
            console.log('- total_cgst:', total_cgst);
            console.log('- total_sgst:', total_sgst);
            console.log('- total_igst:', total_igst);
            console.log('- total_tax:', total_tax);
            console.log('- grand_total:', grand_total);

            // Update quotation totals
            await connection.execute(`
                UPDATE quotations 
                SET total_amount = ?, total_tax = ?, final_amount = ?, grand_total = ?
                WHERE id = ?
            `, [subtotal, total_tax, grand_total, grand_total, id]);

            await connection.commit();

            res.json({
                success: true,
                message: 'Quotation totals recalculated successfully',
                data: {
                    total_amount: subtotal,
                    total_tax,
                    final_amount: grand_total,
                    grand_total,
                    tax_breakdown: {
                        cgst: total_cgst,
                        sgst: total_sgst,
                        igst: total_igst
                    }
                }
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error recalculating quotation totals:', error);
            res.status(500).json({
                success: false,
                message: 'Error recalculating quotation totals',
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
                    es.heading as main_section_name,
                    ess.subsection_name as sub_section_name,
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.hsn_code,
                    p.unit
                FROM estimation_items ei
                LEFT JOIN estimation_subsections ess ON ei.subsection_id = ess.id
                LEFT JOIN estimation_sections es ON ess.section_id = es.id
                LEFT JOIN products p ON ei.product_id = p.id
                WHERE es.estimation_id = ?
                ORDER BY es.sort_order, ess.subsection_order, ei.id
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

        // Calculate tax breakdown from items
        let total_cgst = 0;
        let total_sgst = 0;
        let total_igst = 0;

        detailedItems.forEach(item => {
            const amount = parseFloat(item.amount) || 0;
            const cgst_percent = parseFloat(item.cgst_percentage) || 0;
            const sgst_percent = parseFloat(item.sgst_percentage) || 0;
            const igst_percent = parseFloat(item.igst_percentage) || 0;

            total_cgst += (amount * cgst_percent) / 100;
            total_sgst += (amount * sgst_percent) / 100;
            total_igst += (amount * igst_percent) / 100;
        });

        // Use summary items for correct pricing data
        const itemsHTML = summaryItems.map((item, index) => `
            <tr>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">
                    <strong>${item.item_name}</strong><br>
                    <small>${item.description || ''}</small>
                </td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.hsn_code || ''}</td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                <td style="text-align: center; border: 1px solid #ddd; padding: 8px;">${item.unit || 'Nos'}</td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 8px;">${formatCurrency(parseFloat(item.rate) || 0)}</td>
                <td style="text-align: right; border: 1px solid #ddd; padding: 8px; font-weight: 600;">${formatCurrency(parseFloat(item.amount) || 0)}</td>
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
        ${total_igst > 0 ? `
        <tr>
            <td><strong>IGST (18%):</strong></td>
            <td style="text-align: right;">${formatCurrency(total_igst)}</td>
        </tr>
        ` : ''}
        ${total_cgst > 0 ? `
        <tr>
            <td><strong>CGST (9%):</strong></td>
            <td style="text-align: right;">${formatCurrency(total_cgst)}</td>
        </tr>
        ` : ''}
        ${total_sgst > 0 ? `
        <tr>
            <td><strong>SGST (9%):</strong></td>
            <td style="text-align: right;">${formatCurrency(total_sgst)}</td>
        </tr>
        ` : ''}
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
            const { status: rawStatus, rejection_reason } = req.body;
            const updated_by = req.user?.id || 1;

            // Status mapping for frontend compatibility
            const statusMapping = {
                'pending': 'draft',
                'pending_approval': 'sent',  // Fixed: pending_approval should map to sent, not draft
                'under_review': 'sent',
                'in_review': 'sent',
                'review': 'sent',
                'accepted': 'approved',
                'confirmed': 'approved',
                'declined': 'rejected',
                'cancelled': 'rejected',
                'canceled': 'rejected',
                'needs_revision': 'revised',
                'revision_needed': 'revised',
                'updated': 'revised'
            };

            // Map frontend status to database status
            const status = statusMapping[rawStatus] || rawStatus;

            // Validate status (must match database ENUM values)
            const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'revised'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}. Received: ${rawStatus}`
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

            // Update quotation status and optionally rejection_reason
            let updateQuery = 'UPDATE quotations SET status = ?';
            let updateParams = [status];

            if (rejection_reason !== undefined) {
                updateQuery += ', rejection_reason = ?';
                updateParams.push(rejection_reason);
            }

            updateQuery += ' WHERE id = ?';
            updateParams.push(id);

            await connection.execute(updateQuery, updateParams);

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

            // Create BOM if status is being set to 'approved'
            let bomCreated = false;
            if (status === 'approved' && quotations[0].status !== 'approved') {
                try {
                    const bomResult = await createBOMFromQuotation(connection, id, updated_by);
                    bomCreated = bomResult.success;
                } catch (bomError) {
                    console.error('Error creating BOM from quotation:', bomError);
                    // Don't fail the quotation approval if BOM creation fails
                }
            }

            await connection.commit();

            res.json({
                success: true,
                message: `Quotation status updated to ${status}${bomCreated ? '. BOM created automatically.' : ''}`,
                data: {
                    id,
                    status,
                    bom_created: bomCreated,
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

    // Generate BOM PDF for quotation
    async generateBOMPDF(req, res) {
        try {
            const { id } = req.params;

            // Get quotation details with case information
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
                    u.full_name as created_by_name,
                    cs.case_number
                FROM quotations q
                LEFT JOIN estimations e ON q.estimation_id = e.id
                LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
                LEFT JOIN clients c ON se.client_id = c.id
                LEFT JOIN users u ON q.created_by = u.id
                LEFT JOIN cases cs ON e.case_id = cs.id
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

            // Get detailed estimation items for BOM (same query as PDF generation)
            const [bomItems] = await db.execute(`
                SELECT 
                    ei.*,
                    es.heading as main_section_name,
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
                ORDER BY es.sort_order, ess.subsection_order, ei.id
            `, [quotation.estimation_id]);

            // Get company config
            const [companyConfig] = await db.execute(
                'SELECT * FROM company_config LIMIT 1'
            );
            const company = companyConfig[0] || {};

            // Group items by section for BOM organization
            const sections = {};
            bomItems.forEach(item => {
                const sectionName = item.main_section_name || 'General';
                const subsectionName = item.sub_section_name || 'General';

                if (!sections[sectionName]) {
                    sections[sectionName] = {};
                }
                if (!sections[sectionName][subsectionName]) {
                    sections[sectionName][subsectionName] = [];
                }

                sections[sectionName][subsectionName].push(item);
            });

            // Create BOM HTML content
            const htmlContent = this.generateBOMHTML(quotation, sections, company);

            // Generate PDF using Puppeteer
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

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="BOM_${quotation.case_number || quotation.quotation_id}.pdf"`);
            res.send(pdfBuffer);

        } catch (error) {
            console.error('Error generating BOM PDF:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating BOM PDF',
                error: error.message
            });
        }
    }

    // Generate BOM HTML template
    generateBOMHTML(quotation, sections, company) {
        const currentDate = new Date().toLocaleDateString('en-IN');

        let sectionsHTML = '';
        Object.keys(sections).forEach(sectionName => {
            sectionsHTML += `
                <div class="section">
                    <h3 class="section-title">${sectionName}</h3>
            `;

            Object.keys(sections[sectionName]).forEach(subsectionName => {
                if (subsectionName !== sectionName) {
                    sectionsHTML += `<h4 class="subsection-title">${subsectionName}</h4>`;
                }

                sectionsHTML += `
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Sr.</th>
                                <th>Product Name</th>
                                <th>Make/Model</th>
                                <th>Part Code</th>
                                <th>HSN</th>
                                <th>Qty</th>
                                <th>Unit</th>
                                <th>Description</th>
                                <th>Rate (₹)</th>
                                <th>Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                sections[sectionName][subsectionName].forEach((item, index) => {
                    sectionsHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>
                                <div class="product-name">${item.product_name || item.item_name}</div>
                            </td>
                            <td>${item.make || ''} ${item.model || ''}</td>
                            <td>${item.part_code || ''}</td>
                            <td>${item.hsn_code || ''}</td>
                            <td>${item.quantity}</td>
                            <td>${item.unit || 'Nos'}</td>
                            <td>${item.description || ''}</td>
                            <td>₹${parseFloat(item.discounted_price || item.total_final_price || 0).toLocaleString('en-IN')}</td>
                            <td>₹${parseFloat((item.quantity * (item.discounted_price || item.total_final_price || 0))).toLocaleString('en-IN')}</td>
                        </tr>
                    `;
                });

                sectionsHTML += `
                        </tbody>
                    </table>
                `;
            });

            sectionsHTML += '</div>';
        });

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Bill of Materials - ${quotation.case_number || quotation.quotation_id}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Arial', sans-serif; font-size: 12px; line-height: 1.4; color: #333; }
                    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                    
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
                    .company-name { font-size: 24px; font-weight: bold; color: #1976d2; margin-bottom: 5px; }
                    .company-tagline { font-size: 14px; color: #666; margin-bottom: 10px; }
                    .document-title { font-size: 20px; font-weight: bold; color: #333; margin-top: 15px; }
                    
                    .bom-info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
                    .info-section h3 { color: #1976d2; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
                    .info-row { display: flex; margin-bottom: 5px; }
                    .info-label { font-weight: bold; width: 120px; }
                    .info-value { flex: 1; }
                    
                    .section { margin-bottom: 30px; }
                    .section-title { background: #1976d2; color: white; padding: 8px 12px; font-size: 14px; margin-bottom: 10px; }
                    .subsection-title { background: #f5f5f5; padding: 6px 10px; font-size: 13px; color: #666; margin-bottom: 8px; }
                    
                    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    .items-table th { background: #f8f9fa; padding: 8px 6px; border: 1px solid #ddd; font-weight: bold; text-align: left; font-size: 11px; }
                    .items-table td { padding: 6px; border: 1px solid #ddd; vertical-align: top; font-size: 10px; }
                    .items-table tr:nth-child(even) { background: #f9f9f9; }
                    
                    .product-name { font-weight: bold; }
                    .product-desc { font-size: 9px; color: #666; font-style: italic; }
                    .stock-available { color: #2e7d32; font-weight: bold; }
                    .stock-unavailable { color: #d32f2f; font-weight: bold; }
                    
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #666; }
                    
                    @media print {
                        .container { padding: 10px; }
                        body { font-size: 11px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="company-name">${company.company_name || 'VTRIA Engineering Solutions Pvt Ltd'}</div>
                        <div class="company-tagline">${company.tagline || 'Engineering Excellence in Motion'}</div>
                        <div class="document-title">BILL OF MATERIALS (BOM)</div>
                    </div>
                    
                    <div class="bom-info">
                        <div class="info-section">
                            <h3>Project Information</h3>
                            <div class="info-row">
                                <span class="info-label">Case Number:</span>
                                <span class="info-value">${quotation.case_number || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Project Name:</span>
                                <span class="info-value">${quotation.project_name || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Quotation No:</span>
                                <span class="info-value">${quotation.quotation_id}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">BOM Date:</span>
                                <span class="info-value">${currentDate}</span>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h3>Client Information</h3>
                            <div class="info-row">
                                <span class="info-label">Company:</span>
                                <span class="info-value">${quotation.client_name}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Contact Person:</span>
                                <span class="info-value">${quotation.contact_person || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Location:</span>
                                <span class="info-value">${quotation.client_city || 'N/A'}, ${quotation.client_state || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Created By:</span>
                                <span class="info-value">${quotation.created_by_name || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bom-content">
                        ${sectionsHTML}
                    </div>
                    
                    <div class="footer">
                        <p>This Bill of Materials is generated for Case ID: ${quotation.case_number || quotation.quotation_id}</p>
                        <p>Generated on ${currentDate} | VTRIA Engineering Solutions Pvt Ltd</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

}

// Create BOM from approved quotation (standalone function)
async function createBOMFromQuotation(connection, quotationId, userId) {
    try {
        // Get quotation and estimation details
        const [quotationData] = await connection.execute(`
                SELECT q.*, e.estimation_id as estimation_number, c.case_number, c.project_name
                FROM quotations q
                INNER JOIN estimations e ON q.estimation_id = e.id
                INNER JOIN cases c ON q.case_id = c.id
                WHERE q.id = ?
            `, [quotationId]);

        if (quotationData.length === 0) {
            return { success: false, message: 'Quotation not found' };
        }

        const quotation = quotationData[0];
        const estimationId = quotation.estimation_id;

        // Generate BOM number
        const bomNumber = `BOM/${new Date().getFullYear()}/${quotation.case_number.replace(/\//g, '-')}`;

        // Get estimation items
        const [estimationItems] = await connection.execute(`
                SELECT 
                    ei.*,
                    p.name as product_name,
                    p.part_code,
                    p.make,
                    p.model,
                    es.heading as section_name,
                    ess.subsection_name
                FROM estimation_items ei
                LEFT JOIN products p ON ei.product_id = p.id
                LEFT JOIN estimation_sections es ON ei.section_id = es.id
                LEFT JOIN estimation_subsections ess ON ei.subsection_id = ess.id
                WHERE ei.estimation_id = ?
                ORDER BY es.sort_order, ess.subsection_order, ei.id
            `, [estimationId]);

        if (estimationItems.length === 0) {
            return { success: false, message: 'No estimation items found' };
        }

        // Calculate total material cost
        const totalMaterialCost = estimationItems.reduce((sum, item) =>
            sum + (parseFloat(item.final_price) || 0), 0);

        // Create or get production item for this case
        let productionItemId;
        const [existingProdItem] = await connection.execute(`
                SELECT id FROM production_items WHERE item_code = ?
            `, [`CASE-${quotation.case_id}`]);

        if (existingProdItem.length > 0) {
            productionItemId = existingProdItem[0].id;
        } else {
            // Create production item for this case
            const [prodItemResult] = await connection.execute(`
                    INSERT INTO production_items (
                        item_code, item_name, description, standard_cost, created_by
                    ) VALUES (?, ?, ?, ?, ?)
                `, [
                `CASE-${quotation.case_id}`,
                `${quotation.project_name} Assembly`,
                `Production item for case ${quotation.case_number}`,
                totalMaterialCost,
                userId
            ]);
            productionItemId = prodItemResult.insertId;
        }

        // Create BOM header
        const [bomHeader] = await connection.execute(`
                INSERT INTO bom_headers (
                    bom_number,
                    production_item_id,
                    version,
                    description,
                    quantity_per_unit,
                    material_cost,
                    labor_cost,
                    overhead_cost,
                    status,
                    effective_from,
                    is_current_version,
                    created_by,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
            bomNumber,
            productionItemId, // Using the created/existing production item ID
            '1.0',
            `BOM for ${quotation.project_name} (Case: ${quotation.case_number})`,
            1,
            totalMaterialCost,
            0, // Labor cost can be calculated later
            0, // Overhead cost can be calculated later
            'active',
            new Date().toISOString().split('T')[0],
            1,
            userId
        ]);

        const bomHeaderId = bomHeader.insertId;

        // Create BOM components from estimation items
        let lineNumber = 1;
        for (const item of estimationItems) {
            await connection.execute(`
                    INSERT INTO bom_components (
                        bom_header_id,
                        line_number,
                        component_type,
                        component_id,
                        component_code,
                        component_name,
                        quantity_required,
                        unit_cost,
                        notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                bomHeaderId,
                lineNumber++,
                'purchased_part',
                item.product_id || 0,
                item.part_code || `ITEM-${item.id}`,
                item.product_name || 'Unknown Item',
                item.quantity || 1,
                item.unit_price || 0,
                `From estimation: ${item.section_name}/${item.subsection_name}`
            ]);
        }

        // Update quotation with BOM reference
        await connection.execute(`
                UPDATE quotations SET bom_header_id = ? WHERE id = ?
            `, [bomHeaderId, quotationId]);

        return {
            success: true,
            message: 'BOM created successfully',
            data: {
                bom_header_id: bomHeaderId,
                bom_number: bomNumber,
                total_components: estimationItems.length,
                material_cost: totalMaterialCost
            }
        };

    } catch (error) {
        console.error('Error creating BOM from quotation:', error);
        return { success: false, message: 'Failed to create BOM', error: error.message };
    }
}

module.exports = new QuotationEnhancedController();
