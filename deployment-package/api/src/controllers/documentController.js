const documentGenerator = require('../services/documentGenerator');
const path = require('path');
const fs = require('fs');

exports.generateQuotationPDF = async (req, res) => {
    try {
        const { quotationId } = req.params;
        const outputPath = path.join(__dirname, '../../documents/quotations', `quotation_${quotationId}.pdf`);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Get quotation data (this would typically come from database)
        const quotationData = {
            quotation_id: `VESPL/Q/2526/${quotationId}`,
            date: new Date(),
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            client_name: 'Sample Client',
            client_address: 'Client Address\nCity, State - PIN',
            client_gstin: '29XXXXXXXXXXXXX',
            items: [
                {
                    item_code: 'ITEM001',
                    product_name: 'Sample Product 1',
                    description: 'Product description',
                    hsn_sac: '8542',
                    quantity: 10,
                    unit_price: 1000,
                    discount_percentage: 5,
                    final_price: 950
                }
            ],
            profit_percentage: 15,
            terms_conditions: 'Standard terms apply'
        };

        await documentGenerator.generatePDF(quotationData, 'quotation', outputPath);

        res.json({
            success: true,
            message: 'Quotation PDF generated successfully',
            file_path: outputPath
        });

    } catch (error) {
        console.error('Error generating quotation PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating quotation PDF',
            error: error.message
        });
    }
};

exports.generateInvoicePDF = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const outputPath = path.join(__dirname, '../../documents/invoices', `invoice_${invoiceId}.pdf`);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Get invoice data
        const invoiceData = {
            invoice_number: `VESPL/I/2526/${invoiceId}`,
            invoice_date: new Date(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            customer_name: 'Sample Customer',
            customer_address: 'Customer Address\nCity, State - PIN',
            customer_gstin: '29XXXXXXXXXXXXX',
            shipping_address: 'Shipping Address\nCity, State - PIN',
            items: [
                {
                    item_code: 'ITEM001',
                    product_name: 'Sample Product',
                    description: 'Product description',
                    hsn_sac: '8542',
                    quantity: 5,
                    unit_price: 1000,
                    discount_percentage: 0,
                    final_price: 1000
                }
            ],
            payment_terms: 'Net 30',
            payment_status: 'Unpaid'
        };

        await documentGenerator.generatePDF(invoiceData, 'invoice', outputPath);

        res.json({
            success: true,
            message: 'Invoice PDF generated successfully',
            file_path: outputPath
        });

    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating invoice PDF',
            error: error.message
        });
    }
};

exports.generateDeliveryChallanPDF = async (req, res) => {
    try {
        const { dcId } = req.params;
        const outputPath = path.join(__dirname, '../../documents/delivery_challans', `dc_${dcId}.pdf`);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Get delivery challan data
        const dcData = {
            dc_number: `VESPL/DC/2526/${dcId}`,
            dc_date: new Date(),
            delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            customer_name: 'Sample Customer',
            shipping_address: 'Shipping Address\nCity, State - PIN',
            customer_gstin: '29XXXXXXXXXXXXX',
            vehicle_number: 'KA-XX-XXXX',
            driver_name: 'John Doe',
            driver_contact: '+91-XXXXXXXXXX',
            items: [
                {
                    item_code: 'ITEM001',
                    product_name: 'Sample Product',
                    description: 'Product description',
                    quantity: 5,
                    unit: 'Nos',
                    serial_numbers: 'SN001,SN002,SN003,SN004,SN005'
                }
            ]
        };

        await documentGenerator.generatePDF(dcData, 'delivery_challan', outputPath);

        res.json({
            success: true,
            message: 'Delivery Challan PDF generated successfully',
            file_path: outputPath
        });

    } catch (error) {
        console.error('Error generating delivery challan PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating delivery challan PDF',
            error: error.message
        });
    }
};

exports.generatePurchaseOrderPDF = async (req, res) => {
    try {
        const { poId } = req.params;
        const outputPath = path.join(__dirname, '../../documents/purchase_orders', `po_${poId}.pdf`);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Get purchase order data
        const poData = {
            po_id: `VESPL/PO/2526/${poId}`,
            date: new Date(),
            delivery_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            supplier_name: 'Sample Supplier',
            supplier_address: 'Supplier Address\nCity, State - PIN',
            supplier_gstin: '29XXXXXXXXXXXXX',
            delivery_terms: 'Ex-Works',
            items: [
                {
                    item_code: 'ITEM001',
                    product_name: 'Sample Product',
                    description: 'Product description',
                    hsn_sac: '8542',
                    quantity: 10,
                    unit_price: 800
                }
            ],
            payment_terms: '30 days after delivery'
        };

        await documentGenerator.generatePDF(poData, 'purchase_order', outputPath);

        res.json({
            success: true,
            message: 'Purchase Order PDF generated successfully',
            file_path: outputPath
        });

    } catch (error) {
        console.error('Error generating purchase order PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating purchase order PDF',
            error: error.message
        });
    }
};

