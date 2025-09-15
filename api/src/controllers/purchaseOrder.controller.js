const purchaseOrderService = require('../services/purchaseOrder.service');
const PDFGenerator = require('../utils/pdfGenerator');
const { BaseError } = require('../utils/errors');
const logger = require('../utils/logger');
const db = require('../config/database');
const path = require('path');

exports.createPurchaseOrder = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { 
            purchase_request_id,
            supplier_id,
            delivery_date,
            shipping_address,
            billing_address,
            payment_terms,
            delivery_terms,
            notes,
            items
        } = req.body;
        
        // Generate purchase order ID (VESPL/PO/2526/XXX)
        const financialYear = DocumentNumberGenerator.getCurrentFinancialYear();
        const poId = await DocumentNumberGenerator.generateNumber('PO', financialYear);
        
        // Calculate totals
        let totalAmount = 0;
        let totalTax = 0;
        
        // Get supplier details for tax calculation
        const [supplier] = await connection.execute(
            'SELECT state FROM suppliers WHERE id = ?',
            [supplier_id]
        );
        
        const isInterState = supplier[0].state !== 'Karnataka';
        
        // Create purchase order
        const [po] = await connection.execute(
            `INSERT INTO purchase_orders 
            (po_id, purchase_request_id, supplier_id, date, delivery_date,
             shipping_address, billing_address, payment_terms, delivery_terms,
             total_amount, total_tax, grand_total, notes, created_by) 
            VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                poId,
                purchase_request_id,
                supplier_id,
                delivery_date,
                shipping_address,
                billing_address,
                payment_terms,
                delivery_terms,
                0, // Will update after adding items
                0, // Will update after adding items
                0, // Will update after adding items
                notes,
                req.user.id
            ]
        );
        
        // Add items
        for (const item of items) {
            const amount = item.quantity * item.price;
            const taxPercentage = isInterState ? 18 : 9; // Example: 18% IGST or 9% each for CGST/SGST
            const taxAmount = (amount * taxPercentage) / 100;
            
            totalAmount += amount;
            totalTax += taxAmount;
            
            await connection.execute(
                `INSERT INTO purchase_order_items 
                (po_id, product_id, quantity, unit, price, tax_percentage, amount) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    po.insertId,
                    item.product_id,
                    item.quantity,
                    item.unit,
                    item.price,
                    taxPercentage,
                    amount
                ]
            );
        }
        
        // Update purchase order totals
        const grandTotal = totalAmount + totalTax;
        await connection.execute(
            `UPDATE purchase_orders 
             SET total_amount = ?, total_tax = ?, grand_total = ?
             WHERE id = ?`,
            [totalAmount, totalTax, grandTotal, po.insertId]
        );
        
        // Update purchase request status
        await connection.execute(
            `UPDATE purchase_requests SET status = 'closed' WHERE id = ?`,
            [purchase_request_id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['purchase_order', po.insertId, 'draft', 'Purchase order created', req.user.id]
        );
        
        // Generate proforma invoice ID (VESPL/PI/2526/XXX)
        const piId = await DocumentNumberGenerator.generateNumber('PI', financialYear);
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Purchase order created successfully',
            data: { 
                id: po.insertId,
                po_id: poId,
                pi_id: piId,
                total_amount: totalAmount,
                total_tax: totalTax,
                grand_total: grandTotal
            }
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error creating purchase order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.getPurchaseOrder = async (req, res) => {
    try {
        // Get PO details
        const [po] = await db.execute(
            `SELECT po.*, 
                    pr.request_id as pr_reference,
                    s.company_name as supplier_name,
                    s.contact_person as supplier_contact,
                    s.address as supplier_address,
                    s.gstin as supplier_gstin,
                    u1.full_name as created_by_name,
                    u2.full_name as approved_by_name
             FROM purchase_orders po
             JOIN purchase_requests pr ON po.purchase_request_id = pr.id
             JOIN suppliers s ON po.supplier_id = s.id
             JOIN users u1 ON po.created_by = u1.id
             LEFT JOIN users u2 ON po.approved_by = u2.id
             WHERE po.id = ?`,
            [req.params.id]
        );
        
        if (po.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }
        
        // Get PO items
        const [items] = await db.execute(
            `SELECT poi.*, 
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.specifications
             FROM purchase_order_items poi
             JOIN products p ON poi.product_id = p.id
             WHERE poi.po_id = ?`,
            [req.params.id]
        );
        
        // Get case history
        const [history] = await db.execute(
            `SELECT ch.*, u.full_name as created_by_name
             FROM case_history ch
             JOIN users u ON ch.created_by = u.id
             WHERE ch.reference_type = 'purchase_order' 
             AND ch.reference_id = ?
             ORDER BY ch.created_at DESC`,
            [req.params.id]
        );
        
        res.json({
            success: true,
            data: {
                purchase_order: po[0],
                items,
                history
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching purchase order',
            error: error.message
        });
    }
};

exports.approvePurchaseOrder = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // Verify user role is director or admin
        if (!['director', 'admin'].includes(req.user.role)) {
            throw new Error('Unauthorized to approve purchase orders');
        }
        
        // Update PO status
        await connection.execute(
            `UPDATE purchase_orders 
             SET status = 'approved',
                 approved_by = ?,
                 approved_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [req.user.id, id]
        );
        
        // Create case history entry
        await connection.execute(
            `INSERT INTO case_history 
            (reference_type, reference_id, status, notes, created_by) 
            VALUES (?, ?, ?, ?, ?)`,
            ['purchase_order', id, 'approved', 'Purchase order approved', req.user.id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Purchase order approved successfully'
        });
        
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: 'Error approving purchase order',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.generatePDF = async (req, res) => {
    try {
        const { id, type = 'po' } = req.params; // type can be 'po' or 'pi'
        
        // Get PO details
        const [po] = await db.execute(
            `SELECT po.*, 
                    pr.request_id as pr_reference,
                    s.company_name as supplier_name,
                    s.contact_person as supplier_contact,
                    s.address as supplier_address,
                    s.gstin as supplier_gstin,
                    s.bank_name,
                    s.account_number,
                    s.ifsc_code
             FROM purchase_orders po
             JOIN purchase_requests pr ON po.purchase_request_id = pr.id
             JOIN suppliers s ON po.supplier_id = s.id
             WHERE po.id = ?`,
            [id]
        );
        
        if (!po[0]) {
            return res.status(404).json({
                success: false,
                message: 'Purchase order not found'
            });
        }
        
        // Get PO items
        const [items] = await db.execute(
            `SELECT poi.*, 
                    p.name as product_name,
                    p.make,
                    p.model,
                    p.part_code,
                    p.specifications
             FROM purchase_order_items poi
             JOIN products p ON poi.product_id = p.id
             WHERE poi.po_id = ?`,
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
            type === 'po' ? 'PURCHASE ORDER' : 'PROFORMA INVOICE',
            type === 'po' ? po[0].po_id : po[0].pi_id,
            po[0].date
        );
        
        // Add supplier details
        pdf.doc
            .fontSize(10)
            .text('To:', 50, 200)
            .text(po[0].supplier_name, 50, 215)
            .text(po[0].supplier_address, 50, 230)
            .text(`GSTIN: ${po[0].supplier_gstin}`, 50, 260)
            .text(`Contact: ${po[0].supplier_contact}`, 50, 275);
        
        // Add reference information
        pdf.doc
            .text(`Ref: ${po[0].pr_reference}`, 350, 200)
            .text(`Delivery Date: ${po[0].delivery_date}`, 350, 215);
        
        // Add items table
        const headers = ['Sr No', 'Item', 'Specifications', 'Qty', 'Unit', 'Rate', 'Tax %', 'Amount'];
        const tableData = items.map((item, index) => [
            index + 1,
            `${item.product_name}\n${item.make}/${item.model}\n${item.part_code}`,
            item.specifications,
            item.quantity,
            item.unit,
            item.price.toFixed(2),
            item.tax_percentage,
            item.amount.toFixed(2)
        ]);
        
        await pdf.generateTable(headers, tableData, 300);
        
        // Add totals
        pdf.doc
            .fontSize(10)
            .text('Sub Total:', 400, pdf.doc.y + 20)
            .text(po[0].total_amount.toFixed(2), 480, pdf.doc.y - 12)
            .text('Tax:', 400, pdf.doc.y + 5)
            .text(po[0].total_tax.toFixed(2), 480, pdf.doc.y - 12)
            .text('Grand Total:', 400, pdf.doc.y + 5)
            .text(po[0].grand_total.toFixed(2), 480, pdf.doc.y - 12);
        
        // Add terms
        if (type === 'pi') {
            pdf.doc
                .addPage()
                .fontSize(12)
                .text('Bank Details:', 50, 50)
                .fontSize(10)
                .text(`Bank Name: ${po[0].bank_name}`, 50, 70)
                .text(`Account Number: ${po[0].account_number}`, 50, 85)
                .text(`IFSC Code: ${po[0].ifsc_code}`, 50, 100);
        }
        
        pdf.doc
            .fontSize(12)
            .text('Terms and Conditions:', 50, pdf.doc.y + 20)
            .fontSize(10)
            .text('Payment Terms:', 50, pdf.doc.y + 10)
            .text(po[0].payment_terms, 70, pdf.doc.y)
            .text('Delivery Terms:', 50, pdf.doc.y + 10)
            .text(po[0].delivery_terms, 70, pdf.doc.y);
        
        // Save PDF
        const folder = type === 'po' ? 'purchase_orders' : 'proforma_invoices';
        const fileName = type === 'po' ? po[0].po_id : po[0].pi_id;
        const pdfPath = path.join(__dirname, `../../uploads/documents/${folder}/${fileName}.pdf`);
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
