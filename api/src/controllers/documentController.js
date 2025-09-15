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
        const { bomId } = req.params;
        const outputPath = path.join(__dirname, '../../documents/boms', `bom_${bomId}.pdf`);

        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Get BOM data
        const bomData = {
            bom_id: `VESPL/BOM/2526/${bomId}`,
            project_name: 'Sample Project',
            materials: [
                {
                    item_code: 'MAT001',
                    product_name: 'Copper Wire',
                    description: '10mm copper wire',
                    quantity: 100,
                    unit: 'Mtrs'
                },
                {
                    item_code: 'MAT002',
                    product_name: 'Control Relay',
                    description: '24V control relay',
                    quantity: 5,
                    unit: 'Nos'
                }
            ]
        };

        await documentGenerator.generatePDF(bomData, 'bom', outputPath);

        res.json({
            success: true,
            message: 'BOM PDF generated successfully',
            file_path: outputPath
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