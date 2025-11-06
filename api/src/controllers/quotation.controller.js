const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');
const PDFGenerator = require('../utils/pdfGenerator');
const path = require('path');
const { validationResult } = require('express-validator');

// Get all quotations with related information
exports.getAllQuotations = async (req, res) => {
    try {
        // Get created quotations
        const quotationsQuery = `
            SELECT 
                'quotation' as record_type,
                q.id,
                q.quotation_id,
                q.estimation_id AS estimation_fk_id,
                e.estimation_id AS estimation_code,
                e.total_mrp,
                e.total_final_price,
                (
                    SELECT 
                        CASE 
                            WHEN SUM(qi.amount) > 0 AND SUM(COALESCE(p.cost_price, p.last_purchase_price, 0) * qi.quantity) > 0
                                THEN ROUND( ( (SUM(qi.amount) - SUM(COALESCE(p.cost_price, p.last_purchase_price, 0) * qi.quantity)) / SUM(COALESCE(p.cost_price, p.last_purchase_price, 0) * qi.quantity) ) * 100, 2)
                            ELSE 0
                        END
                    FROM quotation_items qi
                    LEFT JOIN products p ON qi.item_name = p.name
                    WHERE qi.quotation_id = q.id
                ) AS profit_percentage_calculated,
                se.enquiry_id,
                se.project_name,
                c.company_name as client_name,
                c.city,
                c.state,
                u.full_name as created_by_name,
                au.full_name as approved_by_name,
                cases.case_number,
                q.status,
                q.date,
                q.created_at,
                q.valid_until,
                'Created Quotation' as workflow_status
            FROM quotations q
            LEFT JOIN estimations e ON q.estimation_id = e.id
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users u ON q.created_by = u.id
            LEFT JOIN users au ON q.approved_by = au.id
            LEFT JOIN cases ON e.case_id = cases.id
            WHERE q.deleted_at IS NULL AND e.status = 'approved'
        `;

        // Get approved estimations available for quotation creation
        const availableEstimationsQuery = `
            SELECT 
                'available_estimation' as record_type,
                e.id,
                NULL as quotation_id,
                e.id AS estimation_fk_id,
                e.estimation_id AS estimation_code,
                e.total_mrp,
                e.total_final_price,
                (
                    SELECT 
                        CASE 
                            WHEN SUM(ei.final_price * ei.quantity) > 0 AND SUM(COALESCE(p.cost_price, p.last_purchase_price, 0) * ei.quantity) > 0
                                THEN ROUND( ( (SUM(ei.final_price * ei.quantity) - SUM(COALESCE(p.cost_price, p.last_purchase_price, 0) * ei.quantity)) / SUM(COALESCE(p.cost_price, p.last_purchase_price, 0) * ei.quantity) ) * 100, 2)
                            ELSE 0
                        END
                    FROM estimation_items ei
                    LEFT JOIN products p ON ei.product_id = p.id
                    WHERE ei.estimation_id = e.id
                ) AS profit_percentage_calculated,
                se.enquiry_id,
                se.project_name,
                c.company_name as client_name,
                c.city,
                c.state,
                ue.full_name as created_by_name,
                ua.full_name as approved_by_name,
                cases.case_number,
                e.status,
                e.date,
                e.approved_at as created_at,
                NULL as valid_until,
                'Ready for Quotation' as workflow_status
            FROM estimations e
            JOIN sales_enquiries se ON e.enquiry_id = se.id
            JOIN clients c ON se.client_id = c.id
            LEFT JOIN users ue ON e.created_by = ue.id
            LEFT JOIN users ua ON e.approved_by = ua.id
            LEFT JOIN cases ON e.case_id = cases.id
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
};

exports.createQuotation = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { estimation_id } = req.body;

        // Check if estimation exists and is approved
        const [estimation] = await connection.query(
            'SELECT e.* FROM estimations e WHERE e.id = ? AND e.status = \'approved\'',
            [estimation_id]
        );

        if (!estimation[0]) {
            throw new Error('Approved estimation not found');
        }

        // Check if quotation already exists for this estimation
        const [existing] = await connection.query(
            'SELECT id FROM quotations WHERE estimation_id = ?',
            [estimation_id]
        );

        if (existing[0]) {
            throw new Error('Quotation already exists for this estimation');
        }

        await connection.beginTransaction();

        // Generate quotation ID
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const quotationId = await DocumentNumberGenerator.generateNumber('Q', financialYear);

        // Insert quotation
        const [quotation] = await connection.execute(
            `INSERT INTO quotations 
            (quotation_id, estimation_id, date, valid_until, 
             terms_conditions, delivery_terms, payment_terms, warranty_terms,
             total_amount, total_tax, grand_total, status, created_by) 
            VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 
             'Standard terms and conditions apply', '4-6 weeks from approval', 
             '30% advance, 70% on delivery', '12 months warranty from date of installation',
             0, 0, 0, 'draft', ?)`,
            [
                quotationId,
                estimation_id,
                req.user.id
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Quotation created successfully',
            data: {
                id: quotation.insertId,
                quotation_id: quotationId
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
};

exports.getQuotation = async (req, res) => {
    try {
        // Get quotation details
        const [quotation] = await db.execute(
            `SELECT q.*, 
                    e.enquiry_id as estimation_reference,
                    se.project_name,
                    c.company_name as client_name,
                    c.contact_person as client_contact,
                    c.address as client_address,
                    c.gstin as client_gstin,
                    u1.full_name as created_by_name,
                    u2.full_name as approved_by_name
             FROM quotations q
             JOIN estimations e ON q.estimation_id = e.id
             JOIN sales_enquiries se ON e.enquiry_id = se.id
             JOIN clients c ON se.client_id = c.id
             JOIN users u1 ON q.created_by = u1.id
             LEFT JOIN users u2 ON q.approved_by = u2.id
             WHERE q.id = ?`,
            [req.params.id]
        );

        if (quotation.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        // Get quotation items
        const [items] = await db.execute(
            'SELECT * FROM quotation_items WHERE quotation_id = ?',
            [req.params.id]
        );

        // Get BOM details
        const [bom] = await db.execute(
            `SELECT b.*, bi.*, p.name as product_name, p.make, p.model, p.part_code
             FROM bill_of_materials b
             JOIN bom_items bi ON b.id = bi.bom_id
             JOIN products p ON bi.product_id = p.id
             WHERE b.quotation_id = ?`,
            [req.params.id]
        );

        // Get case history
        const [history] = await db.execute(
            `SELECT ch.*, u.full_name as created_by_name
             FROM case_history ch
             JOIN users u ON ch.created_by = u.id
             WHERE ch.reference_type = 'quotation' 
             AND ch.reference_id = ?
             ORDER BY ch.created_at DESC`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                quotation: quotation[0],
                items,
                bom,
                history
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching quotation',
            error: error.message
        });
    }
};

exports.submitForApproval = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Check profit percentage
        const [quotation] = await connection.execute(
            'SELECT profit_percentage FROM quotations WHERE id = ?',
            [id]
        );

        if (quotation[0].profit_percentage < 10) {
            // Special note in case history for low profit
            await connection.execute(
                `INSERT INTO case_history 
                (reference_type, reference_id, status, notes, created_by) 
                VALUES (?, ?, ?, ?, ?)`,
                ['quotation', id, 'warning', 'Submitted for approval with profit percentage below 10%', req.user.id]
            );
        }

        // Update quotation status
        await connection.execute(
            `UPDATE quotations 
             SET status = 'pending_approval' 
             WHERE id = ?`,
            [id]
        );

        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['quotation', id, 'pending_approval', 'Submitted for approval', req.user.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Quotation submitted for approval successfully'
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error submitting quotation for approval',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.approve = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Verify user role is director or admin
        if (!['director', 'admin'].includes(req.user.role)) {
            throw new Error('Unauthorized to approve quotations');
        }

        // Update quotation status
        await connection.execute(
            `UPDATE quotations 
             SET status = 'approved',
                 approved_by = ?,
                 approved_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [req.user.id, id]
        );

        // Get the case_id from the quotation to update case state
        const [quotationData] = await connection.execute(
            'SELECT case_id FROM quotations WHERE id = ?',
            [id]
        );

        if (quotationData[0]?.case_id) {
            // Update case current_state to 'quotation' when quotation is approved
            await connection.execute(
                `UPDATE cases 
                 SET current_state = 'quotation', updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`,
                [quotationData[0].case_id]
            );

            // Create case state transition history
            await connection.execute(
                `INSERT INTO case_state_transitions 
                (case_id, from_state, to_state, notes, created_by) 
                VALUES (?, ?, ?, ?, ?)`,
                [quotationData[0].case_id, 'estimation', 'quotation', 'Quotation approved - case moved to quotation stage', req.user.id]
            );
        }

        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['quotation', id, 'approved', 'Quotation approved', req.user.id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Quotation approved successfully'
        });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error approving quotation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.generatePDF = async (req, res) => {
    try {
        const { id } = req.params;

        // Get quotation details with all related information
        const [quotation] = await db.execute(
            `SELECT q.*, 
                    e.enquiry_id as estimation_reference,
                    se.project_name,
                    c.company_name as client_name,
                    c.contact_person as client_contact,
                    c.address as client_address,
                    c.gstin as client_gstin
             FROM quotations q
             JOIN estimations e ON q.estimation_id = e.id
             JOIN sales_enquiries se ON e.enquiry_id = se.id
             JOIN clients c ON se.client_id = c.id
             WHERE q.id = ?`,
            [id]
        );

        if (!quotation[0]) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        // Get quotation items
        const [items] = await db.execute(
            'SELECT * FROM quotation_items WHERE quotation_id = ?',
            [id]
        );

        // Initialize PDF generator
        const pdf = new PDFGenerator();

        // Generate PDF
        await pdf.generateHeader({
            logo: path.join(__dirname, '../../public/assets/logo.png'),
            address: 'Your Company Address',
            phone: 'Phone Number',
            email: 'email@company.com',
            gstin: 'GSTIN Number'
        });

        await pdf.generateDocumentTitle(
            'QUOTATION',
            quotation[0].quotation_id,
            quotation[0].date
        );

        // Add client details
        pdf.doc
            .fontSize(10)
            .text('To:', 50, 200)
            .text(quotation[0].client_name, 50, 215)
            .text(quotation[0].client_address, 50, 230)
            .text(`GSTIN: ${quotation[0].client_gstin}`, 50, 260);

        // Add items table
        const headers = ['Sr No', 'Item', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Amount'];
        const tableData = items.map((item, index) => [
            index + 1,
            item.item_name,
            item.hsn_code,
            item.quantity,
            item.unit,
            item.rate.toFixed(2),
            item.amount.toFixed(2)
        ]);

        await pdf.generateTable(headers, tableData, 300);

        // Add terms and conditions
        pdf.doc
            .addPage()
            .fontSize(12)
            .text('Terms and Conditions:', 50, 50)
            .fontSize(10)
            .text(quotation[0].terms_conditions, 50, 70);

        // Save PDF
        const pdfPath = path.join(__dirname, `../../uploads/documents/quotations/${quotation[0].quotation_id}.pdf`);
        await pdf.savePDF(pdfPath);

        res.json({
            success: true,
            message: 'PDF generated successfully',
            data: {
                path: pdfPath
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error generating PDF',
            error: error.message
        });
    }
};

// Get available estimations for quotation creation (approved estimations without existing quotations)
exports.getAvailableEstimations = async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id,
                e.estimation_id,
                se.project_name,
                e.total_final_price,
                e.created_at,
                se.enquiry_id,
                c.company_name as client_name,
                c.city,
                c.state
            FROM estimations e
            JOIN sales_enquiries se ON e.enquiry_id = se.id
            JOIN clients c ON se.client_id = c.id
            LEFT JOIN quotations q ON e.id = q.estimation_id
            WHERE e.status = 'approved' 
            AND q.id IS NULL
            AND se.status != 'closed'
            ORDER BY e.created_at DESC
        `;

        const [estimations] = await db.execute(query);

        res.json({
            success: true,
            data: estimations,
            count: estimations.length
        });
    } catch (error) {
        console.error('Error fetching available estimations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available estimations',
            error: error.message
        });
    }
};

// Delete quotation
exports.deleteQuotation = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;

        // Check if quotation exists and get details
        const [quotation] = await connection.execute(
            'SELECT * FROM quotations WHERE id = ?',
            [id]
        );

        if (!quotation[0]) {
            return res.status(404).json({
                success: false,
                message: 'Quotation not found'
            });
        }

        // Check if quotation can be deleted (only draft or pending_approval status)
        if (!['draft', 'pending_approval'].includes(quotation[0].status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete approved or sent quotations'
            });
        }

        // Delete quotation items first
        await connection.execute(
            'DELETE FROM quotation_items WHERE quotation_id = ?',
            [id]
        );

        // Delete related BOM if exists
        const [bom] = await connection.execute(
            'SELECT id FROM bill_of_materials WHERE quotation_id = ?',
            [id]
        );

        if (bom[0]) {
            await connection.execute(
                'DELETE FROM bom_items WHERE bom_id = ?',
                [bom[0].id]
            );

            await connection.execute(
                'DELETE FROM bill_of_materials WHERE quotation_id = ?',
                [id]
            );
        }

        // Delete case history entries
        await connection.execute(
            'DELETE FROM case_history WHERE reference_type = ? AND reference_id = ?',
            ['quotation', id]
        );

        // Delete the quotation
        await connection.execute(
            'DELETE FROM quotations WHERE id = ?',
            [id]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Quotation deleted successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error deleting quotation:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting quotation',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Update quotation status
exports.updateStatus = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const { status } = req.body;
        const updated_by = req.user.id;

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

        // Log status change (create table if doesn't exist)
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
};

// Get quotation by case number
exports.getQuotationByCase = async (req, res) => {
    try {
        const { caseNumber } = req.params;

        const query = `
            SELECT 
                q.*,
                e.estimation_id,
                se.enquiry_id,
                se.project_name,
                c.company_name as client_name,
                c.city,
                c.state,
                u.full_name as created_by_name,
                au.full_name as approved_by_name,
                cases.case_number
            FROM quotations q
            LEFT JOIN estimations e ON q.estimation_id = e.id
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id
            LEFT JOIN users u ON q.created_by = u.id
            LEFT JOIN users au ON q.approved_by = au.id
            LEFT JOIN cases ON e.case_id = cases.id
            WHERE cases.case_number = ?
            ORDER BY q.created_at DESC
            LIMIT 1
        `;

        const [results] = await db.execute(query, [caseNumber]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No quotation found for case ${caseNumber}`
            });
        }

        res.json({
            success: true,
            data: results[0]
        });

    } catch (error) {
        console.error('Error fetching quotation by case:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching quotation by case number',
            error: error.message
        });
    }
};
