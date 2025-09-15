const db = require('../config/database');

class FinancialController {
    
    // ================================
    // INVOICE MANAGEMENT
    // ================================
    
    // Create new invoice
    async createInvoice(req, res) {
        try {
            const {
                invoice_type = 'sales',
                customer_id,
                reference_type,
                reference_id,
                reference_number,
                invoice_date = new Date().toISOString().split('T')[0],
                due_date,
                items,
                discount_percentage = 0,
                discount_amount = 0,
                payment_terms = 'Net 30',
                notes,
                terms_conditions
            } = req.body;

            if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID and items are required'
                });
            }

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                // Get customer details
                const [customerData] = await db.execute(
                    'SELECT company_name, address, gstin, phone, email FROM clients WHERE id = ?',
                    [customer_id]
                );

                if (customerData.length === 0) {
                    throw new Error('Customer not found');
                }

                const customer = customerData[0];

                // Generate invoice number
                const [invoiceNumResult] = await db.execute(
                    'SELECT GetNextInvoiceNumber(?) as invoice_number',
                    [invoice_type]
                );
                const invoice_number = invoiceNumResult[0].invoice_number;

                // Calculate due date if not provided
                const calculated_due_date = due_date || this.calculateDueDate(invoice_date, payment_terms);

                // Calculate totals
                let subtotal = 0;
                let total_cgst = 0;
                let total_sgst = 0;
                let total_igst = 0;
                let total_cess = 0;

                // Validate and calculate item totals
                for (const item of items) {
                    const item_total = (item.quantity || 0) * (item.unit_price || 0);
                    const item_discount = item.item_discount_amount || 0;
                    const discounted_amount = item_total - item_discount;
                    
                    subtotal += item_total;
                    total_cgst += item.cgst_amount || 0;
                    total_sgst += item.sgst_amount || 0;
                    total_igst += item.igst_amount || 0;
                    total_cess += item.cess_amount || 0;
                }

                // Apply invoice-level discount
                const invoice_discount = discount_amount || (subtotal * (discount_percentage || 0) / 100);
                const final_subtotal = subtotal - invoice_discount;

                // Create invoice
                const [invoiceResult] = await db.execute(`
                    INSERT INTO invoices (
                        invoice_number, invoice_type, invoice_date, due_date,
                        customer_id, customer_name, customer_address, customer_gstin, customer_phone, customer_email,
                        reference_type, reference_id, reference_number,
                        subtotal, discount_amount, discount_percentage,
                        cgst_amount, sgst_amount, igst_amount, cess_amount,
                        payment_terms, notes, terms_conditions,
                        created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    invoice_number, invoice_type, invoice_date, calculated_due_date,
                    customer_id, customer.company_name, customer.address, customer.gstin, customer.phone, customer.email,
                    reference_type, reference_id, reference_number,
                    final_subtotal, invoice_discount, discount_percentage,
                    total_cgst, total_sgst, total_igst, total_cess,
                    payment_terms, notes, terms_conditions,
                    req.user?.id || 1
                ]);

                const invoice_id = invoiceResult.insertId;

                // Create invoice items
                for (const item of items) {
                    await db.execute(`
                        INSERT INTO invoice_items (
                            invoice_id, product_id, product_name, product_code, description, hsn_code,
                            quantity, unit, unit_price, item_discount_percentage, item_discount_amount,
                            gst_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount, 
                            igst_rate, igst_amount, cess_rate, cess_amount,
                            serial_numbers, batch_allocations
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        invoice_id, item.product_id, item.product_name, item.product_code, 
                        item.description, item.hsn_code,
                        item.quantity, item.unit || 'Nos', item.unit_price,
                        item.item_discount_percentage || 0, item.item_discount_amount || 0,
                        item.gst_rate || 0, item.cgst_rate || 0, item.cgst_amount || 0,
                        item.sgst_rate || 0, item.sgst_amount || 0,
                        item.igst_rate || 0, item.igst_amount || 0,
                        item.cess_rate || 0, item.cess_amount || 0,
                        JSON.stringify(item.serial_numbers || []),
                        JSON.stringify(item.batch_allocations || [])
                    ]);
                }

                await db.execute('COMMIT');

                // Fetch the created invoice with items
                const invoice = await this.getInvoiceWithItems(invoice_id);

                res.status(201).json({
                    success: true,
                    message: 'Invoice created successfully',
                    data: invoice
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Error creating invoice:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create invoice',
                error: error.message
            });
        }
    }

    // Get all invoices with filters
    async getInvoices(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                customer_id,
                invoice_type,
                payment_status,
                status,
                from_date,
                to_date,
                search
            } = req.query;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (customer_id) {
                whereClause += ' AND customer_id = ?';
                params.push(customer_id);
            }

            if (invoice_type) {
                whereClause += ' AND invoice_type = ?';
                params.push(invoice_type);
            }

            if (payment_status) {
                whereClause += ' AND payment_status = ?';
                params.push(payment_status);
            }

            if (status) {
                whereClause += ' AND status = ?';
                params.push(status);
            }

            if (from_date) {
                whereClause += ' AND invoice_date >= ?';
                params.push(from_date);
            }

            if (to_date) {
                whereClause += ' AND invoice_date <= ?';
                params.push(to_date);
            }

            if (search) {
                whereClause += ' AND (invoice_number LIKE ? OR customer_name LIKE ? OR reference_number LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            const offset = (page - 1) * limit;

            // Get invoices
            const [invoices] = await db.execute(`
                SELECT 
                    id, invoice_number, invoice_type, invoice_date, due_date,
                    customer_id, customer_name, customer_gstin,
                    reference_type, reference_id, reference_number,
                    subtotal, discount_amount, total_tax_amount, total_amount,
                    payment_status, paid_amount, balance_amount,
                    status, created_at,
                    DATEDIFF(CURDATE(), due_date) as days_overdue
                FROM invoices 
                ${whereClause}
                ORDER BY invoice_date DESC, id DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            // Get total count
            const [countResult] = await db.execute(`
                SELECT COUNT(*) as total FROM invoices ${whereClause}
            `, params);

            res.json({
                success: true,
                data: invoices,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit)
                }
            });

        } catch (error) {
            console.error('Error fetching invoices:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch invoices',
                error: error.message
            });
        }
    }

    // Get invoice by ID with items
    async getInvoiceById(req, res) {
        try {
            const { id } = req.params;
            const invoice = await this.getInvoiceWithItems(id);

            if (!invoice) {
                return res.status(404).json({
                    success: false,
                    message: 'Invoice not found'
                });
            }

            res.json({
                success: true,
                data: invoice
            });

        } catch (error) {
            console.error('Error fetching invoice:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch invoice',
                error: error.message
            });
        }
    }

    // Update invoice status
    async updateInvoiceStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            const validStatuses = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status'
                });
            }

            await db.execute(`
                UPDATE invoices 
                SET status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [status, req.user?.id || 1, id]);

            res.json({
                success: true,
                message: 'Invoice status updated successfully'
            });

        } catch (error) {
            console.error('Error updating invoice status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update invoice status',
                error: error.message
            });
        }
    }

    // ================================
    // PAYMENT MANAGEMENT
    // ================================

    // Record payment
    async recordPayment(req, res) {
        try {
            const {
                payment_type = 'receipt',
                party_type,
                party_id,
                party_name,
                amount,
                payment_method,
                payment_date = new Date().toISOString().split('T')[0],
                bank_name,
                cheque_number,
                transaction_reference,
                utr_number,
                reference_type,
                reference_id,
                reference_number,
                invoice_allocations = [], // Array of {invoice_id, allocated_amount}
                notes
            } = req.body;

            if (!party_type || !party_name || !amount || !payment_method) {
                return res.status(400).json({
                    success: false,
                    message: 'Required fields missing'
                });
            }

            // Start transaction
            await db.execute('START TRANSACTION');

            try {
                // Generate payment number
                const payment_prefix = payment_type === 'receipt' ? 'VESPL/RCP' : 'VESPL/PAY';
                const year = new Date().getFullYear();
                const month = String(new Date().getMonth() + 1).padStart(2, '0');
                
                const [seqResult] = await db.execute(`
                    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(payment_number, '/', -1) AS UNSIGNED)), 0) + 1 as next_seq
                    FROM payments 
                    WHERE payment_number LIKE ?
                `, [`${payment_prefix}/${year}${month}/%`]);
                
                const payment_number = `${payment_prefix}/${year}${month}/${String(seqResult[0].next_seq).padStart(4, '0')}`;

                // Create payment record
                const [paymentResult] = await db.execute(`
                    INSERT INTO payments (
                        payment_number, payment_date, payment_type,
                        party_type, party_id, party_name, amount, payment_method,
                        bank_name, cheque_number, transaction_reference, utr_number,
                        reference_type, reference_id, reference_number,
                        notes, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    payment_number, payment_date, payment_type,
                    party_type, party_id, party_name, amount, payment_method,
                    bank_name, cheque_number, transaction_reference, utr_number,
                    reference_type, reference_id, reference_number,
                    notes, req.user?.id || 1
                ]);

                const payment_id = paymentResult.insertId;

                // Process invoice allocations if provided
                let total_allocated = 0;
                for (const allocation of invoice_allocations) {
                    await db.execute(`
                        INSERT INTO payment_allocations (
                            payment_id, invoice_id, allocated_amount, allocation_date, created_by
                        ) VALUES (?, ?, ?, ?, ?)
                    `, [
                        payment_id, allocation.invoice_id, allocation.allocated_amount,
                        payment_date, req.user?.id || 1
                    ]);

                    // Update invoice payment status
                    await db.execute('CALL UpdateInvoicePaymentStatus(?)', [allocation.invoice_id]);
                    
                    total_allocated += parseFloat(allocation.allocated_amount);
                }

                // Update customer outstanding if party is customer
                if (party_type === 'customer' && party_id) {
                    await db.execute('CALL UpdateCustomerOutstanding(?)', [party_id]);
                }

                await db.execute('COMMIT');

                res.status(201).json({
                    success: true,
                    message: 'Payment recorded successfully',
                    data: {
                        payment_id,
                        payment_number,
                        allocated_amount: total_allocated
                    }
                });

            } catch (error) {
                await db.execute('ROLLBACK');
                throw error;
            }

        } catch (error) {
            console.error('Error recording payment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to record payment',
                error: error.message
            });
        }
    }

    // Get payments with filters
    async getPayments(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                payment_type,
                party_type,
                party_id,
                payment_method,
                payment_status,
                from_date,
                to_date,
                search
            } = req.query;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (payment_type) {
                whereClause += ' AND payment_type = ?';
                params.push(payment_type);
            }

            if (party_type) {
                whereClause += ' AND party_type = ?';
                params.push(party_type);
            }

            if (party_id) {
                whereClause += ' AND party_id = ?';
                params.push(party_id);
            }

            if (payment_method) {
                whereClause += ' AND payment_method = ?';
                params.push(payment_method);
            }

            if (payment_status) {
                whereClause += ' AND payment_status = ?';
                params.push(payment_status);
            }

            if (from_date) {
                whereClause += ' AND payment_date >= ?';
                params.push(from_date);
            }

            if (to_date) {
                whereClause += ' AND payment_date <= ?';
                params.push(to_date);
            }

            if (search) {
                whereClause += ' AND (payment_number LIKE ? OR party_name LIKE ? OR transaction_reference LIKE ?)';
                const searchTerm = `%${search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            const offset = (page - 1) * limit;

            // Get payments
            const [payments] = await db.execute(`
                SELECT 
                    id, payment_number, payment_date, payment_type,
                    party_type, party_id, party_name, amount, payment_method,
                    bank_name, cheque_number, transaction_reference, utr_number,
                    reference_type, reference_id, reference_number,
                    payment_status, clearance_date, notes, created_at
                FROM payments 
                ${whereClause}
                ORDER BY payment_date DESC, id DESC
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), parseInt(offset)]);

            // Get total count
            const [countResult] = await db.execute(`
                SELECT COUNT(*) as total FROM payments ${whereClause}
            `, params);

            res.json({
                success: true,
                data: payments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    pages: Math.ceil(countResult[0].total / limit)
                }
            });

        } catch (error) {
            console.error('Error fetching payments:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch payments',
                error: error.message
            });
        }
    }

    // ================================
    // FINANCIAL REPORTS
    // ================================

    // Customer outstanding report
    async getCustomerOutstandingReport(req, res) {
        try {
            const { customer_id, risk_category } = req.query;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (customer_id) {
                whereClause += ' AND customer_id = ?';
                params.push(customer_id);
            }

            if (risk_category) {
                whereClause += ' AND risk_category = ?';
                params.push(risk_category);
            }

            const [outstanding] = await db.execute(`
                SELECT * FROM v_customer_outstanding ${whereClause}
                ORDER BY current_outstanding DESC
            `, params);

            res.json({
                success: true,
                data: outstanding
            });

        } catch (error) {
            console.error('Error fetching outstanding report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch outstanding report',
                error: error.message
            });
        }
    }

    // Monthly sales summary
    async getMonthlySalesSummary(req, res) {
        try {
            const { year, month_count = 12 } = req.query;

            let whereClause = '';
            const params = [];

            if (year) {
                whereClause = 'WHERE year = ?';
                params.push(year);
            }

            const [salesSummary] = await db.execute(`
                SELECT * FROM v_monthly_sales_summary 
                ${whereClause}
                ORDER BY year DESC, month DESC
                LIMIT ?
            `, [...params, parseInt(month_count)]);

            res.json({
                success: true,
                data: salesSummary
            });

        } catch (error) {
            console.error('Error fetching sales summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sales summary',
                error: error.message
            });
        }
    }

    // GST summary report
    async getGSTSummary(req, res) {
        try {
            const { year, month, year_month } = req.query;

            let whereClause = '';
            const params = [];

            if (year_month) {
                whereClause = 'WHERE year_month = ?';
                params.push(year_month);
            } else if (year && month) {
                whereClause = 'WHERE year = ? AND month = ?';
                params.push(year, month);
            } else if (year) {
                whereClause = 'WHERE year = ?';
                params.push(year);
            }

            const [gstSummary] = await db.execute(`
                SELECT * FROM v_gst_summary 
                ${whereClause}
                ORDER BY year DESC, month DESC
            `, params);

            res.json({
                success: true,
                data: gstSummary
            });

        } catch (error) {
            console.error('Error fetching GST summary:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch GST summary',
                error: error.message
            });
        }
    }

    // ================================
    // HELPER METHODS
    // ================================

    async getInvoiceWithItems(invoice_id) {
        try {
            // Get invoice details
            const [invoiceData] = await db.execute(`
                SELECT * FROM invoices WHERE id = ?
            `, [invoice_id]);

            if (invoiceData.length === 0) {
                return null;
            }

            const invoice = invoiceData[0];

            // Get invoice items
            const [items] = await db.execute(`
                SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id
            `, [invoice_id]);

            // Parse JSON fields
            items.forEach(item => {
                if (item.serial_numbers) {
                    item.serial_numbers = JSON.parse(item.serial_numbers);
                }
                if (item.batch_allocations) {
                    item.batch_allocations = JSON.parse(item.batch_allocations);
                }
            });

            return {
                ...invoice,
                items
            };

        } catch (error) {
            console.error('Error fetching invoice with items:', error);
            throw error;
        }
    }

    calculateDueDate(invoice_date, payment_terms) {
        const date = new Date(invoice_date);
        
        // Extract days from payment terms (e.g., "Net 30" -> 30 days)
        const daysMatch = payment_terms.match(/(\d+)/);
        const days = daysMatch ? parseInt(daysMatch[1]) : 30;
        
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
}

module.exports = new FinancialController();