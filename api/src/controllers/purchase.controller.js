const db = require('../config/database');
const DocumentNumberGenerator = require('../utils/documentNumberGenerator');
const PDFGenerator = require('../utils/pdfGenerator');
const path = require('path');

exports.createPurchaseRequest = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            quotation_id,
            required_by,
            notes
        } = req.body;
        
        // Generate purchase request ID (VESPL/PR/2526/XXX)
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const requestId = await DocumentNumberGenerator.generateNumber('PR', financialYear);
        
        // Get BOM items from quotation
        const [bom] = await connection.execute(
            `SELECT b.*, bi.*, p.name as product_name, p.specifications
             FROM bill_of_materials b
             JOIN bom_items bi ON b.id = bi.bom_id
             JOIN products p ON bi.product_id = p.id
             WHERE b.quotation_id = ?`,
            [quotation_id]
        );
        
        if (bom.length === 0) {
            throw new Error('No BOM found for this quotation');
        }
        
        // Insert purchase request
        const [request] = await connection.execute(
            `INSERT INTO purchase_requests 
            (request_id, quotation_id, date, required_by, notes, created_by) 
            VALUES (?, ?, CURDATE(), ?, ?, ?)`,
            [requestId, quotation_id, required_by, notes, req.user.id]
        );
        
        // Insert items from BOM
        for (const item of bom) {
            await connection.execute(
                `INSERT INTO purchase_request_items 
                (request_id, product_id, quantity, unit, specifications) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    request.insertId,
                    item.product_id,
                    item.quantity,
                    item.unit,
                    item.specifications
                ]
            );
        }
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['purchase_request', request.insertId, 'draft', 'Purchase request created', req.user.id]
        );
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Purchase request created successfully',
            data: { 
                id: request.insertId,
                request_id: requestId
            }
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error creating purchase request',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getPurchaseRequest = async (req, res) => {
    try {
        // Get request details
        const [request] = await db.execute(
            `SELECT pr.*, 
                    q.quotation_id as quotation_reference,
                    u.full_name as created_by_name
             FROM purchase_requests pr
             JOIN quotations q ON pr.quotation_id = q.id
             JOIN users u ON pr.created_by = u.id
             WHERE pr.id = ?`,
            [req.params.id]
        );
        
        if (request.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase request not found'
            });
        }
        
        // Get request items with supplier responses
        const [items] = await db.execute(
            `SELECT pri.*, 
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    s.company_name as supplier_name
             FROM purchase_request_items pri
             JOIN products p ON pri.product_id = p.id
             LEFT JOIN suppliers s ON pri.supplier_id = s.id
             WHERE pri.request_id = ?`,
            [req.params.id]
        );
        
        // Get case history
        const [history] = await db.execute(
            `SELECT ch.*, u.full_name as created_by_name
             FROM case_history ch
             JOIN users u ON ch.created_by = u.id
             WHERE ch.reference_type = 'purchase_request' 
             AND ch.reference_id = ?
             ORDER BY ch.created_at DESC`,
            [req.params.id]
        );
        
        res.json({
            success: true,
            data: {
                request: request[0],
                items,
                history
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching purchase request',
            error: error.message
        });
    }
};

exports.updateSupplierResponse = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { items } = req.body;
        const { id } = req.params;
        
        for (const item of items) {
            await connection.execute(
                `UPDATE purchase_request_items 
                 SET supplier_id = ?,
                     quoted_price = ?,
                     quoted_delivery_time = ?,
                     response_notes = ?,
                     response_date = CURDATE()
                 WHERE id = ? AND request_id = ?`,
                [
                    item.supplier_id,
                    item.quoted_price,
                    item.quoted_delivery_time,
                    item.response_notes,
                    item.id,
                    id
                ]
            );
        }
        
        // Update request status
        await connection.execute(
            `UPDATE purchase_requests 
             SET status = 'response_received'
             WHERE id = ?`,
            [id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            [
                'purchase_request',
                id,
                'response_received',
                'Supplier responses updated',
                req.user.id
            ]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Supplier responses updated successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error updating supplier responses',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.generatePDF = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get request details with all related information
        const [request] = await db.execute(
            `SELECT pr.*, 
                    q.quotation_id as quotation_reference,
                    u.full_name as created_by_name
             FROM purchase_requests pr
             JOIN quotations q ON pr.quotation_id = q.id
             JOIN users u ON pr.created_by = u.id
             WHERE pr.id = ?`,
            [id]
        );
        
        if (!request[0]) {
            return res.status(404).json({
                success: false,
                message: 'Purchase request not found'
            });
        }
        
        // Get request items
        const [items] = await db.execute(
            `SELECT pri.*, 
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.specifications
             FROM purchase_request_items pri
             JOIN products p ON pri.product_id = p.id
             WHERE pri.request_id = ?`,
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
            'PURCHASE ENQUIRY',
            request[0].request_id,
            request[0].date
        );
        
        // Add reference information
        pdf.doc
            .fontSize(10)
            .text(`Ref: ${request[0].quotation_reference}`, 50, 200)
            .text(`Required By: ${request[0].required_by}`, 50, 215);
        
        // Add items table
        const headers = ['Sr No', 'Item', 'Specifications', 'Make/Model', 'Part Code', 'Qty', 'Unit'];
        const tableData = items.map((item, index) => [
            index + 1,
            item.product_name,
            item.specifications,
            `${item.make}/${item.model}`,
            item.part_code,
            item.quantity,
            item.unit
        ]);
        
        await pdf.generateTable(headers, tableData, 250);
        
        // Add notes if any
        if (request[0].notes) {
            pdf.doc
                .fontSize(10)
                .text('Notes:', 50, pdf.doc.y + 20)
                .text(request[0].notes, 50, pdf.doc.y + 10);
        }
        
        // Add response section
        pdf.doc
            .fontSize(10)
            .text('Please provide your best quotation for the above items with the following details:', 50, pdf.doc.y + 30)
            .text('1. Unit Price', 70, pdf.doc.y + 10)
            .text('2. Applicable Taxes', 70, pdf.doc.y + 10)
            .text('3. Delivery Timeline', 70, pdf.doc.y + 10)
            .text('4. Payment Terms', 70, pdf.doc.y + 10)
            .text('5. Warranty/Guarantee Terms', 70, pdf.doc.y + 10);
        
        // Save PDF
        const pdfPath = path.join(__dirname, `../../uploads/documents/purchase_requests/${request[0].request_id}.pdf`);
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
