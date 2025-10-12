const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financial.controller');
const expensesController = require('../controllers/expenses.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const db = require('../config/database');

// Root route for financial module (no auth)
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Financial Management module is active',
        data: {
            module: 'financial',
            version: '1.0.0',
            endpoints: [
                'GET /dashboard/kpis - Financial KPIs',
                'GET /cash-flow - Cash flow analysis',
                'GET /profit-loss - P&L statements',
                'GET /invoices - Invoice management',
                'GET /payments - Payment tracking',
                'GET /expenses - Expense management',
                'GET /reports - Financial reports',
                'GET /customer-outstanding - Outstanding amounts'
            ]
        }
    });
});

// Apply authentication middleware to protected routes
router.use(verifyToken);

// Dashboard routes
router.get('/dashboard/kpis', (req, res) => financialController.getDashboardKPIs(req, res));
router.get('/cash-flow', (req, res) => financialController.getCashFlowData(req, res));
router.get('/profit-loss', (req, res) => financialController.getProfitLossData(req, res));
router.get('/customer-outstanding', (req, res) => financialController.getCustomerOutstanding(req, res));
router.get('/alerts', financialController.getFinancialAlerts);

// Invoice Management Routes
router.get('/invoices', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            customer_id,
            payment_status,
            invoice_status,
            search
        } = req.query;

        // Simple query to start with - get all invoices
        const query = `
            SELECT 
                i.id,
                i.invoice_number,
                i.invoice_date,
                i.due_date,
                i.customer_id,
                c.company_name as customer_name,
                i.subtotal,
                i.tax_amount,
                i.total_amount,
                i.balance_amount,
                CASE 
                    WHEN i.balance_amount = 0 THEN 'paid'
                    WHEN i.balance_amount = i.total_amount THEN 'unpaid'
                    ELSE 'partial'
                END as payment_status,
                i.status,
                i.reference_type,
                COALESCE(i.reference_id, '') as reference_number,
                i.created_at,
                DATEDIFF(NOW(), i.due_date) as days_overdue
            FROM invoices i
            LEFT JOIN clients c ON i.customer_id = c.id
            WHERE i.status != 'deleted'
            ORDER BY i.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}
        `;

        const [invoices] = await db.execute(query);

        // Convert decimal values to numbers
        const processedInvoices = invoices.map(invoice => ({
            ...invoice,
            subtotal: parseFloat(invoice.subtotal) || 0,
            tax_amount: parseFloat(invoice.tax_amount) || 0,
            total_amount: parseFloat(invoice.total_amount) || 0,
            balance_amount: parseFloat(invoice.balance_amount) || 0,
            days_overdue: parseInt(invoice.days_overdue) || 0
        }));

        // Get total count for pagination
        const [countResult] = await db.execute(`
            SELECT COUNT(*) as total
            FROM invoices i
            WHERE i.status != 'deleted'
        `);
        const total = parseInt(countResult[0].total) || 0;

        res.json({
            success: true,
            data: processedInvoices,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching invoices',
            error: error.message
        });
    }
});

// Get single invoice
router.get('/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                i.*,
                c.company_name as customer_name,
                c.billing_address,
                c.shipping_address,
                c.gstin,
                c.contact_person,
                c.phone,
                c.email
            FROM invoices i
            LEFT JOIN clients c ON i.customer_id = c.id
            WHERE i.id = ? AND i.status != 'deleted'
        `;

        const [invoices] = await db.execute(query, [id]);

        if (invoices.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.json({
            success: true,
            data: invoices[0]
        });

    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching invoice',
            error: error.message
        });
    }
});

// Create invoice
router.post('/invoices', async (req, res) => {
    try {
        const {
            customer_id,
            invoice_date,
            due_date,
            reference_type,
            reference_id,
            reference_number,
            items,
            subtotal,
            tax_amount,
            total_amount,
            notes
        } = req.body;

        // Generate invoice number
        const [lastInvoice] = await db.execute(
            "SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1"
        );

        let invoiceNumber;
        if (lastInvoice.length > 0) {
            const lastNumber = parseInt(lastInvoice[0].invoice_number.split('/').pop()) || 0;
            invoiceNumber = `INV/${new Date().getFullYear()}/${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
            invoiceNumber = `INV/${new Date().getFullYear()}/0001`;
        }

        const insertQuery = `
            INSERT INTO invoices (
                invoice_number, invoice_date, due_date, customer_id,
                reference_type, reference_id, reference_number,
                subtotal, tax_amount, total_amount, balance_amount,
                payment_status, status, notes, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'active', ?, ?, NOW())
        `;

        const [result] = await db.execute(insertQuery, [
            invoiceNumber,
            invoice_date,
            due_date,
            customer_id,
            reference_type,
            reference_id,
            reference_number,
            subtotal,
            tax_amount,
            total_amount,
            total_amount, // balance_amount starts as total_amount
            notes,
            req.user.id
        ]);

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: {
                id: result.insertId,
                invoice_number: invoiceNumber
            }
        });

    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating invoice',
            error: error.message
        });
    }
});