exports.generateEstimationPDF = async (req, res) => {
    try {
        const { estimationId } = req.params;
        const outputPath = path.join(__dirname, '../../documents/estimations', `estimation_${estimationId}.pdf`);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Get estimation data
        const estimationData = {
            estimation_id: `VESPL/ES/2526/${estimationId}`,
            date: new Date(),
            project_name: 'Sample Project',
            description: 'Project description',
            sections: [
                {
                    name: 'Main Panel',
                    items: [
                        {
                            item_code: 'PANEL001',
                            product_name: 'Control Panel',
                            description: 'Main control panel',
                            quantity: 1,
                            unit_price: 50000,
                            discount_percentage: 5
                        }
                    ]
                },
                {
                    name: 'Generator',
                    items: [
                        {
                            item_code: 'GEN001',
                            product_name: 'Generator 10KVA',
                            description: 'Backup generator',
                            quantity: 1,
                            unit_price: 75000,
                            discount_percentage: 3
                        }
                    ]
                }
            ],
            total_mrp: 125000,
            total_final: 115000,
            total_discount: 10000
        };

        await documentGenerator.generatePDF(estimationData, 'estimation', outputPath);

        res.json({
            success: true,
            message: 'Estimation PDF generated successfully',
            file_path: outputPath
        });

    } catch (error) {
        console.error('Error generating estimation PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating estimation PDF',
            error: error.message
        });
    }
};

exports.generateBomPDF = async (req, res) => {
    try {
        const { bomId } = req.params; // This is actually the estimation ID
        const outputPath = path.join(__dirname, '../../documents/boms', `bom_${bomId}.pdf`);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Generate proper BOM document ID
        const { generateDocumentId, DOCUMENT_TYPES } = require('../utils/documentIdGenerator');
        const bomDocumentId = await generateDocumentId(DOCUMENT_TYPES.BILL_OF_MATERIALS);

        // Get database connection
        const db = require('../config/database');

        // Fetch actual estimation data
        const [estimationResult] = await db.execute(`
            SELECT 
                e.*,
                se.project_name,
                c.company_name as client_name,
                cases.case_number
            FROM estimations e
            LEFT JOIN sales_enquiries se ON e.enquiry_id = se.id
            LEFT JOIN clients c ON se.client_id = c.id  
            LEFT JOIN cases ON e.case_id = cases.id
            WHERE e.id = ? AND e.deleted_at IS NULL
        `, [bomId]);

        if (estimationResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estimation not found'
            });
        }

        const estimation = estimationResult[0];

        // Fetch estimation items
        const [itemsResult] = await db.execute(`
            SELECT 
                ei.*,
                p.name as product_name,
                p.part_code as item_code,
                es.heading as section_name,
                ess.subsection_name
            FROM estimation_items ei
            LEFT JOIN products p ON ei.product_id = p.id
            LEFT JOIN estimation_sections es ON ei.section_id = es.id
            LEFT JOIN estimation_subsections ess ON ei.subsection_id = ess.id
            WHERE ei.estimation_id = ?
            ORDER BY es.heading, ess.subsection_name, ei.id
        `, [bomId]);

        // Format materials for BOM
        const materials = itemsResult.map(item => ({
            item_code: item.item_code || `ITEM-${item.id}`,
            product_name: item.product_name || 'Custom Item',
            description: `${item.section_name || 'General'} - ${item.subsection_name || 'Standard'}`.trim(' -'),
            quantity: parseFloat(item.quantity) || 1,
            unit: 'Nos', // Default unit since products table might not have unit info
            section: item.section_name,
            subsection: item.subsection_name,
            mrp: parseFloat(item.mrp) || 0,
            final_price: parseFloat(item.final_price) || 0
        }));

        // Get BOM data with actual estimation information
        const bomData = {
            bom_id: bomDocumentId,
            estimation_id: estimation.estimation_id,
            project_name: estimation.project_name || 'Unknown Project',
            client_name: estimation.client_name || 'Unknown Client',
            case_number: estimation.case_number || 'N/A',
            materials: materials
        };

        await documentGenerator.generatePDF(bomData, 'bom', outputPath);

        // Return the document ID along with file path for proper filename
        res.json({
            success: true,
            message: 'BOM PDF generated successfully',
            file_path: outputPath,
            document_id: bomDocumentId,
            filename: `${bomDocumentId.replace(/\//g, '_')}.pdf`
        });

    } catch (error) {
        console.error('Error generating BOM PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating BOM PDF',
            error: error.message
        });
    }
};

exports.downloadDocument = async (req, res) => {
    try {
        const { category, fileName } = req.params;
        const filePath = path.join(__dirname, '../../documents', category, fileName);

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Set headers for PDF download - this forces download instead of browser viewing
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'no-cache');

        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error downloading file'
                });
            }
        });

    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({
            success: false,
            message: 'Error downloading document',
            error: error.message
        });
    }
};