// Payment Management Routes
router.get('/payments', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            payment_type,
            party_type,
            payment_method,
            payment_status,
            from_date,
            to_date,
            search
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = "WHERE 1=1";
        const params = [];

        if (payment_type) {
            whereClause += " AND payment_type = ?";
            params.push(payment_type);
        }

        if (party_type) {
            whereClause += " AND party_type = ?";
            params.push(party_type);
        }

        if (payment_method) {
            whereClause += " AND payment_method = ?";
            params.push(payment_method);
        }

        if (payment_status) {
            whereClause += " AND payment_status = ?";
            params.push(payment_status);
        }

        if (from_date) {
            whereClause += " AND payment_date >= ?";
            params.push(from_date);
        }

        if (to_date) {
            whereClause += " AND payment_date <= ?";
            params.push(to_date);
        }

        if (search) {
            whereClause += " AND (payment_number LIKE ? OR party_name LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        const query = `
            SELECT 
                p.id, 
                p.payment_number, 
                p.payment_date, 
                'receipt' as payment_type,
                'customer' as party_type, 
                c.company_name as party_name, 
                p.amount, 
                p.payment_method,
                '' as bank_name, 
                '' as cheque_number, 
                p.reference_number as transaction_reference,
                '' as utr_number, 
                'invoice' as reference_type, 
                p.reference_number,
                p.status as payment_status, 
                '' as notes, 
                p.created_at
            FROM payments p
            LEFT JOIN clients c ON p.customer_id = c.id
            WHERE 1=1
            ORDER BY p.created_at DESC
            LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}
        `;

        const [payments] = await db.execute(query);

        // Get total count for pagination
        const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM payments`);
        const total = countResult[0].total;

        res.json({
            success: true,
            data: payments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payments',
            error: error.message
        });
    }
});

// Record payment
router.post('/payments', async (req, res) => {
    try {
        const {
            payment_type,
            party_type,
            party_id,
            party_name,
            amount,
            payment_method,
            payment_date,
            bank_name,
            cheque_number,
            transaction_reference,
            utr_number,
            reference_type,
            reference_number,
            notes,
            invoice_allocations = []
        } = req.body;

        // Generate payment number
        const [lastPayment] = await db.execute(
            "SELECT payment_number FROM payments ORDER BY created_at DESC LIMIT 1"
        );

        let paymentNumber;
        if (lastPayment.length > 0) {
            const lastNumber = parseInt(lastPayment[0].payment_number.split('/').pop()) || 0;
            const prefix = payment_type === 'receipt' ? 'REC' : 'PAY';
            paymentNumber = `${prefix}/${new Date().getFullYear()}/${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
            const prefix = payment_type === 'receipt' ? 'REC' : 'PAY';
            paymentNumber = `${prefix}/${new Date().getFullYear()}/0001`;
        }

        // Start transaction
        await db.execute('START TRANSACTION');

        try {
            // Insert payment record
            const insertPaymentQuery = `
                INSERT INTO payments (
                    payment_number, payment_date, payment_type, party_type,
                    party_id, party_name, amount, payment_method,
                    bank_name, cheque_number, transaction_reference,
                    utr_number, reference_type, reference_number,
                    payment_status, notes, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cleared', ?, ?, NOW())
            `;

            const [paymentResult] = await db.execute(insertPaymentQuery, [
                paymentNumber,
                payment_date,
                payment_type,
                party_type,
                party_id || null,
                party_name,
                amount,
                payment_method,
                bank_name || null,
                cheque_number || null,
                transaction_reference || null,
                utr_number || null,
                reference_type,
                reference_number || null,
                notes || null,
                req.user.id
            ]);

            // Process invoice allocations for receipts
            if (payment_type === 'receipt' && invoice_allocations.length > 0) {
                for (const allocation of invoice_allocations) {
                    if (allocation.invoice_id && allocation.allocated_amount > 0) {
                        // Update invoice balance
                        await db.execute(`
                            UPDATE invoices 
                            SET balance_amount = balance_amount - ?
                            WHERE id = ?
                        `, [allocation.allocated_amount, allocation.invoice_id]);

                        // Update payment status based on new balance
                        await db.execute(`
                            UPDATE invoices 
                            SET payment_status = CASE 
                                WHEN balance_amount = 0 THEN 'paid'
                                WHEN balance_amount < total_amount THEN 'partial'
                                ELSE 'unpaid'
                            END
                            WHERE id = ?
                        `, [allocation.invoice_id]);
                    }
                }
            }

            await db.execute('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Payment recorded successfully',
                data: {
                    id: paymentResult.insertId,
                    payment_number: paymentNumber
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
            message: 'Error recording payment',
            error: error.message
        });
    }
});

// ========== Expense Management Routes ==========

// Get expense categories
router.get('/expense-categories', expensesController.getCategories);

// Get expense summary/statistics
router.get('/expenses/summary', expensesController.getExpenseSummary);

// Get all expenses with filters and pagination
router.get('/expenses', expensesController.getAllExpenses);

// Get single expense by ID
router.get('/expenses/:id', expensesController.getExpenseById);

// Create new expense
router.post('/expenses', expensesController.createExpense);

// Update expense
router.put('/expenses/:id', expensesController.updateExpense);

// Submit expense for approval
router.post('/expenses/:id/submit', expensesController.submitForApproval);

// Approve/reject expense
router.post('/expenses/:id/approve', expensesController.approveExpense);

// Mark expense as paid
router.post('/expenses/:id/pay', expensesController.markAsPaid);

// Delete expense (soft delete)
router.delete('/expenses/:id', expensesController.deleteExpense);

// ========== End Expense Management Routes ==========

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Financial API is working', user: req.user });
});

module.exports = router;